'use client';
import {useEffect,useRef,useState} from 'react';

/**
 * Hiệu ứng bụi vàng lấp lánh & hào quang Bokeh (Bokeh Orbs) huyền ảo.
 */

interface GoldParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  alphaSpeed: number;
  phase: number;
  life: number;
  maxLife: number;
  isBokeh: boolean;
  hue: 'gold' | 'rose' | 'pearl';
}

function createParticle(w: number, h: number): GoldParticle {
  const isBokeh = Math.random() < 0.22;
  const hues: GoldParticle['hue'][] = ['gold', 'gold', 'rose', 'pearl'];
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * (isBokeh ? 0.15 : 0.32),
    vy: -0.08 - Math.random() * (isBokeh ? 0.18 : 0.32),
    size: isBokeh ? 10 + Math.random() * 22 : 1.5 + Math.random() * 3.2,
    alpha: 0,
    alphaSpeed: 0.002 + Math.random() * 0.004,
    phase: Math.random() * Math.PI * 2,
    life: 0,
    maxLife: 3400 + Math.random() * 5200,
    isBokeh,
    hue: hues[Math.floor(Math.random() * hues.length)],
  };
}

export function GoldenDust({ count = 24, active = true }: { count?: number; active?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<GoldParticle[]>([]);
  const rafRef = useRef(0);
  const runningRef = useRef(false);
  const [motionOk, setMotionOk] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    setMotionOk(!motion.matches);
    const update = (event: MediaQueryListEvent) => setMotionOk(!event.matches);
    motion.addEventListener('change', update);
    return () => motion.removeEventListener('change', update);
  }, []);

  const enabled = motionOk && active && count > 0;

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let width = 0;
    let height = 0;
    let lastTime = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const ratio = Math.min(window.devicePixelRatio || 1, width < 640 ? 1.5 : 2);
      const targetW = Math.round(width * ratio);
      const targetH = Math.round(height * ratio);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      }
      const effectiveCount = width > 0 && width < 640 ? Math.max(6, Math.ceil(count * 0.5)) : count;
      if (!particlesRef.current.length && width > 0) {
        particlesRef.current = Array.from({ length: effectiveCount }, (_, i) => {
          const p = createParticle(width, height);
          p.life = -i * 60;
          return p;
        });
      }
    };

    const frame = (time: number) => {
      const dt = lastTime ? Math.min(time - lastTime, 50) : 16;
      lastTime = time;
      ctx.clearRect(0, 0, width, height);

      for (const p of particlesRef.current) {
        p.life += dt;
        if (p.life < 0) continue;
        if (p.life > p.maxLife || p.y < -30) {
          Object.assign(p, createParticle(width, height));
          p.life = 0;
          continue;
        }
        const progress = p.life / p.maxLife;
        const baseAlpha =
          Math.min(1, progress * 4) *
          Math.min(1, (1 - progress) * 3) *
          (Math.sin(time * p.alphaSpeed + p.phase) * 0.35 + 0.65);

        p.x += p.vx + Math.sin(time * 0.001 + p.phase) * 0.15;
        p.y += p.vy;

        if (p.isBokeh) {
          const bokehAlpha = baseAlpha * 0.18;
          const glow = ctx.createRadialGradient(p.x, p.y, p.size * 0.15, p.x, p.y, p.size);
          if (p.hue === 'rose') {
            glow.addColorStop(0, `rgba(255, 218, 228, ${bokehAlpha * 0.65})`);
            glow.addColorStop(0.78, `rgba(248, 188, 206, ${bokehAlpha})`);
            glow.addColorStop(1, 'rgba(248, 188, 206, 0)');
          } else {
            glow.addColorStop(0, `rgba(255, 244, 204, ${bokehAlpha * 0.65})`);
            glow.addColorStop(0.78, `rgba(238, 206, 138, ${bokehAlpha})`);
            glow.addColorStop(1, 'rgba(212, 175, 95, 0)');
          }
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = p.hue === 'rose'
            ? `rgba(255, 232, 238, ${bokehAlpha * 0.55})`
            : `rgba(255, 246, 212, ${bokehAlpha * 0.6})`;
          ctx.lineWidth = 0.85;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.82, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          const alpha = baseAlpha * 0.32;
          const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3.2);
          glow.addColorStop(0, `rgba(255, 228, 162, ${alpha})`);
          glow.addColorStop(0.4, `rgba(232, 198, 128, ${alpha * 0.55})`);
          glow.addColorStop(1, 'rgba(195, 162, 107, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 3.2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = `rgba(255, 250, 232, ${Math.min(0.34, alpha * 1.1)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.55, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      rafRef.current = requestAnimationFrame(frame);
    };

    const start = () => {
      if (runningRef.current || document.hidden) return;
      runningRef.current = true;
      rafRef.current = requestAnimationFrame(frame);
    };

    const visibility = () => {
      cancelAnimationFrame(rafRef.current);
      runningRef.current = false;
      if (!document.hidden) start();
    };

    resize();
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('resize', resize);
    start();

    return () => {
      cancelAnimationFrame(rafRef.current);
      runningRef.current = false;
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('resize', resize);
    };
  }, [enabled, count]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="golden-dust"
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 4,
      }}
    />
  );
}
