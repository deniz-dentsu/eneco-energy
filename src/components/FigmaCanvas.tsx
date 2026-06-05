import { useEffect, useState, type ReactNode } from 'react';

const CANVAS_W = 1920;
const CANVAS_H = 1080;

function useScale() {
  const [scale, setScale] = useState(() =>
    Math.min(window.innerWidth / CANVAS_W, window.innerHeight / CANVAS_H)
  );

  useEffect(() => {
    const handler = () =>
      setScale(Math.min(window.innerWidth / CANVAS_W, window.innerHeight / CANVAS_H));
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return scale;
}

interface FigmaCanvasProps {
  children: ReactNode;
  className?: string;
  /** Debug: fill color of the canvas area, e.g. 'rgba(255,0,0,0.1)' */
  debugFill?: string;
  /** Debug: stroke color of the canvas border, e.g. 'red' */
  debugStroke?: string;
}

export function FigmaCanvas({ children, className = '', debugFill, debugStroke }: FigmaCanvasProps) {
  const scale = useScale();

  return (
    <div
      style={{ width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
