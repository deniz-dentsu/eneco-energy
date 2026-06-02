import { useEffect, useRef, useState } from 'react';

export function useMotionDetection(audioDeviceId?: string, videoDeviceId?: string) {
  const [motionLevel, setMotionLevel] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [stream, setStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    let active = true;

    async function setupCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: videoDeviceId ? { deviceId: { exact: videoDeviceId }, width: 320, height: 240, frameRate: { ideal: 15 } } : { width: 320, height: 240, frameRate: { ideal: 15 } }, 
            audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true 
        });
        
        if (!active) {
            mediaStream.getTracks().forEach(track => track.stop());
            return;
        }

        setPermissionState('granted');
        setStream(mediaStream);
        
        const video = document.createElement('video');
        video.srcObject = mediaStream;
        video.playsInline = true;
        video.muted = true;
        await video.play();

        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 240;

        videoRef.current = video;
        canvasRef.current = canvas;

        // Set up audio analysis
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Ensure AudioContext is running (browsers suspend it by default without user interaction)
        const resumeAudio = () => {
          if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(console.error);
          }
        };
        window.addEventListener('click', resumeAudio, { once: true });
        window.addEventListener('touchstart', resumeAudio, { once: true });
        resumeAudio();
        
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        const source = audioCtx.createMediaStreamSource(mediaStream);
        source.connect(analyser);
        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;

        setCameraActive(true);

        detectMotionAndSound();
      } catch (err: any) {
        if (err.name === 'NotAllowedError') {
          setPermissionState('denied');
        }
        setError(err.message || "Failed to access camera and microphone");
      }
    }

    function detectMotionAndSound() {
      if (!active) return;

      // Handle Video (Motion)
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          if (prevFrameRef.current) {
            let diffPixels = 0;
            // Less sensitive color diff threshold for crowds (was 45, now 60)
            const pixelThreshold = 60; 
            const prevData = prevFrameRef.current;

            // Process every 4th pixel horizontally and vertically (skip by 16 * 4) to save CPU and reduce micro-noise
            let totalChecked = 0;
            for (let y = 0; y < canvas.height; y += 4) {
              for (let x = 0; x < canvas.width; x += 4) {
                const i = (y * canvas.width + x) * 4;
                const rDiff = Math.abs(data[i] - prevData[i]);
                const gDiff = Math.abs(data[i + 1] - prevData[i + 1]);
                const bDiff = Math.abs(data[i + 2] - prevData[i + 2]);

                if (rDiff > pixelThreshold || gDiff > pixelThreshold || bDiff > pixelThreshold) {
                  diffPixels++;
                }
                totalChecked++;
              }
            }

            const percentage = (diffPixels / totalChecked) * 100;
            
            setMotionLevel(prev => {
                // Crowd intensity typically causes up to 20-40% of blocks to change if they are active/jumping.
                // We scale it so 30% diff gives us near 100 motion level.
                const rawScale = percentage * 3.33; 
                const normalized = Math.min(100, Math.max(0, rawScale)); 
                // Smooth out reading
                return prev * 0.8 + normalized * 0.2;
            });
          }
          
          prevFrameRef.current = new Uint8ClampedArray(data);
        }
      }

      // Handle Audio (Sound)
      if (analyserRef.current) {
        const analyser = analyserRef.current;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        // Using time domain data to calculate RMS is much more reliable for volume
        analyser.getByteTimeDomainData(dataArray);

        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const normalized = (dataArray[i] - 128) / 128.0;
          sumSquares += normalized * normalized;
        }
        
        const rms = Math.sqrt(sumSquares / dataArray.length);
        
        // Ensure rms is at least a very small non-zero number to avoid log10(0)
        const safeRms = Math.max(rms, 0.0001);
        
        // Calculate a very sensitive Room dB for testing
        // rms usually ranges from 0.000... to 0.5
        let roomDb = (rms * 1500); // 0.01 -> 15, 0.05 -> 75, 0.1 -> 150
        
        // Smooth out the room dB reading
        setAudioLevel(prev => {
          let target = Math.max(0, Math.min(120, roomDb));
          
          if (target < 2) target = 0; // much lower noise floor threshold
          
          // Slower attack and very slow release for smoother reactivity
          return prev * (target > prev ? 0.7 : 0.95) + target * (target > prev ? 0.3 : 0.05);
        });
      }

      // Run somewhat throttled to save CPU
      setTimeout(() => {
        if (active) {
          animationFrameId.current = requestAnimationFrame(detectMotionAndSound);
        }
      }, 50);
    }

    setupCamera();

    return () => {
      active = false;
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(console.error);
      if (stream) {
         stream.getTracks().forEach(track => track.stop());
      } else if (videoRef.current && videoRef.current.srcObject) {
         const mStream = videoRef.current.srcObject as MediaStream;
         mStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [audioDeviceId, videoDeviceId]);

  return { motionLevel, audioLevel, cameraActive, error, permissionState, stream };
}

