import { useEffect, useState, type ReactNode } from 'react';

const CANVAS_W = 1920;
const CANVAS_H = 1080;

function useWindowSize() {
  const [size, setSize] = useState({ vw: window.innerWidth, vh: window.innerHeight });
  useEffect(() => {
    const handler = () => setSize({ vw: window.innerWidth, vh: window.innerHeight });
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return size;
}

function useScale() {
  const { vw, vh } = useWindowSize();
  return Math.min(vw / CANVAS_W, vh / CANVAS_H);
}

/**
 * Returns the position and size (in canvas-space px) of a rect that
 * exactly covers the full viewport, accounting for the scale transform.
 * Use this to place a background element that bleeds outside the 16:9 area.
 */
export function useCanvasViewport() {
  const { vw, vh } = useWindowSize();
  const scale = Math.min(vw / CANVAS_W, vh / CANVAS_H);
  const w = vw / scale;
  const h = vh / scale;
  const x = -(w - CANVAS_W) / 2;
  const y = -(h - CANVAS_H) / 2;
  return { x, y, w, h };
}

interface FigmaCanvasProps {
  children: ReactNode;
  className?: string;
  /** Debug: fill color of the canvas area, e.g. 'rgba(255,0,0,0.1)' */
  debugFill?: string;
  /** Debug: stroke color of the canvas border, e.g. 'red' */
  debugStroke?: string;
  /** Background color applied to the full viewport (outside the 16:9 canvas too) */
  background?: string;
}

export function FigmaCanvas({ children, className = '', debugFill, debugStroke, background }: FigmaCanvasProps) {
  const scale = useScale();

  return (
    <div
      style={{ width: '100vw', height: '100vh', overflow: 'clip', display: 'flex', alignItems: 'center', justifyContent: 'center', background }}
      className={className}
    >
      <div
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          position: 'relative',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          flexShrink: 0,
          backgroundColor: debugFill,
          outline: debugStroke ? `2px solid ${debugStroke}` : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}

interface FigmaBoxProps {
  x: number;
  y: number;
  w: number;
  h: number;
  children?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Debug: fill color, e.g. 'rgba(0,128,255,0.15)' */
  debugFill?: string;
  /** Debug: stroke color, e.g. '#0080ff' */
  debugStroke?: string;
}

export function FigmaBox({ x, y, w, h, children, className = '', style, debugFill, debugStroke }: FigmaBoxProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        backgroundColor: debugFill,
        outline: debugStroke ? `2px solid ${debugStroke}` : undefined,
        ...style,
      }}
      className={className}
    >
      {children}
    </div>
  );
}
