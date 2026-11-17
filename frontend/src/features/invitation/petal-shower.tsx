'use client';
import {useEffect,useRef,useState} from 'react';
import { FALLBACK_ALBUM } from './media-fallback';
void FALLBACK_ALBUM;

/**
 * Mưa cánh hoa hồng & hoa anh đào rơi dịu nhẹ.
 * Hỗ trợ chế độ burst-only (intensity='burst') tự dừng RAF khi hết cánh hoa rơi,
 * và luôn phản hồi sự kiện 'wedding:petals'.
 */

type Petal = {
  x: number;
  y: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  flipPhase: number;
  flipSpeed: number;
  fallSpeed: number;
  swayAmplitude: number;
  swaySpeed: number;
  opacity: number;
  type: 'petal' | 'sakura' | 'heart' | 'star' | 'sparkle' | 'rose';
  color: string;
  delay: number;
  phase: number;
};

const COLORS = [
  'rgba(248, 198, 210, 0.72)',
  'rgba(244, 182, 198, 0.68)',
  'rgba(238, 208, 152, 0.66)',
  'rgba(252, 222, 208, 0.74)',
  'rgba(255, 238, 208, 0.72)',
  'rgba(240, 172, 188, 0.64)',
];

function makePetal(w: number, h: number, scatter = false): Petal {
  const types: Petal['type'][] = ['petal', 'sakura', 'rose', 'petal', 'sakura', 'sparkle'];
  const type = types[Math.floor(Math.random() * types.length)];
  return {
    x: Math.random() * w,
    y: scatter ? Math.random() * h : -24 - Math.random() * 90,
    size: type === 'sparkle' ? 3 + Math.random() * 3.5 : 8 + Math.random() * 11,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 1.8,
    flipPhase: Math.random() * Math.PI * 2,
    flipSpeed: 0.0018 + Math.random() * 0.0025,
    fallSpeed: 0.36 + Math.random() * 0.62,
    swayAmplitude: 18 + Math.random() * 38,
    swaySpeed: 0.0011 + Math.random() * 0.0018,
    opacity: 0.18 + Math.random() * 0.12,
    type,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    delay: scatter ? 0 : Math.random() * 1400,
    phase: Math.random() * Math.PI * 2,
  };
}

