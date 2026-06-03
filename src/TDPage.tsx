import { useEffect, useState, useRef } from 'react';
import { Battery } from './components/Battery';
import { SoundParticles } from './components/SoundParticles';
import { SurgeSparks } from './components/SurgeSparks';
import { Activity, Mic, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// TouchDesigner から受信するデータの型
interface TDState {
  batteryLevel: number;   // 0〜100
  isSurging: boolean;
  motionLevel: number;    // 0〜100
  audioLevel: number;     // 0〜100
}

const DEFAULT_WS_HOST = 'localhost';
const DEFAULT_WS_PORT = '9980';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export default function TDPage() {
  const [state, setState] = useState<TDState>({
    batteryLevel: 0,
    isSurging: false,
    motionLevel: 0,
    audioLevel: 0,
  });

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [wsHost, setWsHost] = useState(DEFAULT_WS_HOST);
  const [wsPort, setWsPort] = useState(DEFAULT_WS_PORT);
  const [showSettings, setShowSettings] = useState(false);
  const [draftHost, setDraftHost] = useState(DEFAULT_WS_HOST);
  const [draftPort, setDraftPort] = useState(DEFAULT_WS_PORT);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  const connect = (host: string, port: string) => {
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }
    setStatus('connecting');
    const ws = new WebSocket(`ws://${host}:${port}`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (unmountedRef.current) return;
      setStatus('connected');
    };

    ws.onmessage = (event) => {
      if (unmountedRef.current) return;
      try {
        // PythonのTrue/FalseをJSON準拠のtrue/falseに変換
        const sanitized = event.data
          .replace(/\bTrue\b/g, 'true')
          .replace(/\bFalse\b/g, 'false')
          .replace(/'/g, '"');
        const data = JSON.parse(sanitized) as Partial<TDState>;
        // console.log('[TD] received:', data);
        setState(prev => ({
          batteryLevel: data.batteryLevel  ?? prev.batteryLevel,
          isSurging:    data.isSurging     ?? prev.isSurging,
          motionLevel:  data.motionLevel   ?? prev.motionLevel,
          audioLevel:   data.audioLevel    ?? prev.audioLevel,
        }));
      } catch (e) {
        console.warn('[TD] JSON parse error:', e, event.data);
      }
    };

    ws.onerror = () => {
      if (unmountedRef.current) return;
      setStatus('error');
    };

    ws.onclose = () => {
      if (unmountedRef.current) return;
      setStatus('disconnected');
      // 3秒後に自動再接続
      reconnectTimer.current = setTimeout(() => {
        if (!unmountedRef.current) connect(host, port);
      }, 3000);
    };
  };

  useEffect(() => {
    unmountedRef.current = false;
    connect(wsHost, wsPort);
    return () => {
      unmountedRef.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsHost, wsPort]);

  const handleApplySettings = () => {
    setWsHost(draftHost);
    setWsPort(draftPort);
    setShowSettings(false);
  };

  const { batteryLevel, isSurging, motionLevel, audioLevel } = state;

  const statusColor: Record<ConnectionStatus, string> = {
    connected:    'bg-[#A4D233]',
    connecting:   'bg-yellow-400',
    disconnected: 'bg-gray-500',
    error:        'bg-red-500',
  };
  const statusLabel: Record<ConnectionStatus, string> = {
    connected:    'Connected',
    connecting:   'Connecting...',
    disconnected: 'Disconnected',
    error:        'Error',
  };

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans overflow-hidden relative">
      {/* Background gradients */}
      <div className="absolute -top-[100px] -left-[100px] w-[600px] h-[600px] bg-[#E3003F] opacity-10 rounded-full blur-[120px]" />
      <div className="absolute -bottom-[100px] -right-[100px] w-[600px] h-[600px] bg-[#FF7000] opacity-10 rounded-full blur-[120px]" />

      {/* Header */}
      <header className="h-20 w-full flex items-center justify-between px-6 lg:px-12 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center h-10 w-10 relative mr-1">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
              <defs>
                <radialGradient id="enecoRed2" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#ff5a60" />
                  <stop offset="100%" stopColor="#d2002e" />
                </radialGradient>
                <radialGradient id="enecoOrange2" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#ffb95e" />
                  <stop offset="100%" stopColor="#e85b00" />
                </radialGradient>
              </defs>
              <circle cx="35" cy="30" r="11" fill="url(#enecoOrange2)" />
              <circle cx="55" cy="12" r="6"  fill="url(#enecoRed2)" />
              <circle cx="68" cy="48" r="15" fill="url(#enecoOrange2)" />
              <circle cx="62" cy="85" r="8"  fill="url(#enecoRed2)" />
              <circle cx="38" cy="62" r="22" fill="url(#enecoRed2)" />
            </svg>
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">
            Eneco <span className="font-light">Energiser</span>
            <span className="ml-3 text-xs font-medium text-gray-500 uppercase tracking-widest">TD Mode</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Connection status badge */}
          <button
            onClick={() => { setDraftHost(wsHost); setDraftPort(wsPort); setShowSettings(true); }}
            className="px-4 py-1.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-full flex items-center gap-2 hover:bg-white/20 transition-colors"
          >
            <div className={`w-2 h-2 rounded-full animate-pulse ${statusColor[status]}`} />
            <span className="text-xs font-semibold text-gray-300 uppercase tracking-widest hidden sm:block">
              {statusLabel[status]}
            </span>
            {status === 'connected'
              ? <Wifi className="w-3 h-3 text-gray-400" />
              : <WifiOff className="w-3 h-3 text-gray-400" />
            }
          </button>
        </div>
      </header>

      {/* Main */}
      <section className="flex-1 flex flex-col lg:flex-row px-6 lg:px-12 pb-12 gap-8 lg:gap-16 z-10 w-full max-w-screen-2xl mx-auto min-h-0">
        {/* Battery panel */}
        <div className="w-full flex-[2.5] flex flex-col items-center justify-center bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[48px] shadow-2xl relative overflow-hidden py-12 lg:py-0">
          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05),transparent)]" />
          <SoundParticles intensity={audioLevel} isFilling={motionLevel > 5 && audioLevel > 5} />
          <SurgeSparks active={isSurging} />
          <Battery level={batteryLevel} audioLevel={audioLevel} motionLevel={motionLevel} isSurging={isSurging} />
          <div className="mt-8 flex flex-col items-center z-10">
            <h2 className="text-xl font-semibold text-white">Space Energy Level</h2>
            <p className="text-sm text-gray-400 mt-1 uppercase tracking-widest font-medium">
              {isSurging ? 'OVERCHARGE ACTIVE' : ((motionLevel > 20 || audioLevel > 20) ? 'High Collective Activity' : 'Awaiting Activity')}
            </p>
          </div>
        </div>

        {/* Stats panel */}
        <div className="flex flex-col w-full flex-1 max-w-[500px] gap-6 shrink-0 justify-center">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[24px] h-40 p-5 flex flex-col justify-between shadow-sm">
              <span className="text-[10px] font-bold text-[#E3003F] uppercase tracking-widest flex items-center gap-1">
                <Activity className="w-3 h-3" /> Active Motion
              </span>
              <div className="flex flex-col gap-1 mt-auto">
                <div className="font-bold text-white text-3xl">
                  {Math.round(motionLevel)}<span className="text-base font-medium opacity-50 ml-1">/ 100</span>
                </div>
                <div className={`text-xs font-medium ${motionLevel > 10 ? 'text-orange-400' : 'text-gray-400'}`}>
                  {motionLevel > 10 ? 'Detecting movement' : 'Standby'}
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[24px] h-40 p-5 flex flex-col justify-between shadow-sm">
              <span className="text-[10px] font-bold text-[#FF7000] uppercase tracking-widest flex items-center gap-1">
                <Mic className="w-3 h-3" /> Room dB
              </span>
              <div className="flex flex-col gap-1 mt-auto">
                <div className="font-bold text-white text-3xl">
                  {Math.round(audioLevel)}<span className="text-base font-medium opacity-50 ml-1">dB</span>
                </div>
                <div className={`text-xs font-medium ${audioLevel > 15 ? 'text-[#FF7000]' : 'text-gray-400'}`}>
                  {audioLevel > 15 ? 'Active Audience' : 'Quiet'}
                </div>
              </div>
            </div>
          </div>

          {/* WebSocket info */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[24px] p-5 text-xs text-gray-500 space-y-1">
            <p className="font-semibold text-gray-400 mb-2">WebSocket</p>
            <p>Host: <span className="text-gray-300">{wsHost}</span></p>
            <p>Port: <span className="text-gray-300">{wsPort}</span></p>
            <p>URL: <span className="text-gray-300">ws://{wsHost}:{wsPort}</span></p>
            <p className="pt-1">Expected JSON format:</p>
            <pre className="text-gray-400 bg-black/30 rounded-lg p-2 mt-1 leading-relaxed">
{`{
  "batteryLevel": 0–100,
  "isSurging":    true/false,
  "motionLevel":  0–100,
  "audioLevel":   0–100
}`}
            </pre>
          </div>
        </div>
      </section>

      {/* Settings modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowSettings(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-xl font-bold bg-gradient-to-r from-[#E3003F] to-[#FF7000] bg-clip-text text-transparent">
                  WebSocket Settings
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Host</label>
                  <input
                    value={draftHost}
                    onChange={e => setDraftHost(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#00A9E0]"
                    placeholder="localhost"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Port</label>
                  <input
                    value={draftPort}
                    onChange={e => setDraftPort(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#00A9E0]"
                    placeholder="9980"
                  />
                </div>
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
                <button onClick={() => setShowSettings(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                <button onClick={handleApplySettings} className="px-6 py-2 bg-gray-900 text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-colors">
                  Apply & Reconnect
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
