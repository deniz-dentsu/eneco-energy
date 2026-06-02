import { useEffect, useRef } from 'react';

export function SurgeSparks({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!active) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    
    let w = canvas.offsetWidth;
    let h = canvas.offsetHeight;
    canvas.width = w;
    canvas.height = h;
    
    let bgGrad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h)/2);
    bgGrad.addColorStop(0, 'rgba(250, 204, 21, 0.8)');
    bgGrad.addColorStop(0.5, 'rgba(234, 88, 12, 0.4)');
    bgGrad.addColorStop(1, 'transparent');
    
    const particles: any[] = [];
    let rafId: number;
    let burstActive = true;
    
    const stopBurst = setTimeout(() => { burstActive = false; }, 3800);

    const render = () => {
      if (w !== canvas.offsetWidth || h !== canvas.offsetHeight) {
         w = canvas.offsetWidth;
         h = canvas.offsetHeight;
         canvas.width = w;
         canvas.height = h;
         
         bgGrad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h)/2);
         bgGrad.addColorStop(0, 'rgba(250, 204, 21, 0.8)');
         bgGrad.addColorStop(0.5, 'rgba(234, 88, 12, 0.4)');
         bgGrad.addColorStop(1, 'transparent');
      }
      
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'screen';
      
      const cx = w / 2;
      const cy = h / 2;
      
      if (burstActive) {
          // Intense fire sparks spawning rapidly
          for (let i=0; i<6; i++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = Math.random() * 15 + 5;
              particles.push({
                  x: cx + (Math.random()-0.5)*w*0.8, 
                  y: cy + (Math.random()-0.5)*h*0.8,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  life: 1,
                  decay: Math.random() * 0.03 + 0.015,
                  size: Math.random() * 8 + 2,
                  shade: Math.random() > 0.6 ? '#ffffff' : (Math.random() > 0.4 ? '#facc15' : '#ea580c')
              });
          }
      }
      
      for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life -= p.decay;
          
          if (p.life <= 0) {
              particles.splice(i, 1);
              continue;
          }
          
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI*2);
          ctx.fillStyle = p.shade;
          ctx.globalAlpha = p.life;
          ctx.fill();
      }
      
      // Intense glow overlay over the whole thing
      if (burstActive) {
          ctx.globalAlpha = Math.random() * 0.3 + 0.1;
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, w, h);
      }
      
      if (particles.length > 0 || burstActive) {
         rafId = requestAnimationFrame(render);
      }
    };
    
    rafId = requestAnimationFrame(render);
    
    return () => {
      clearTimeout(stopBurst);
      cancelAnimationFrame(rafId);
    };
  }, [active]);
  
  return (
    <canvas 
       ref={canvasRef}
       className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-500 z-40 mix-blend-screen overflow-visible ${active ? 'opacity-100' : 'opacity-0'}`}
    />
  );
}
