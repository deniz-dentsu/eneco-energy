import { useEffect, useRef } from 'react';

export function SoundParticles({ intensity, isFilling = false }: { intensity: number, isFilling?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intensityRef = useRef(intensity);
  const isFillingRef = useRef(isFilling);

  // Sync intensity so the loop doesn't restart and lose particle positions
  useEffect(() => {
    intensityRef.current = intensity;
    isFillingRef.current = isFilling;
  }, [intensity, isFilling]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let w = 0, h = 0;
    let rafId: number;
    
    // Structured polar grid to look like a 3D mesh surface (7200 tiny dots)
    const particles: any[] = [];
    const rings = 60;
    const dotsPerRing = 120;
    
    for (let r = 0; r < rings; r++) {
       for (let d = 0; d < dotsPerRing; d++) {
         const angle = (d / dotsPerRing) * Math.PI * 2 + (r * 0.05);
         const baseRadius = 80 + (r / rings) * 600; 
         
         let color = [124, 194, 66]; // Eneco Green default
         const colorBand = Math.sin(r * 0.2 + d * 0.1);
         if (colorBand > 0.3) {
             color = [124, 194, 66]; // Green
         } else if (colorBand < -0.3) {
             color = [255, 204, 0]; // Yellow
         } else {
             color = [184, 222, 40]; // Light Green/Yellow-Green
         }
         
         particles.push({ 
             baseRadius, 
             angle, 
             color,
             seedR: Math.random()
         });
       }
    }

    let totalInwardMovement = 0;
    let time = 0;

    const render = () => {
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

       const currentIntensity = intensityRef.current;
       const activeFactor = Math.max(0, Math.min(100, currentIntensity)) / 100;
       
       const cx = w / 2;
       const cy = h / 2;

       time += 0.005 + (activeFactor * 0.012);
       
       let pullSpeed = 0.5 + (activeFactor * 8); 
       if (isFillingRef.current) {
           pullSpeed += 5 + (activeFactor * 15); 
       }
       totalInwardMovement += pullSpeed;

       // Use normal source-over alpha blending to allow shadows and occlusion to work
       ctx.globalCompositeOperation = 'source-over';

       const projected = [];
       
       const amplitude = 30 + (activeFactor * 120);

       for (let i = 0; i < particles.length; i++) {
           const p = particles[i];
           
           let currentRadius = p.baseRadius - totalInwardMovement;
           const range = 600;
           currentRadius = ((currentRadius - 80) % range + range) % range + 80;

           const currentAngle = p.angle + time * 0.2;

           // Complex wave math: multiple frequencies for organic undulating surface
           const wave1 = Math.sin(currentAngle * 3 + time * 2);
           const wave2 = Math.sin(currentRadius * 0.015 - time * 3);
           const wave3 = Math.cos(currentAngle * 2 - currentRadius * 0.01 + time);
           
           // Wave amplitude rises with sound
           const yOffset = (wave1 * wave2 + wave3 * 0.5) * amplitude;

           const x3d = currentRadius * Math.cos(currentAngle);
           const z3d = currentRadius * Math.sin(currentAngle);
           const y3d = yOffset;
           
           const perspective = 800 / (800 + z3d);
           const px = cx + x3d * perspective;
           const py = cy + y3d * perspective;
           
           const depthAlpha = z3d > 0 ? Math.max(0, 1 - z3d/800) : 1;
           const edgeAlpha = Math.min(1, (680 - currentRadius) / 100); 
           
           const baseAlpha = Math.min(1, 0.4 + (activeFactor * 0.6));
           const finalAlpha = depthAlpha * edgeAlpha * baseAlpha;

           if (finalAlpha <= 0.01) continue;

           // Houdini-style lighting: Fake ambient occlusion and directional light based on height (y3d)
           const lightIntensity = Math.max(0, Math.min(1, 0.6 - (y3d / (amplitude || 1)) * 0.5));
           // Darken deep crevices (ambient occlusion)
           const ao = Math.max(0.3, 1.2 - Math.abs(wave1 * wave2)); 
           
           const r = Math.min(255, p.color[0] * lightIntensity * ao * 1.5);
           const g = Math.min(255, p.color[1] * lightIntensity * ao * 1.5);
           const b = Math.min(255, p.color[2] * lightIntensity * ao * 1.5);

           projected.push({
               z: z3d,
               px,
               py,
               color: `rgba(${r|0}, ${g|0}, ${b|0}, ${finalAlpha})`,
               size: Math.max(0.5, (1.8 + p.seedR * 1.8) * perspective) // Slightly varying sizes like granules
           });
       }

       // Depth sort back-to-front for actual 3D occlusion
       projected.sort((a, b) => b.z - a.z);

       for (let i = 0; i < projected.length; i++) {
           const pt = projected[i];
           ctx.globalAlpha = 1; // Alpha pre-baked in color string
           ctx.fillStyle = pt.color;
           ctx.beginPath();
           ctx.arc(pt.px, pt.py, pt.size/2, 0, Math.PI * 2);
           ctx.fill();
       }
       
       rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
    />
  );
}
