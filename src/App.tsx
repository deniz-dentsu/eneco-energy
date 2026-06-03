import { useEffect, useState, useRef } from 'react';
import { useMotionDetection } from './hooks/useMotionDetection';
import { Battery } from './components/Battery';
import { CameraOff, Camera, Sparkles, Activity, Mic, Settings as SettingsIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SoundParticles } from './components/SoundParticles';
import { SurgeSparks } from './components/SurgeSparks';

export default function App() {
  const [audioDeviceId, setAudioDeviceId] = useState<string | undefined>();
  const [videoDeviceId, setVideoDeviceId] = useState<string | undefined>();
  const [showSettings, setShowSettings] = useState(false);
  const [showCameraPanel, setShowCameraPanel] = useState(true);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  
  const { motionLevel, audioLevel, cameraActive, error, permissionState, stream } = useMotionDetection(audioDeviceId, videoDeviceId);
  const [batteryLevel, setBatteryLevel] = useState(0); // Start at 0%
  const [isSurging, setIsSurging] = useState(false);
  const isSurgingRef = useRef(false);
  const uiVideoRef = useRef<HTMLVideoElement>(null);
  const lastSurgeTimeRef = useRef(0);

  useEffect(() => {
    isSurgingRef.current = isSurging;
  }, [isSurging]);

  // Fetch available devices
  useEffect(() => {
    async function fetchDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setDevices(devices);
      } catch (err) {
        console.error('Error fetching devices', err);
      }
    }
    fetchDevices();
    // Re-fetch when permissions change or devices change
    navigator.mediaDevices.addEventListener('devicechange', fetchDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', fetchDevices);
  }, [permissionState]);

  // Trigger surge mode when maxed out
  useEffect(() => {
    const now = performance.now();
    const isCooldown = now - lastSurgeTimeRef.current < 6000; // 6 sec cooldown between surges

    if (!isCooldown) {
      if (batteryLevel >= 100 && !isSurging) {
        lastSurgeTimeRef.current = now;
        setIsSurging(true);
        setTimeout(() => {
          setIsSurging(false);
          isSurgingRef.current = false; // Synchronously update ref to prevent tick race condition
          setBatteryLevel(0);
        }, 4000); // 4 second surge duration
      }
    }
  }, [batteryLevel, isSurging]);

  // Hook stream to UI video for corner feed
  useEffect(() => {
    if (uiVideoRef.current && stream) {
      uiVideoRef.current.srcObject = stream;
    }
  }, [stream, showCameraPanel]);

  const audioLevelRef = useRef(audioLevel);
  const motionLevelRef = useRef(motionLevel);
  
  useEffect(() => {
    audioLevelRef.current = audioLevel;
    motionLevelRef.current = motionLevel;
  }, [audioLevel, motionLevel]);

  // Compute battery changes over time based on motion and audio
  useEffect(() => {
    let lastTime = performance.now();
    let animationFrameId: number;

    const tick = (time: number) => {
      const delta = (time - lastTime) / 1000; // seconds
      lastTime = time;

      const currentMotionLevel = motionLevelRef.current;
      const currentAudioLevel = audioLevelRef.current;

      setBatteryLevel(prev => {
        if (isSurgingRef.current) {
            // Keep at 100 during surge
            return 100;
        }
        
        // Base drain: lose 5% per second (faster drop)
        let drain = 5 * delta;
        
        let gain = 0;
        
        // Requires more movement and audio to build up charge effectively
        if (currentMotionLevel > 10 || currentAudioLevel > 10) {
            let baseMotionGain = currentMotionLevel * 0.04;
            let baseAudioGain = currentAudioLevel * 0.04;
            // Synergy: rewarded for the lower of the two (encourages balance & crowd activity)
            let synergyBonus = Math.min(currentMotionLevel, currentAudioLevel) * 0.12;
            
            gain = (baseMotionGain + baseAudioGain + synergyBonus) * delta;
        } else {
            // Little activity barely moves the needle against the fast drain
            let motionGain = currentMotionLevel * 0.01;
            let audioGain = currentAudioLevel * 0.01;
            gain = (motionGain + audioGain) * delta;
        }

        return Math.min(100, Math.max(0, prev - drain + gain));
      });

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans overflow-hidden relative">
      {/* Background Mesh Gradients */}
      <div className="absolute -top-[100px] -left-[100px] w-[600px] h-[600px] bg-[#E3003F] opacity-10 rounded-full blur-[120px]"></div>
      <div className="absolute -bottom-[100px] -right-[100px] w-[600px] h-[600px] bg-[#FF7000] opacity-10 rounded-full blur-[120px]"></div>

      {/* Header Navigation */}
      <header className="h-20 w-full flex items-center justify-between px-6 lg:px-12 z-10 shrink-0">
        <div className="flex items-center gap-3">
          {/* Custom Eneco Bubbles Logo */}
          <div className="flex items-center h-10 w-10 relative mr-1">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
              <defs>
                <radialGradient id="enecoRed" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#ff5a60" />
                  <stop offset="100%" stopColor="#d2002e" />
                </radialGradient>
                <radialGradient id="enecoOrange" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#ffb95e" />
                  <stop offset="100%" stopColor="#e85b00" />
                </radialGradient>
              </defs>
              {/* Eneco Bubbles Layout */}
              {/* Top-left small orange */}
              <circle cx="35" cy="30" r="11" fill="url(#enecoOrange)" />
              {/* Top tiny red */}
              <circle cx="55" cy="12" r="6" fill="url(#enecoRed)" />
              {/* Middle-right medium light orange */}
              <circle cx="68" cy="48" r="15" fill="url(#enecoOrange)" />
              {/* Bottom tiny red */}
              <circle cx="62" cy="85" r="8" fill="url(#enecoRed)" />
              {/* Large bottom-left red */}
              <circle cx="38" cy="62" r="22" fill="url(#enecoRed)" />
            </svg>
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">Eneco <span className="font-light">Energiser</span></span>
        </div>
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setShowCameraPanel(!showCameraPanel)}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 transition-colors shadow-sm"
            aria-label="Toggle Camera Panel"
          >
            {showCameraPanel ? <CameraOff className="w-5 h-5 text-gray-300" /> : <Camera className="w-5 h-5 text-gray-300" />}
          </button>
          <button 
            onClick={() => setShowSettings(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 transition-colors shadow-sm"
            aria-label="Settings"
          >
            <SettingsIcon className="w-5 h-5 text-gray-300" />
          </button>
          <div className="px-4 py-1.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-full flex items-center gap-2">
            {cameraActive ? (
                <div className="w-2 h-2 bg-[#FF7000] rounded-full animate-pulse"></div>
            ) : (
                <CameraOff className="w-3 h-3 text-red-500" />
            )}
            <span className="text-xs font-semibold text-gray-300 uppercase tracking-widest hidden sm:block">
              {permissionState === 'denied' ? 'Camera Denied' : 'Live Event Feed'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Interactive Area */}
      <motion.section layout className={`flex-1 flex flex-col ${showCameraPanel ? 'lg:flex-row' : ''} px-6 lg:px-12 pb-12 gap-8 lg:gap-16 z-10 w-full max-w-screen-2xl 2xl:max-w-[1800px] mx-auto min-h-0 relative`}>
        {/* Left Section: Large Battery Visual */}
        <motion.div layout className={`w-full flex flex-col items-center justify-center bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[48px] shadow-2xl relative overflow-hidden py-12 lg:py-0 ${showCameraPanel ? 'flex-[2.5] shrink-0 lg:shrink' : 'flex-1'}`}>
          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05),transparent)]"></div>
          
          <SoundParticles intensity={audioLevel} isFilling={motionLevel > 5 && audioLevel > 5} />
          <SurgeSparks active={isSurging} />
          
          <Battery level={batteryLevel} audioLevel={audioLevel} motionLevel={motionLevel} isSurging={isSurging} />

          <div className="mt-8 flex flex-col items-center z-10">
            <h2 className="text-xl font-semibold text-white">Space Energy Level</h2>
            <p className="text-sm text-gray-400 mt-1 uppercase tracking-widest font-medium">
               {isSurging ? 'OVERCHARGE ACTIVE' : ((motionLevel > 20 || audioLevel > 20) ? 'High Collective Activity' : 'Awaiting Activity')}
            </p>
          </div>
        </motion.div>

        {/* Right Section: Stats & Camera Interface */}
        <motion.div layout className={`flex flex-col w-full gap-6 shrink-0 lg:shrink ${showCameraPanel ? 'flex-1 max-w-[500px] 2xl:max-w-[600px]' : 'max-w-2xl mx-auto'}`}>
          {/* Camera Feed Mockup / Output */}
          <AnimatePresence>
            {showCameraPanel && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full bg-gray-900 rounded-[32px] aspect-video relative overflow-hidden shadow-xl flex items-center justify-center shrink-0"
              >
                
                {/* Live Camera Feed */}
                <video 
                    ref={uiVideoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-luminosity z-0" 
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10 pointer-events-none"></div>
                
                {/* Movement Trace Lines SVG overlays */}
                <div className="absolute inset-0 opacity-60 z-10 pointer-events-none">
                  <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <motion.circle cx="30" cy="40" r="8" fill="#E3003F" filter="blur(8px)" animate={{ cx: [30, 40, 20, 30], cy: [40, 30, 50, 40] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} />
                    <motion.circle cx="70" cy="60" r="12" fill="#FF7000" filter="blur(10px)" animate={{ cx: [70, 50, 80, 70], cy: [60, 70, 50, 60] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} />
                    <motion.circle cx="50" cy="20" r="6" fill="white" filter="blur(5px)" animate={{ cx: [50, 60, 40, 50], cy: [20, 30, 10, 20] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} />
                  </svg>
                </div>
    
                <div className="absolute bottom-6 left-6 flex items-center gap-3 z-20">
                  <div className="w-10 h-10 rounded-full border-2 border-[#E3003F] flex items-center justify-center bg-[#E3003F]/50 backdrop-blur-md">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  </div>
                  <span className="text-white font-medium text-sm tracking-wide uppercase shadow-black drop-shadow-md">
                    {cameraActive ? 'Motion Tracking Active' : 'Waiting for Camera...'}
                  </span>
                </div>
                
                {cameraActive && (
                    <div className="absolute top-6 right-6 z-20">
                        <span className="px-2 py-1 bg-red-500 text-[10px] font-bold text-white rounded animate-pulse shadow-md shadow-red-500/20">LIVE REC</span>
                    </div>
                )}
                {error && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 px-8 text-center text-red-500 font-medium text-sm">
                        {error}
                    </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Metrics Grid */}
          <motion.div layout className={`grid grid-cols-2 ${showCameraPanel ? 'gap-4' : 'gap-4 md:gap-8'} shrink-0`}>
            <motion.div layout className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-[24px] flex flex-col justify-between shadow-sm overflow-hidden ${showCameraPanel ? 'h-40 p-5' : 'h-24 p-5 md:p-6'}`}>
              <span className="text-[10px] font-bold text-[#E3003F] uppercase tracking-widest flex items-center gap-1">
                <Activity className="w-3 h-3" /> Active Motion
              </span>
              <div className={`flex ${showCameraPanel ? 'flex-col gap-1' : 'flex-row items-end justify-between items-center'} mt-auto`}>
                <div className={`font-bold text-white ${showCameraPanel ? 'text-3xl' : 'text-2xl'}`}>
                  {Math.round(motionLevel)}<span className="text-base font-medium opacity-50 ml-1">/ 100</span>
                </div>
                <div className={`text-xs font-medium ${motionLevel > 10 ? 'text-orange-400' : 'text-gray-400'} ${showCameraPanel ? '' : 'mb-1 truncate ml-2'}`}>
                    {motionLevel > 10 ? (showCameraPanel ? 'Detecting movement' : 'Detecting') : 'Standby'}
                </div>
              </div>
            </motion.div>
            <motion.div layout className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-[24px] flex flex-col justify-between shadow-sm overflow-hidden ${showCameraPanel ? 'h-40 p-5' : 'h-24 p-5 md:p-6'}`}>
              <span className="text-[10px] font-bold text-[#FF7000] uppercase tracking-widest flex items-center gap-1">
                 <Mic className="w-3 h-3" /> Room dB
              </span>
              <div className={`flex ${showCameraPanel ? 'flex-col gap-1' : 'flex-row items-end justify-between items-center'} mt-auto`}>
                <div className={`font-bold text-white ${showCameraPanel ? 'text-3xl' : 'text-2xl'}`}>
                    {Math.round(audioLevel)}<span className="text-base font-medium opacity-50 ml-1">dB</span>
                </div>
                <div className={`text-xs font-medium ${audioLevel > 15 ? 'text-[#FF7000]' : 'text-gray-400'} ${showCameraPanel ? '' : 'mb-1 truncate ml-2'}`}>
                    {audioLevel > 15 ? (showCameraPanel ? 'Active Audience' : 'Active') : 'Quiet'}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.section>
      
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowSettings(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h3 className="text-xl font-bold bg-gradient-to-r from-[#E3003F] to-[#FF7000] bg-clip-text text-transparent">
                  Device Settings
                </h3>
                <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Mic className="w-4 h-4 text-[#E3003F]" /> Microphone
                  </label>
                  <select 
                    value={audioDeviceId || ''} 
                    onChange={(e) => setAudioDeviceId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-[#E3003F] focus:border-[#E3003F] block p-3 transition-colors"
                  >
                    {!audioDeviceId && <option value="">Default (System Chosen)</option>}
                    {devices.filter(d => d.kind === 'audioinput').map(device => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microphone (${device.deviceId.slice(0, 5)}...)`}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <CameraOff className="w-4 h-4 text-[#FF7000]" /> Camera
                  </label>
                  <select 
                    value={videoDeviceId || ''} 
                    onChange={(e) => setVideoDeviceId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-[#FF7000] focus:border-[#FF7000] block p-3 transition-colors"
                  >
                     {!videoDeviceId && <option value="">Default (System Chosen)</option>}
                    {devices.filter(d => d.kind === 'videoinput').map(device => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera (${device.deviceId.slice(0, 5)}...)`}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="pt-2">
                  <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    If you don't see your device or the names are blank, you may need to grant permissions first. Note: macOS Safari might prioritize Continuity Camera unless explicitly overridden.
                  </p>
                </div>
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="px-6 py-2 bg-gray-900 text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-colors shadow-sm"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
