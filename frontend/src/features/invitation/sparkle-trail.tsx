'use client';
import {useEffect,useRef,useState} from 'react';

/**
 * Hiệu ứng lấp lánh theo con trỏ chuột & bung hoa/trái tim nhẹ khi chạm vào thiệp.
 * Tự động ngủ đông hoàn toàn (dừng requestAnimationFrame) khi không có hạt đang hiển thị.
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
  'rgba(255,215,140,.82)',
  'rgba(255,165,185,.78)',
  'rgba(195,162,107,.78)',
  'rgba(242,200,210,.8)',
  'rgba(255,245,220,.86)',
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
      gradient.addColorStop(0.5, s.color.replace(/[\d.]+\)$/, `${alpha * 0.4})`));
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

export function SparkleTrail({ active = true }: { active?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparklesRef = useRef<Sparkle[]>([]);
  const rafRef = useRef<number>(0);
  const runningRef = useRef(false);
  const lastEmit = useRef(0);
  const [motionOk, setMotionOk] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const motionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const check = () => setMotionOk(!motionMq.matches);
    check();
    motionMq.addEventListener('change', check);
    return () => motionMq.removeEventListener('change', check);
  }, []);

  const enabled = motionOk && active;

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const weddingRoot = (canvas.closest('.wedding-canvas') ??
      (canvas.closest('.entry-ambient-stage') ? document.body : null)) as HTMLElement | null;
    if (!weddingRoot) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let lastTime = 0;

    function resize() {
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, rect.width < 640 ? 1.5 : 2);
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
      const dt = lastTime ? Math.min(time - lastTime, 40) : 16;
      lastTime = time;
      ctx.clearRect(0, 0, width, height);

      sparklesRef.current = sparklesRef.current.filter(s => {
        s.life += dt;
        s.x += s.vx * (dt / 16);
        s.y += s.vy * (dt / 16);
        s.vy += 0.02 * (dt / 16);
        s.rotation += s.rotSpeed * (dt / 16);
        if (s.life >= s.maxLife) return false;
        drawSparkle(ctx, s);
        return true;
      });

      if (sparklesRef.current.length === 0) {
        runningRef.current = false;
        return;
      }
      rafRef.current = requestAnimationFrame(frame);
    }

    function wakeUp() {
      if (runningRef.current || document.hidden) return;
      runningRef.current = true;
      lastTime = 0;
      rafRef.current = requestAnimationFrame(frame);
    }

    function handleMove(e: MouseEvent) {
      if (!canvas) return;
      const now = performance.now();
      if (now - lastEmit.current < 52) return;
      lastEmit.current = now;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const shapes: Sparkle['shape'][] = ['circle', 'star', 'diamond', 'heart'];
      for (let i = 0; i < 2; i++) {
        sparklesRef.current.push({
          x: mx + (Math.random() - 0.5) * 18,
          y: my + (Math.random() - 0.5) * 18,
          size: 2.2 + Math.random() * 4,
          life: 0,
          maxLife: 500 + Math.random() * 520,
          vx: (Math.random() - 0.5) * 1.1,
          vy: -0.35 - Math.random() * 1,
          color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)],
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.08,
          shape: shapes[Math.floor(Math.random() * shapes.length)],
        });
      }
      if (sparklesRef.current.length > 80) {
        sparklesRef.current = sparklesRef.current.slice(-80);
      }
      wakeUp();
    }

    function handleClick(e: MouseEvent) {
      if (!canvas) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, dialog')) return;
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const shapes: Sparkle['shape'][] = ['heart', 'star', 'diamond', 'circle'];
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
        const speed = 1 + Math.random() * 2.2;
        sparklesRef.current.push({
          x: cx,
          y: cy,
          size: 3.5 + Math.random() * 4.5,
          life: 0,
          maxLife: 620 + Math.random() * 420,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.6,
          color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)],
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.1,
          shape: shapes[i % shapes.length],
        });
      }
      wakeUp();
    }

    function onVisibility() {
      cancelAnimationFrame(rafRef.current);
      runningRef.current = false;
      if (!document.hidden && sparklesRef.current.length > 0) wakeUp();
    }

    weddingRoot.addEventListener('mousemove', handleMove, { passive: true });
    weddingRoot.addEventListener('click', handleClick);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      runningRef.current = false;
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', resize);
      weddingRoot.removeEventListener('mousemove', handleMove);
      weddingRoot.removeEventListener('click', handleClick);
    };
  }, [enabled]);

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
