'use client';
import {useEffect,useRef,useState} from 'react';

/**
 * Mưa hoa hồng, hoa anh đào 5 cánh, trái tim và sao vàng rơi lộng lẫy.
 * Hỗ trợ sự kiện 'wedding:petals' để tung thêm mưa hoa khi người dùng bấm nút.
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
  'rgba(242, 182, 194, 0.72)', // Hồng phấn sakura
  'rgba(225, 130, 148, 0.62)', // Hồng cánh sen
  'rgba(195, 162, 107, 0.62)', // Vàng champagne
  'rgba(248, 215, 198, 0.72)', // Hồng kem
  'rgba(255, 232, 200, 0.68)', // Ánh kim kem
  'rgba(198, 92, 108, 0.52)',  // Đỏ hồng trầm
  'rgba(235, 195, 145, 0.65)', // Vàng cát
];

function makePetal(w: number, h: number, scatter = false): Petal {
  const types: Petal['type'][] = ['petal', 'sakura', 'rose', 'petal', 'sakura', 'heart', 'star', 'sparkle'];
  const type = types[Math.floor(Math.random() * types.length)];
  return {
    x: Math.random() * w,
    y: scatter ? Math.random() * h : -24 - Math.random() * 100,
    size: type === 'sparkle' ? 3 + Math.random() * 4 : 8 + Math.random() * 14,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 2.2,
    flipPhase: Math.random() * Math.PI * 2,
    flipSpeed: 0.002 + Math.random() * 0.003,
    fallSpeed: 0.42 + Math.random() * 0.75,
    swayAmplitude: 22 + Math.random() * 46,
    swaySpeed: 0.0012 + Math.random() * 0.002,
    opacity: 0.42 + Math.random() * 0.45,
    type,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    delay: scatter ? 0 : Math.random() * 1800,
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
  ctx.fillStyle = p.color;

  if (p.type === 'petal' || p.type === 'rose') {
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.bezierCurveTo(s * 0.85, -s * 0.55, s * 0.7, s * 0.4, 0, s);
    ctx.bezierCurveTo(-s * 0.7, s * 0.4, -s * 0.85, -s * 0.55, 0, -s);
    ctx.fill();
    // Đường gân sáng mềm trên cánh hoa
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.65);
    ctx.quadraticCurveTo(s * 0.15, 0, 0, s * 0.65);
    ctx.stroke();
  } else if (p.type === 'sakura') {
    // Cánh hoa anh đào có khía chữ V ở đầu
    ctx.beginPath();
    ctx.moveTo(0, s * 0.9);
    ctx.bezierCurveTo(-s * 0.85, s * 0.3, -s * 0.75, -s * 0.65, -s * 0.22, -s * 0.95);
    ctx.lineTo(0, -s * 0.68);
    ctx.lineTo(s * 0.22, -s * 0.95);
    ctx.bezierCurveTo(s * 0.75, -s * 0.65, s * 0.85, s * 0.3, 0, s * 0.9);
    ctx.closePath();
    ctx.fill();
  } else if (p.type === 'heart') {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.35);
    ctx.bezierCurveTo(-s * 0.55, -s * 0.1, -s * 0.55, -s * 0.55, 0, -s * 0.22);
    ctx.bezierCurveTo(s * 0.55, -s * 0.55, s * 0.55, -s * 0.1, 0, s * 0.35);
    ctx.fill();
  } else if (p.type === 'star') {
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i * 90 * Math.PI) / 180;
      const b = ((i * 90 + 45) * Math.PI) / 180;
      ctx.lineTo(Math.cos(a) * s * 0.65, Math.sin(a) * s * 0.65);
      ctx.lineTo(Math.cos(b) * s * 0.18, Math.sin(b) * s * 0.18);
    }
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.globalAlpha = alpha * (Math.sin(time * 0.008 + p.phase) * 0.5 + 0.5);
    ctx.beginPath();
    ctx.arc(0, 0, s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function PetalShower({ intensity = 'normal' }: { intensity?: 'light' | 'normal' | 'dense' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const petalsRef = useRef<Petal[]>([]);
  const rafRef = useRef(0);
  const runningRef = useRef(false);
  const [enabled, setEnabled] = useState(false);
  const counts = { light: 30, normal: 52, dense: 80 };
  const count = counts[intensity];

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    setEnabled(!motion.matches);
    const update = (event: MediaQueryListEvent) => setEnabled(!event.matches);
    motion.addEventListener('change', update);
    return () => motion.removeEventListener('change', update);
  }, []);

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
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = Math.round(width * ratio);
      const targetH = Math.round(height * ratio);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      }
      if (!petalsRef.current.length && width > 0 && height > 0) {
        petalsRef.current = Array.from({ length: count }, () => makePetal(width, height, true));
      }
    };

    const onPetalBurst = () => {
      const now = performance.now();
      for (let i = 0; i < 28; i++) {
        const p = makePetal(width, height, false);
        p.delay = now + i * 35;
        p.fallSpeed *= 1.4;
        petalsRef.current.push(p);
      }
      if (petalsRef.current.length > count + 45) {
        petalsRef.current = petalsRef.current.slice(-(count + 45));
      }
    };
    window.addEventListener('wedding:petals', onPetalBurst);

    const frame = (time: number) => {
      const dt = lastTime ? Math.min(time - lastTime, 40) : 16;
      lastTime = time;
      ctx.clearRect(0, 0, width, height);

      if (!petalsRef.current.length && width > 0) {
        petalsRef.current = Array.from({ length: count }, () => makePetal(width, height, true));
      }

      for (let i = 0; i < petalsRef.current.length; i++) {
        const petal = petalsRef.current[i];
        if (time >= petal.delay) {
          petal.y += petal.fallSpeed * (dt * 0.065);
        }
        draw(ctx, petal, time);

        if (petal.y > height + 36) {
          if (i >= count) {
            petalsRef.current.splice(i, 1);
            i--;
            continue;
          }
          Object.assign(petal, makePetal(width, height, false));
          petal.delay = time;
        }
      }
      rafRef.current = requestAnimationFrame(frame);
    };

    const start = () => {
      if (runningRef.current || document.hidden) return;
      runningRef.current = true;
      lastTime = 0;
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
