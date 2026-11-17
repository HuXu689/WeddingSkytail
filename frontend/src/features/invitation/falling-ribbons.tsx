'use client';
import {useEffect,useRef,useState} from 'react';

/**
 * Hiệu ứng dải lụa vàng & hồng đào (silk ribbons) uốn lượn mềm mại.
 */

interface Ribbon {
  x: number;
  y: number;
  width: number;
  length: number;
  angle: number;
  speed: number;
  swaySpeed: number;
  swayAmp: number;
  phase: number;
  color: string;
  opacity: number;
  segments: number;
}

const RIBBON_COLORS = [
  'rgba(195,162,107,.24)',
  'rgba(225,165,175,.22)',
  'rgba(242,215,195,.26)',
  'rgba(230,200,150,.22)',
  'rgba(195,120,130,.18)',
  'rgba(220,185,130,.24)',
];

function createRibbon(w: number, h: number): Ribbon {
  return {
    x: Math.random() * w,
    y: -60 - Math.random() * h * 0.25,
    width: 2 + Math.random() * 3.5,
    length: 70 + Math.random() * 110,
    angle: (Math.random() - 0.5) * 0.28,
    speed: 0.35 + Math.random() * 0.55,
    swaySpeed: 0.002 + Math.random() * 0.004,
    swayAmp: 20 + Math.random() * 50,
    phase: Math.random() * Math.PI * 2,
    color: RIBBON_COLORS[Math.floor(Math.random() * RIBBON_COLORS.length)],
    opacity: 0.35 + Math.random() * 0.45,
    segments: 10 + Math.floor(Math.random() * 6),
  };
}

export function FallingRibbons({ count = 12 }: { count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ribbonsRef = useRef<Ribbon[]>([]);
  const rafRef = useRef<number>(0);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setEnabled(!mq.matches);
    const handler = (e: MediaQueryListEvent) => setEnabled(!e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;

    function resize() {
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      const targetW = Math.round(width * ratio);
      const targetH = Math.round(height * ratio);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      }
    }
    resize();

    ribbonsRef.current = Array.from({ length: count }, () => {
      const r = createRibbon(width, height);
      r.y = Math.random() * height;
      return r;
    });

    let lastTime = 0;
    function frame(time: number) {
      if (!canvas || !ctx) return;
      const dt = lastTime ? Math.min(time - lastTime, 40) : 16;
      lastTime = time;
      ctx.clearRect(0, 0, width, height);

      for (const ribbon of ribbonsRef.current) {
        ribbon.y += ribbon.speed * (dt * 0.055);
        const sway = Math.sin(time * ribbon.swaySpeed + ribbon.phase) * ribbon.swayAmp;
        const baseX = ribbon.x + sway;
        const baseY = ribbon.y;

        if (baseY > height + ribbon.length + 20) {
          Object.assign(ribbon, createRibbon(width, height));
          ribbon.y = -ribbon.length - 20;
          continue;
        }

        ctx.save();
        ctx.globalAlpha = ribbon.opacity;
        ctx.strokeStyle = ribbon.color;
        ctx.lineWidth = ribbon.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        const segLen = ribbon.length / ribbon.segments;

        for (let i = 0; i <= ribbon.segments; i++) {
          const t = i / ribbon.segments;
          const segSway = Math.sin(time * 0.0035 + ribbon.phase + t * Math.PI * 2) * 16 * t;
          const px = baseX + segSway + Math.sin(ribbon.angle) * segLen * i;
          const py = baseY + Math.cos(ribbon.angle) * segLen * i;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Ánh kim dọc dải lụa
        ctx.globalAlpha = ribbon.opacity * 0.45;
        ctx.strokeStyle = 'rgba(255,248,225,.65)';
        ctx.lineWidth = ribbon.width * 0.35;
        ctx.stroke();

        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    const onVisibility = () => {
      cancelAnimationFrame(rafRef.current);
      if (!document.hidden) {
        lastTime = 0;
        rafRef.current = requestAnimationFrame(frame);
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', resize);
    if (!document.hidden) rafRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', resize);
    };
  }, [enabled, count]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="falling-ribbons"
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 2,
      }}
    />
  );
}