function draw(ctx: CanvasRenderingContext2D, p: Petal, time: number) {
  const elapsed = time - p.delay;
  if (elapsed < 0) return;
  const sway = Math.sin(time * p.swaySpeed + p.phase) * p.swayAmplitude;
  const x = p.x + sway;
  const y = p.y;
  const angle = ((p.rotation + elapsed * p.rotationSpeed * 0.04) * Math.PI) / 180;
  const flip = 0.45 + 0.55 * Math.abs(Math.cos(time * p.flipSpeed + p.flipPhase));
  const alpha = p.opacity * Math.min(1, elapsed / 600);
  const s = p.size;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(1, flip);
  ctx.globalAlpha = alpha;

  const grad = ctx.createLinearGradient(0, -s, 0, s);
  grad.addColorStop(0, p.color);
  grad.addColorStop(0.65, p.color);
  grad.addColorStop(1, 'rgba(255, 252, 246, 0.85)');
  ctx.fillStyle = grad;

  if (p.type === 'petal' || p.type === 'rose') {
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.bezierCurveTo(s * 0.92, -s * 0.52, s * 0.76, s * 0.44, 0, s);
    ctx.bezierCurveTo(-s * 0.76, s * 0.44, -s * 0.92, -s * 0.52, 0, -s);
    ctx.fill();
  } else if (p.type === 'sakura') {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.9);
    ctx.bezierCurveTo(-s * 0.88, s * 0.3, -s * 0.78, -s * 0.65, -s * 0.22, -s * 0.95);
    ctx.lineTo(0, -s * 0.66);
    ctx.lineTo(s * 0.22, -s * 0.95);
    ctx.bezierCurveTo(s * 0.78, -s * 0.65, s * 0.88, s * 0.3, 0, s * 0.9);
    ctx.closePath();
    ctx.fill();
  } else {
    const twinkle = Math.sin(time * 0.008 + p.phase) * 0.5 + 0.5;
    ctx.globalAlpha = alpha * twinkle;
    ctx.fillStyle = 'rgba(255, 244, 204, 0.9)';
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(s * 0.2, -s * 0.2, s, 0);
    ctx.quadraticCurveTo(s * 0.2, s * 0.2, 0, s);
    ctx.quadraticCurveTo(-s * 0.2, s * 0.2, -s, 0);
    ctx.quadraticCurveTo(-s * 0.2, -s * 0.2, 0, -s);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function PetalShower({
  intensity = 'light',
  active = true,
}: {
  intensity?: 'burst' | 'light' | 'normal' | 'dense';
  active?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const petalsRef = useRef<Petal[]>([]);
  const rafRef = useRef(0);
  const runningRef = useRef(false);
  const [motionOk, setMotionOk] = useState(false);
  const counts = { burst: 0, light: 16, normal: 30, dense: 48 };
  const count = counts[intensity];

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    setMotionOk(!motion.matches);
    const update = (event: MediaQueryListEvent) => setMotionOk(!event.matches);
    motion.addEventListener('change', update);
    return () => motion.removeEventListener('change', update);
  }, []);

  const enabled = motionOk && active;

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
      const mobileCap = width > 0 && width < 640 ? Math.ceil(count * 0.5) : count;
      if (!petalsRef.current.length && mobileCap > 0 && width > 0 && height > 0) {
        petalsRef.current = Array.from({ length: mobileCap }, () => makePetal(width, height, true));
      }
    };

    const frame = (time: number) => {
      const dt = lastTime ? Math.min(time - lastTime, 40) : 16;
      lastTime = time;
      ctx.clearRect(0, 0, width, height);
      const activeLimit = width > 0 && width < 640 ? Math.ceil(count * 0.5) : count;

      if (petalsRef.current.length < activeLimit && width > 0) {
        while (petalsRef.current.length < activeLimit) {
          petalsRef.current.push(makePetal(width, height, true));
        }
      }

      for (let i = 0; i < petalsRef.current.length; i++) {
        const petal = petalsRef.current[i];
        if (time >= petal.delay) {
          petal.y += petal.fallSpeed * (dt * 0.065);
        }
        draw(ctx, petal, time);

        if (petal.y > height + 36) {
          if (i >= activeLimit) {
            petalsRef.current.splice(i, 1);
            i--;
            continue;
          }
          Object.assign(petal, makePetal(width, height, false));
          petal.delay = time;
        }
      }

      if (count === 0 && petalsRef.current.length === 0) {
        ctx.clearRect(0, 0, width, height);
        runningRef.current = false;
        return;
      }

      rafRef.current = requestAnimationFrame(frame);
    };

    const start = () => {
      if (runningRef.current || document.hidden) return;
      if (count === 0 && petalsRef.current.length === 0) return;
      runningRef.current = true;
      lastTime = 0;
      rafRef.current = requestAnimationFrame(frame);
    };

    const onPetalBurst = () => {
      resize();
      const now = performance.now();
      for (let i = 0; i < 24; i++) {
        const p = makePetal(width, height, false);
        p.delay = now + i * 32;
        p.fallSpeed *= 1.35;
        petalsRef.current.push(p);
      }
      if (petalsRef.current.length > count + 40) {
        petalsRef.current = petalsRef.current.slice(-(count + 40));
      }
      start();
    };
    window.addEventListener('wedding:petals', onPetalBurst);

    const visibility = () => {
      cancelAnimationFrame(rafRef.current);
      runningRef.current = false;
      if (!document.hidden) start();
    };

    resize();
    if (count === 0) petalsRef.current = [];
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('resize', resize);
    start();

    return () => {
      cancelAnimationFrame(rafRef.current);
      runningRef.current = false;
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('resize', resize);
      window.removeEventListener('wedding:petals', onPetalBurst);
    };
  }, [enabled, count]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="petal-shower"
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 3,
      }}
    />
  );
}
