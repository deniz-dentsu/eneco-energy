import { motion } from 'motion/react';
import { useEffect, useState, useRef } from 'react';
import { FigmaBox } from './FigmaCanvas';
import imgBattery from '../images/battery.png';

// Custom Canvas-based Dense Glow Particles
function PlasmaField({ level, intensity = 0, motion = 0, isSurging = false }: { level: number, intensity?: number, motion?: number, isSurging?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorsRef = useRef({ level, intensity, motion, isSurging });

  useEffect(() => {
    colorsRef.current = { level, intensity, motion, isSurging };
  }, [level, intensity, motion, isSurging]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let rafId: number;
    let w = 0, h = 0;
    
    // Optimal density for 3D particles matching outside style
    const pointsCount = 400;
    // Helper to interpolate battery color (Red -> Orange instead of Green)
    const getInterpolatedColor = (_lvl: number) => [255, 255, 255];

    const particles = Array.from({ length: pointsCount }).map((_, i) => {
        return {
           x: Math.random() * 1.5 - 0.2, // Spread horizontally 
           angle: Math.random() * Math.PI * 2,
           // Use square root for uniform distribution in a circle
           radius: Math.pow(Math.random(), 0.5), 
           speedX: Math.random() * 0.003 + 0.001, // extremely slow base speed
           rotSpeed: (Math.random() - 0.5) * 0.02, 
           colorOffset: (Math.random() - 0.5) * 30, // Offset for gradient spread
           baseSize: Math.random() * 3 + 1.5 // Bigger sizes to imitate outside particles
        };
    });

    const render = (time: number) => {
       if (canvas.offsetWidth !== w || canvas.offsetHeight !== h) {
           w = canvas.offsetWidth;
           h = canvas.offsetHeight;
           canvas.width = w; 
           canvas.height = h;
       }
       
       ctx.clearRect(0, 0, w, h);
       if (w === 0 || h === 0) {
           rafId = requestAnimationFrame(render);
           return;
       }

       // Use normal source-over to allow dark shadows
       ctx.globalCompositeOperation = 'source-over';
       
       const { level, intensity, motion, isSurging } = colorsRef.current;
       
       if (level > 0.5) {
           const isFilling = isSurging || ((motion || 0) > 5 && (intensity || 0) > 5);
           // Slow at 0% (red), fast at 100% (green)
           let activeMultiplier = 0.05 + Math.pow(Math.max(0, level) / 100, 2) * 2.5;
           
           if (isFilling) {
               activeMultiplier *= 1.8; // Move faster when actively filling
           }
           if (isSurging) {
               activeMultiplier *= 4; // Boost for surge mode
           }
           
           particles.forEach(p => {
               // Move right to left (sucking into the filled portion)
               p.x -= p.speedX * activeMultiplier;
               if (p.x < -0.2) {
                   p.x += 1.5;
                   p.angle = Math.random() * Math.PI * 2;
                   p.radius = Math.pow(Math.random(), 0.5);
               }
               // Add chaotic wobble in surge mode
               const wobble = isSurging ? (Math.random() - 0.5) * 0.2 : 0;
               p.angle += p.rotSpeed * activeMultiplier * (isFilling ? 1.5 : 1) + wobble;
           });

           const cx = w / 2;
           const cy = h / 2;
           const tubeRadius = h * 0.45; 
           
           const projected = [];

           particles.forEach(p => {
               // Flat 3D tube geometry without procedural displacement
               const y3d = Math.cos(p.angle) * p.radius;
               const z3d = Math.sin(p.angle) * p.radius; 
               const perspective = 2.5 / (2.5 + z3d); 
               
               const px = p.x * w + (isSurging ? (Math.random()-0.5)*10 : 0); // Shake X
               const py = cy + y3d * tubeRadius * perspective + (isSurging ? (Math.random()-0.5)*10 : 0); // Shake Y
               
               const size = p.baseSize * perspective * (isFilling ? 1.2 : 1) * (isSurging ? 2.5 : 1);
               
               // Fade near edges
               const edgeFade = p.x < 0 ? (1 + p.x*5) : (p.x > 1 ? (1 - (p.x-1)*5) : 1);
               
               const alpha = Math.max(0, Math.min(1, edgeFade * (level/10)));
               
               if (alpha > 0.01) {
                   // Use alpha for depth shading instead of RGB multiplication
                   // (RGB multiplication grays out bright/white colors)
                   const ao = Math.max(0.35, 1 - (z3d + 1) * 0.35);
                   const coreShadow = Math.max(0.6, p.radius);
                   const depthAlpha = isSurging ? Math.min(1, ao * coreShadow * 2.0) : ao * coreShadow;

                   const effectiveLvl = Math.max(0, Math.min(100, level + (p.colorOffset || 0)));
                   const baseColor = isSurging ? [255, 255, 255] : getInterpolatedColor(effectiveLvl);

                   projected.push({
                       z: z3d,
                       px, py, size,
                       color: `rgba(${baseColor[0]|0}, ${baseColor[1]|0}, ${baseColor[2]|0}, ${alpha * depthAlpha})`
                   });
               }
           });
           
           // Depth sort to enforce Houdini aesthetic
           projected.sort((a, b) => b.z - a.z);
           
           for(let i = 0; i < projected.length; i++) {
               const pt = projected[i];
               ctx.fillStyle = pt.color;
               ctx.beginPath();
               ctx.arc(pt.px, pt.py, pt.size/2, 0, Math.PI*2);
               ctx.fill();
           }
       }
       
       rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full pointer-events-none mix-blend-normal opacity-100 transition-opacity duration-500" 
      // className="absolute inset-0 w-full h-full pointer-events-none mix-blend-screen opacity-100 transition-opacity duration-500" 
    />
  );
}


interface BatteryProps {
  level: number; // 0 to 100
  audioLevel?: number;
  motionLevel?: number;
  isSurging?: boolean;
}

export function Battery({ level, audioLevel = 0, motionLevel = 0, isSurging = false }: BatteryProps) {
  const clampedLevel = Math.max(0, Math.min(100, level));
  
  const getOuterColors = (_lvl: number) => {
      // Brand color: #FFD87D — amber yellow
      // Darker end: #FFA830 (deeper amber for gradient depth)
      return {
          baseBg: 'linear-gradient(to right, rgba(255,216,125,0.65), rgba(255,168,48,0.40))',
          shadow: 'rgba(255,216,125,0.9)',
          rgbStart: [255, 216, 125]
      };
  };
  const colors = getOuterColors(clampedLevel);

  return ( <>
    {/* Percentage Overlay */}
    <FigmaBox x={192} y={100} w={1455} h={819} style={{fontSize: 242, fontWeight: 'bold', textAlign: "center", color: 'white'}}>
      {Math.round(clampedLevel)}<span>%</span>
    </FigmaBox>

    <FigmaBox x={192} y={126} w={1455} h={819}>
      <img src={imgBattery} style={{
        width: '100%', height: '100%', 
        mixBlendMode: 'multiply'
      }} />
    </FigmaBox>

      {/* Battery Body */}
      <FigmaBox x={389} y={346} w={1099} h={388} className="rounded-[400px] p-2">

        {/* Glow layer — outside overflow-hidden, filter isolated here */}
        <div className="relative w-full h-full rounded-[400px] overflow-hidden"
          style={{
            position: 'absolute', top: 0, bottom: 0, left: 0,
            borderRadius: 400,
            filter: 'blur(10px)',
            opacity: 1,
          }}

        >
          <motion.div
            style={{
              position: 'absolute', top: 0, bottom: 0, left: 0,
              borderRadius: 400,
              background: colors.baseBg,
              // background: 'white',
              pointerEvents: 'none',
            }}
            animate={{ width: `${clampedLevel}%` }}
            transition={{ type: 'spring', bounce: 0, duration: 0.8 }}
          />
        </div>
      
        {/* Fill container — overflow-hidden, no filter */}
        <div className="relative w-full h-full rounded-[400px] overflow-hidden">
          {/* The Fill */}
          <motion.div
            className="absolute top-0 bottom-0 left-0 rounded-[400px] origin-left overflow-hidden border border-white/5"
            initial={{ width: '0%' }}
            animate={{
              width: `${clampedLevel}%`,
              background: colors.baseBg,
              boxShadow: `0 0 40px ${colors.shadow}`
            }}
            transition={{
              width: { type: 'spring', bounce: 0, duration: 0.8 },
              background: { duration: 1 },
            }}
            style={{ minWidth: clampedLevel > 0 ? '32px' : '0' }}
          >
            {/* Right Surface glowing edge */}
            <motion.div
              className="absolute top-0 right-0 h-full w-8 opacity-60 blur-md pointer-events-none rounded-r-[32px] mix-blend-screen"
              animate={{ backgroundColor: `rgb(${colors.rgbStart.join(',')})` }}
              transition={{ duration: 1 }}
            />

            {/* Volumetric 3D Plasma Field */}
            <PlasmaField level={clampedLevel} intensity={audioLevel} motion={motionLevel} isSurging={isSurging} />

          </motion.div>
        </div>



      </FigmaBox>

  </>
  );
}
