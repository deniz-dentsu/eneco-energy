import { useEffect, useState, useRef } from 'react';
import { useMotionDetection } from './hooks/useMotionDetection';
import { Battery } from './components/Battery';
import { CameraOff, Camera, Mic, Settings as SettingsIcon, Activity, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SoundParticles } from './components/SoundParticles';
import { SurgeSparks } from './components/SurgeSparks';
import { FigmaCanvas, FigmaBox } from './components/FigmaCanvas';
import { GaugeChart } from './components/GaugeChart';

import imgActiveMotion from './images/Active motion.png';
import imgRoomDB from './images/Room DB.png';
import imgSpaceEnergyLevel from './images/Space energy level.png';
import imgLogo from './images/logo.png';

export default function App() {
  const [audioDeviceId, setAudioDeviceId] = useState<string | undefined>();
  const [videoDeviceId, setVideoDeviceId] = useState<string | undefined>();
  const [showSettings, setShowSettings] = useState(false);
  const [showCameraPanel, setShowCameraPanel] = useState(true);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  const { motionLevel, audioLevel, cameraActive, error, permissionState, stream } = useMotionDetection(audioDeviceId, videoDeviceId);
  const [batteryLevel, setBatteryLevel] = useState(0);
  // let [batteryLevel, setBatteryLevel] = useState(0); // test
  // batteryLevel = 100; // test
  const [isSurging, setIsSurging] = useState(false);
  const isSurgingRef = useRef(false);
  const uiVideoRef = useRef<HTMLVideoElement>(null);
  const lastSurgeTimeRef = useRef(0);

  useEffect(() => { isSurgingRef.current = isSurging; }, [isSurging]);

  useEffect(() => {
    async function fetchDevices() {
      try {
        const d = await navigator.mediaDevices.enumerateDevices();
        setDevices(d);
      } catch (err) {
        console.error('Error fetching devices', err);
      }
    }
    fetchDevices();
    navigator.mediaDevices.addEventListener('devicechange', fetchDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', fetchDevices);
  }, [permissionState]);

  useEffect(() => {
    const now = performance.now();
    if (now - lastSurgeTimeRef.current < 6000) return;
    if (batteryLevel >= 100 && !isSurging) {
      lastSurgeTimeRef.current = now;
      setIsSurging(true);
      setTimeout(() => {
        setIsSurging(false);
        isSurgingRef.current = false;
        setBatteryLevel(0);
      }, 4000);
    }
  }, [batteryLevel, isSurging]);

  useEffect(() => {
    if (uiVideoRef.current && stream) uiVideoRef.current.srcObject = stream;
  }, [stream, showCameraPanel]);

  const audioLevelRef = useRef(audioLevel);
  const motionLevelRef = useRef(motionLevel);
  useEffect(() => {
    audioLevelRef.current = audioLevel;
    motionLevelRef.current = motionLevel;
  }, [audioLevel, motionLevel]);

  useEffect(() => {
    let lastTime = performance.now();
    let rafId: number;
    const tick = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;
      const cm = motionLevelRef.current;
      const ca = audioLevelRef.current;
      setBatteryLevel(prev => {
        if (isSurgingRef.current) return 100;
        let drain = 5 * delta;
        let gain = 0;
        if (cm > 10 || ca > 10) {
          gain = (cm * 0.04 + ca * 0.04 + Math.min(cm, ca) * 0.12) * delta;
        } else {
          gain = (cm * 0.01 + ca * 0.01) * delta;
        }
        return Math.min(100, Math.max(0, prev - drain + gain));
      });
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <>
      <FigmaCanvas className="bg-gray-950" 
        // debugFill="rgba(255,0,0,0.5)"
      >

        {/* ── Background gradients ── */}
        {/* <FigmaBox x={-100} y={-100} w={700} h={700} style={{ borderRadius: '50%', background: '#E3003F', opacity: 0.12, filter: 'blur(120px)', pointerEvents: 'none' }} />
        <FigmaBox x={1320} y={480} w={700} h={700} style={{ borderRadius: '50%', background: '#FF7000', opacity: 0.12, filter: 'blur(120px)', pointerEvents: 'none' }} /> */}
        <FigmaBox x={0} y={0} w={1920} h={1080} style={{background: 'linear-gradient(to right, #E5384C, #EA714F)'}}></FigmaBox>

        {/* ── SoundParticles / SurgeSparks (full canvas layer) ── */}
        <FigmaBox x={0} y={0} w={1920} h={1080}>
          <SoundParticles intensity={audioLevel} isFilling={motionLevel > 5 && audioLevel > 5} />
          <SurgeSparks active={isSurging} />
        </FigmaBox>

        {/* ── Battery: FigmaCanvas直下に置き、座標系を統一 ── */}
        <Battery level={batteryLevel} audioLevel={audioLevel} motionLevel={motionLevel} isSurging={isSurging} />

        <FigmaBox x={637} y={783} w={611} h={49}>
          <img src={imgSpaceEnergyLevel} style={{width: '100%', height: '100%'}} />
        </FigmaBox>

        {/* ── Header: Logo (x:44 y:36) ── */}
        <FigmaBox x={60} y={52} w={352} h={105} style={{ display: 'flex', alignItems: 'center', gap: 12, zIndex: 20 }}
          // debugFill='yellow'
        >
          <img src={imgLogo} style={{width: '100%', height: '100%'}} />
        </FigmaBox>

        {/* ── Header: Controls (x:1756 y:36) ── */}
        <FigmaBox x={1676} y={36} w={200} h={64} style={{ display: 'flex', alignItems: 'center', gap: 16, zIndex: 20 }}>
          {/* Live indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999 }}>
            {cameraActive
              ? <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF7000', animation: 'pulse 2s infinite' }} />
              : <CameraOff style={{ width: 12, height: 12, color: '#ef4444' }} />}
          </div>
          <button
            onClick={() => setShowCameraPanel(!showCameraPanel)}
            style={{ width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
            aria-label="Toggle Camera"
          >
            {showCameraPanel ? <CameraOff style={{ width: 20, height: 20, color: '#d1d5db' }} /> : <Camera style={{ width: 20, height: 20, color: '#d1d5db' }} />}
          </button>
          <button
            onClick={() => setShowSettings(true)}
            style={{ width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
            aria-label="Settings"
          >
            <SettingsIcon style={{ width: 20, height: 20, color: '#d1d5db' }} />
          </button>
        </FigmaBox>

        {/* ── Camera Preview: top-right (x:1480 y:120) ── */}
        <AnimatePresence>
          {showCameraPanel && (
            <FigmaBox x={1480} y={120} w={400} h={225} style={{ zIndex: 20 }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                style={{ width: '100%', height: '100%', borderRadius: 20, overflow: 'hidden', background: '#111', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 48px rgba(0,0,0,0.5)', position: 'relative' }}
              >
                <video ref={uiVideoRef} autoPlay playsInline muted style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6, mixBlendMode: 'luminosity' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.15), transparent)', pointerEvents: 'none' }} />

                {/* Animated blobs */}
                <div style={{ position: 'absolute', inset: 0, opacity: 0.6, pointerEvents: 'none' }}>
                  <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <motion.circle cx="30" cy="40" r="8" fill="#E3003F" filter="blur(8px)" animate={{ cx: [30, 40, 20, 30], cy: [40, 30, 50, 40] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} />
                    <motion.circle cx="70" cy="60" r="12" fill="#FF7000" filter="blur(10px)" animate={{ cx: [70, 50, 80, 70], cy: [60, 70, 50, 60] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} />
                    <motion.circle cx="50" cy="20" r="6" fill="white" filter="blur(5px)" animate={{ cx: [50, 60, 40, 50], cy: [20, 30, 10, 20] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} />
                  </svg>
                </div>

                <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', alignItems: 'center', gap: 8, zIndex: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', border: '1.5px solid #E3003F', background: 'rgba(227,0,63,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', animation: 'pulse 2s infinite' }} />
                  </div>
                  <span style={{ color: '#fff', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                    {cameraActive ? 'Motion Tracking' : 'Waiting...'}
                  </span>
                </div>

                {cameraActive && (
                  <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }}>
                    <span style={{ padding: '2px 8px', background: '#ef4444', fontSize: 10, fontWeight: 700, color: '#fff', borderRadius: 4, animation: 'pulse 2s infinite' }}>LIVE REC</span>
                  </div>
                )}
                {error && (
                  <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', color: '#ef4444', fontSize: 12, fontWeight: 500, textAlign: 'center', padding: 16 }}>
                    {error}
                  </div>
                )}
              </motion.div>
            </FigmaBox>
          )}
        </AnimatePresence>

        {/* ── Active Motion gauge (x:80 y:730) ── */}
        <FigmaBox x={445} y={832} w={364} h={364} style={{ zIndex: 20 }}
        // debugFill='yellow'
        >
          <GaugeChart value={motionLevel} />
        </FigmaBox>

        <FigmaBox x={100} y={835} w={427} h={49} style={{ zIndex: 21 }}>
          <img src={imgActiveMotion} style={{ width: '100%', height: '100%' }} />
        </FigmaBox>

        {/* ── Room dB gauge (x:1490 y:730) ── */}
        <FigmaBox x={1066} y={832} w={364} h={364} style={{ zIndex: 20 }}>
          <GaugeChart value={audioLevel} />
        </FigmaBox>

        <FigmaBox x={1452} y={848} w={238} h={49} style={{ zIndex: 21 }}>
          <img src={imgRoomDB} style={{ width: '100%', height: '100%' }} />
        </FigmaBox>

      </FigmaCanvas>

      {/* ── Settings Modal (outside canvas, uses viewport coords) ── */}
      <AnimatePresence>
        {showSettings && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
              onClick={() => setShowSettings(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              style={{ position: 'relative', background: '#fff', width: '100%', maxWidth: 448, borderRadius: 24, overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.3)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px', borderBottom: '1px solid #f3f4f6' }}>
                <h3 style={{ fontSize: 20, fontWeight: 700, background: 'linear-gradient(to right, #E3003F, #FF7000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
                  Device Settings
                </h3>
                <button onClick={() => setShowSettings(false)} style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X style={{ width: 20, height: 20 }} />
                </button>
              </div>
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <label style={{ fontSize: 14, fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Mic style={{ width: 16, height: 16, color: '#E3003F' }} /> Microphone
                  </label>
                  <select
                    value={audioDeviceId || ''}
                    onChange={(e) => setAudioDeviceId(e.target.value)}
                    style={{ width: '100%', background: '#f9fafb', border: '1px solid #e5e7eb', color: '#1f2937', fontSize: 14, borderRadius: 12, padding: '12px' }}
                  >
                    {!audioDeviceId && <option value="">Default (System Chosen)</option>}
                    {devices.filter(d => d.kind === 'audioinput').map(device => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microphone (${device.deviceId.slice(0, 5)}...)`}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <label style={{ fontSize: 14, fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CameraOff style={{ width: 16, height: 16, color: '#FF7000' }} /> Camera
                  </label>
                  <select
                    value={videoDeviceId || ''}
                    onChange={(e) => setVideoDeviceId(e.target.value)}
                    style={{ width: '100%', background: '#f9fafb', border: '1px solid #e5e7eb', color: '#1f2937', fontSize: 14, borderRadius: 12, padding: '12px' }}
                  >
                    {!videoDeviceId && <option value="">Default (System Chosen)</option>}
                    {devices.filter(d => d.kind === 'videoinput').map(device => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera (${device.deviceId.slice(0, 5)}...)`}
                      </option>
                    ))}
                  </select>
                </div>
                <p style={{ fontSize: 12, color: '#6b7280', background: '#f9fafb', padding: 12, borderRadius: 8, border: '1px solid #f3f4f6', margin: 0 }}>
                  If you don't see your device or the names are blank, you may need to grant permissions first.
                </p>
              </div>
              <div style={{ padding: '16px 24px', background: '#f9fafb', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowSettings(false)}
                  style={{ padding: '8px 24px', background: '#111827', color: '#fff', fontSize: 14, fontWeight: 600, borderRadius: 999, border: 'none', cursor: 'pointer' }}
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
