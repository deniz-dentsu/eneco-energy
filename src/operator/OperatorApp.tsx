import { useEffect, useRef, useState } from 'react';

const CHANNEL = 'eneco-operator';

const DEFAULT_MOTION_GAIN = 0.06;
const DEFAULT_AUDIO_GAIN = 0.06;

interface MainState {
  batteryLevel: number;
  motionLevel: number;
  audioLevel: number;
}

export default function OperatorApp() {
  const ch = useRef<BroadcastChannel | null>(null);

  const [connected, setConnected] = useState(false);
  const [mainState, setMainState] = useState<MainState>({ batteryLevel: 0, motionLevel: 0, audioLevel: 0 });

  const [motionGain, setMotionGain] = useState(DEFAULT_MOTION_GAIN);
  const [audioGain, setAudioGain] = useState(DEFAULT_AUDIO_GAIN);

  const [manualMode, setManualMode] = useState(false);
  const [manualMotion, setManualMotion] = useState(50);
  const [manualAudio, setManualAudio] = useState(50);

  const fieldRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  // BroadcastChannel setup
  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL);
    ch.current = channel;

    channel.onmessage = (e) => {
      if (e.data.type === 'state') {
        setMainState(e.data);
        setConnected(true);
      }
    };

    return () => channel.close();
  }, []);

  // Send params whenever they change (only when connected)
  useEffect(() => {
    if (!connected || !ch.current) return;
    ch.current.postMessage({ type: 'params', motionGain, audioGain });
  }, [motionGain, audioGain, connected]);

  // Send manual values when in manual mode
  useEffect(() => {
    if (!ch.current) return;
    if (manualMode) {
      ch.current.postMessage({ type: 'manual', motionLevel: manualMotion, audioLevel: manualAudio });
    } else {
      ch.current.postMessage({ type: 'manual-off' });
    }
  }, [manualMode, manualMotion, manualAudio]);

  // 2D field drag handling
  const updateFromPointer = (e: PointerEvent | React.PointerEvent) => {
    const el = fieldRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setManualMotion(Math.round(x * 100));
    setManualAudio(Math.round((1 - y) * 100));
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => { if (dragging.current) updateFromPointer(e); };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  const fieldX = manualMotion / 100;
  const fieldY = 1 - manualAudio / 100;

  return (
    <div style={{ minHeight: '100vh', background: '#111', color: '#fff', fontFamily: 'Inter, sans-serif', padding: 32, display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#fff' }}>Eneco Operator</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: connected ? '#4ade80' : '#f87171' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#4ade80' : '#f87171' }} />
          {connected ? 'Connected' : 'Waiting for main window...'}
        </div>
      </div>

      {/* Live state */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        {[
          { label: 'Battery', value: mainState.batteryLevel, color: '#FFD87D' },
          { label: 'Motion', value: mainState.motionLevel, color: '#60a5fa' },
          { label: 'Audio', value: mainState.audioLevel, color: '#a78bfa' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#1f1f1f', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: 32, fontWeight: 700, color }}>{Math.round(value)}</div>
          </div>
        ))}
      </div>

      {/* Gain parameters */}
      <div style={{ background: '#1f1f1f', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#9ca3af' }}>GAIN PARAMETERS</h2>
        {[
          { label: 'Motion Gain', value: motionGain, setter: setMotionGain },
          { label: 'Audio Gain', value: audioGain, setter: setAudioGain },
        ].map(({ label, value, setter }) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#FFD87D', fontVariantNumeric: 'tabular-nums' }}>{value.toFixed(3)}</span>
            </div>
            <input
              type="range" min={0} max={0.2} step={0.001}
              value={value}
              onChange={(e) => setter(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#FFD87D' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280' }}>
              <span>0</span>
              <span style={{ color: '#4b5563' }}>default: {DEFAULT_MOTION_GAIN}</span>
              <span>0.2</span>
            </div>
          </div>
        ))}
        <button
          onClick={() => { setMotionGain(DEFAULT_MOTION_GAIN); setAudioGain(DEFAULT_AUDIO_GAIN); }}
          style={{ alignSelf: 'flex-start', padding: '6px 16px', background: '#374151', border: 'none', borderRadius: 8, color: '#d1d5db', fontSize: 13, cursor: 'pointer' }}
        >
          Reset to defaults
        </button>
      </div>

      {/* Manual mode */}
      <div style={{ background: '#1f1f1f', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#9ca3af' }}>MANUAL MODE</h2>
          <button
            onClick={() => setManualMode(m => !m)}
            style={{
              padding: '6px 20px', border: 'none', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: manualMode ? '#E5384C' : '#374151',
              color: '#fff',
            }}
          >
            {manualMode ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* 2D field */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div
            ref={fieldRef}
            onPointerDown={(e) => { dragging.current = true; updateFromPointer(e); }}
            style={{
              width: 280, height: 280, borderRadius: 16,
              background: manualMode ? '#0f172a' : '#161616',
              border: `2px solid ${manualMode ? '#E5384C' : '#374151'}`,
              position: 'relative', cursor: manualMode ? 'crosshair' : 'not-allowed',
              flexShrink: 0, touchAction: 'none',
              opacity: manualMode ? 1 : 0.4,
            }}
          >
            {/* Axis labels */}
            <span style={{ position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)', fontSize: 11, color: '#4b5563' }}>Motion →</span>
            <span style={{ position: 'absolute', top: '50%', left: 6, transform: 'translateY(-50%) rotate(-90deg)', fontSize: 11, color: '#4b5563' }}>Audio ↑</span>

            {/* Grid lines */}
            <div style={{ position: 'absolute', inset: 0, opacity: 0.15, pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: '#fff' }} />
              <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: '#fff' }} />
            </div>

            {/* Handle */}
            <div style={{
              position: 'absolute',
              left: `${fieldX * 100}%`, top: `${fieldY * 100}%`,
              width: 20, height: 20, borderRadius: '50%',
              background: manualMode ? '#E5384C' : '#374151',
              transform: 'translate(-50%, -50%)',
              boxShadow: manualMode ? '0 0 12px rgba(229,56,76,0.6)' : 'none',
              pointerEvents: 'none',
            }} />
          </div>

          {/* Value readout */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#111', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Motion</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#60a5fa' }}>{manualMotion}</div>
            </div>
            <div style={{ background: '#111', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Audio</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#a78bfa' }}>{manualAudio}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
