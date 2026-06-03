import { motion } from 'motion/react';
import { useEffect, useState, useRef } from 'react';

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
    const getInterpolatedColor = (lvl: number) => {
        // Interpolate between Eneco Red (227, 0, 63) and Orange (255, 112, 0)
        const t = Math.max(0, Math.min(100, lvl)) / 100;
        return [227 + (255 - 227) * t, 0 + (112 - 0) * t, 63 + (0 - 63) * t];
    };

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
                   // Ambient occlusion based on radius and depth inside the tube
                   const ao = Math.max(0.35, 1 - (z3d + 1) * 0.35); // darker at the back
                   const coreShadow = Math.max(0.6, p.radius); 
                   const lightIntensity = isSurging ? (ao * coreShadow * 2.5 + 0.5) : (ao * coreShadow * 1.5);
                   
                   const effectiveLvl = Math.max(0, Math.min(100, level + (p.colorOffset || 0)));
                   const baseColor = isSurging ? [255, 255, 255] : getInterpolatedColor(effectiveLvl);
                   
                   const r = Math.min(255, baseColor[0] * lightIntensity);
                   const g = Math.min(255, baseColor[1] * lightIntensity);
                   const b = Math.min(255, baseColor[2] * lightIntensity);

                   projected.push({
                       z: z3d,
                       px, py, size,
                       color: `rgba(${r|0}, ${g|0}, ${b|0}, ${alpha})`
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
      className="absolute inset-0 w-full h-full pointer-events-none mix-blend-screen opacity-100 transition-opacity duration-500" 
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
  
  const getOuterColors = (lvl: number) => {
      if (lvl < 50) return { 
          baseBg: 'linear-gradient(to right, rgba(227,0,63,0.5), rgba(40,0,10,0.3))', 
          shadow: 'rgba(227,0,63,0.7)',
          rgbStart: [227, 0, 63]
      }; 
      return { 
          baseBg: 'linear-gradient(to right, rgba(255,112,0,0.5), rgba(40,15,0,0.3))', 
          shadow: 'rgba(255,112,0,0.7)',
          rgbStart: [255, 112, 0]
      }; 
  };
  const colors = getOuterColors(clampedLevel);

  return (
    <div className="relative flex flex-row items-center justify-center w-full max-w-4xl">
      
      {/* Battery Body (Dark Glass) */}
      <div className="h-48 md:h-72 w-full border-[4px] border-gray-800 rounded-[40px] p-2 bg-gray-950 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4),inset_0_0_20px_rgba(0,0,0,0.8)] backdrop-blur-2xl relative flex flex-row justify-start ring-2 ring-black/20 z-20">
        
        {/* Subtle glass reflection */}
        <div className="absolute inset-0 rounded-[36px] bg-gradient-to-br from-white/5 via-transparent to-white/10 pointer-events-none z-20"></div>
        <div className="absolute top-3 left-6 right-6 h-1.5 rounded-full bg-white/10 blur-[1px] pointer-events-none z-20"></div>

        <div className="relative w-full h-full rounded-[32px] overflow-hidden">
          {/* The Fill */}
          <motion.div 
            className="absolute top-0 bottom-0 left-0 rounded-[32px] z-10 origin-left overflow-hidden shadow-inner border border-white/5"
            initial={{ width: '0%' }}
            animate={{ 
              width: `${clampedLevel}%`,
              background: colors.baseBg,
              boxShadow: `10px 0 40px ${colors.shadow}, inset 20px 0 40px rgba(0,0,0,0.5)`
            }}
            transition={{ 
              width: { type: 'spring', bounce: 0, duration: 0.8 },
              background: { duration: 1 },
              boxShadow: { duration: 1 }
            }}
            style={{ minWidth: clampedLevel > 0 ? '32px' : '0' }}
          >
            {/* Right Surface glowing edge */}
            <motion.div 
               className="absolute top-0 right-0 h-full w-8 opacity-60 blur-md pointer-events-none rounded-r-[32px] mix-blend-screen"
               animate={{ backgroundColor: `rgb(${colors.rgbStart.join(',')})` }}
               transition={{ duration: 1 }}
            ></motion.div>
            
            {/* Volumetric 3D Plasma Field */}
            <PlasmaField level={clampedLevel} intensity={audioLevel} motion={motionLevel} isSurging={isSurging} />
            
          </motion.div>
        </div>
          
        {/* Percentage Overlay */}
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none mix-blend-screen">
          <span className="text-7xl font-black text-white/90 drop-shadow-[0_0_15px_rgba(0,0,0,0.8)] tracking-tighter">
            {Math.round(clampedLevel)}<span className="text-3xl opacity-70 ml-1">%</span>
          </span>
        </div>
      </div>

      {/* Battery Cap */}
      <div className="h-24 md:h-32 w-6 md:w-8 bg-gray-900 border-t border-b border-r border-gray-700 rounded-r-lg z-10 shadow-[inset_2px_0_4px_rgba(255,255,255,0.1)] -ml-1"></div>
    </div>
  );
}
