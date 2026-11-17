'use client';
import {useEffect,useRef,useState,useCallback} from 'react';

/**
 * Hiệu ứng lấp lánh theo con trỏ chuột & bung hoa/trái tim khi chạm/click vào thiệp.
 */

interface Sparkle {
  x: number;
  y: number;
  size: number;
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
  color: string;
  rotation: number;
  rotSpeed: number;
  shape: 'circle' | 'star' | 'diamond' | 'heart';
}

const SPARKLE_COLORS = [
  'rgba(255,215,140,.88)',
  'rgba(255,165,185,.85)',
  'rgba(195,162,107,.82)',
  'rgba(242,200,210,.85)',
  'rgba(255,245,220,.92)',
  'rgba(230,140,160,.8)',
];

function drawSparkle(ctx: CanvasRenderingContext2D, s: Sparkle) {
  const progress = s.life / s.maxLife;
  const alpha = progress < 0.2 ? progress / 0.2 : 1 - (progress - 0.2) / 0.8;
  if (alpha <= 0) return;

  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.rotation);
  ctx.globalAlpha = alpha;

  const r = s.size * (0.55 + progress * 0.45);

  switch (s.shape) {
    case 'star': {
      ctx.fillStyle = s.color;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const angle = (i * 90 * Math.PI) / 180;
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle - 0.18) * r * 0.3, Math.sin(angle - 0.18) * r * 0.3);
        ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        ctx.lineTo(Math.cos(angle + 0.18) * r * 0.3, Math.sin(angle + 0.18) * r * 0.3);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'heart': {
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.moveTo(0, r * 0.45);
      ctx.bezierCurveTo(-r * 0.8, -r * 0.2, -r * 0.8, -r * 0.8, 0, -r * 0.35);
      ctx.bezierCurveTo(r * 0.8, -r * 0.8, r * 0.8, -r * 0.2, 0, r * 0.45);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'diamond': {
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.55, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r * 0.55, 0);
      ctx.closePath();
      ctx.fill();
      break;
    }
    default: {
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2);
      gradient.addColorStop(0, s.color);
      gradient.addColorStop(0.5, s.color.replace(/[\d.]+\)$/, `${alpha * 0.45})`));
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, r * 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

export function SparkleTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparklesRef = useRef<Sparkle[]>([]);
  const rafRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const lastEmit = useRef(0);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const motionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const check = () => setEnabled(!motionMq.matches);
    check();
    motionMq.addEventListener('change', check);
    return () => motionMq.removeEventListener('change', check);
  }, []);

  const handleMove = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, active: true };
  }, []);

  const handleLeave = useCallback(() => {
    mouseRef.current.active = false;
  }, []);

  const handleClick = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const shapes: Sparkle['shape'][] = ['heart', 'star', 'diamond', 'circle'];
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const speed = 1.2 + Math.random() * 2.8;
      sparklesRef.current.push({
        x: cx,
        y: cy,
        size: 4 + Math.random() * 6,
        life: 0,
        maxLife: 700 + Math.random() * 500,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.8,
        color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.1,
        shape: shapes[i % shapes.length],
      });
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const weddingRoot = canvas.closest('.wedding-canvas') as HTMLElement | null;
    if (!weddingRoot) return;

    weddingRoot.addEventListener('mousemove', handleMove);
    weddingRoot.addEventListener('mouseleave', handleLeave);
    weddingRoot.addEventListener('click', handleClick);

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

    function frame(time: number) {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, width, height);

      if (mouseRef.current.active && time - lastEmit.current > 36) {
        lastEmit.current = time;
        const shapes: Sparkle['shape'][] = ['circle', 'star', 'diamond', 'heart'];
        for (let i = 0; i < 3; i++) {
          sparklesRef.current.push({
            x: mouseRef.current.x + (Math.random() - 0.5) * 22,
            y: mouseRef.current.y + (Math.random() - 0.5) * 22,
            size: 2.5 + Math.random() * 5,
            life: 0,
            maxLife: 550 + Math.random() * 650,
            vx: (Math.random() - 0.5) * 1.4,
            vy: -0.4 - Math.random() * 1.3,
            color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)],
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.08,
            shape: shapes[Math.floor(Math.random() * shapes.length)],
          });
        }
        if (sparklesRef.current.length > 120) {
          sparklesRef.current = sparklesRef.current.slice(-120);
        }
      }

      sparklesRef.current = sparklesRef.current.filter(s => {
        s.life += 16;
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.02;
        s.rotation += s.rotSpeed;
        if (s.life >= s.maxLife) return false;
        drawSparkle(ctx, s);
        return true;
      });

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      weddingRoot.removeEventListener('mousemove', handleMove);
      weddingRoot.removeEventListener('mouseleave', handleLeave);
      weddingRoot.removeEventListener('click', handleClick);
    };
  }, [enabled, handleMove, handleLeave, handleClick]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="sparkle-trail"
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 6,
      }}
    />
  );
}
