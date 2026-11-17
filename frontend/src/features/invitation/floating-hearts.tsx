'use client';
import {useEffect,useRef,useState} from 'react';

/**
 * Hiệu ứng trái tim 3D, tim đôi và bong bóng tình yêu bay lên khắp thiệp.
 * Đã khắc phục lỗi thiếu clearRect và hỗ trợ sự kiện 'wedding:hearts' khi khách thả tim.
 */

interface FloatingHeart {
  x: number;
  y: number;
  size: number;
  speed: number;
  swayAmp: number;
  swayFreq: number;
  rotation: number;
  rotSpeed: number;
  opacity: number;
  startTime: number;
  color: string;
  variant: 'glossy' | 'double' | 'sparkle';
}

const HEART_COLORS = [
  'rgba(218, 105, 125, 0.55)',
  'rgba(195, 162, 107, 0.5)',
  'rgba(235, 145, 160, 0.55)',
  'rgba(214, 170, 135, 0.5)',
  'rgba(185, 75, 95, 0.45)',
  'rgba(242, 185, 195, 0.6)',
];

function newHeart(w: number, h: number, now: number, burst = false): FloatingHeart {
  const variants: FloatingHeart['variant'][] = ['glossy', 'double', 'sparkle', 'glossy'];
  return {
    x: 24 + Math.random() * Math.max(20, w - 48),
    y: h + (burst ? Math.random() * 40 : 10 + Math.random() * 120),
    size: (burst ? 12 : 9) + Math.random() * 18,
    speed: (burst ? 1.1 : 0.45) + Math.random() * 0.75,
    swayAmp: 14 + Math.random() * 32,
    swayFreq: 0.002 + Math.random() * 0.003,
    rotation: (Math.random() - 0.5) * 28,
    rotSpeed: (Math.random() - 0.5) * 0.35,
    opacity: (burst ? 0.55 : 0.28) + Math.random() * 0.4,
    startTime: now,
    color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)],
    variant: variants[Math.floor(Math.random() * variants.length)],
  };
}

function drawHeartPath(ctx: CanvasRenderingContext2D, s: number) {
  ctx.beginPath();
  ctx.moveTo(0, s * 0.32);
  ctx.bezierCurveTo(-s * 0.58, -s * 0.15, -s * 0.58, -s * 0.58, 0, -s * 0.26);
  ctx.bezierCurveTo(s * 0.58, -s * 0.58, s * 0.58, -s * 0.15, 0, s * 0.32);
  ctx.closePath();
}

function drawHeart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  alpha: number,
  rotation: number,
  variant: FloatingHeart['variant']
) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;

  drawHeartPath(ctx, size);
  ctx.fill();

  // Điểm nhấn ánh sáng 3D trên trái tim
  ctx.fillStyle = 'rgba(255, 250, 245, 0.45)';
  ctx.beginPath();
  ctx.ellipse(-size * 0.18, -size * 0.22, size * 0.1, size * 0.05, -0.5, 0, Math.PI * 2);
  ctx.fill();

  if (variant === 'double') {
    ctx.translate(size * 0.42, -size * 0.22);
    ctx.rotate(0.25);
    ctx.strokeStyle = 'rgba(255, 235, 190, 0.75)';
    ctx.lineWidth = 1.2;
    drawHeartPath(ctx, size * 0.62);
    ctx.stroke();
  } else if (variant === 'sparkle') {
    ctx.fillStyle = 'rgba(255, 240, 195, 0.8)';
    ctx.beginPath();
    ctx.arc(0, -size * 0.52, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function FloatingHearts({ count = 24 }: { count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heartsRef = useRef<FloatingHeart[]>([]);
  const rafRef = useRef(0);
  const [enabled, setEnabled] = useState(false);

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

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = bounds.width;
      height = bounds.height;
      const targetW = Math.round(width * ratio);
      const targetH = Math.round(height * ratio);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      }
    };
    resize();

    const now = performance.now();
    heartsRef.current = Array.from({ length: count }, (_, index) => {
      const heart = newHeart(width, height, now - index * 260);
      heart.y = Math.random() * height;
      return heart;
    });

    const onHeartBurst = () => {
      const burstTime = performance.now();
      for (let i = 0; i < 16; i++) {
        heartsRef.current.push(newHeart(width, height, burstTime, true));
      }
      if (heartsRef.current.length > count + 40) {
        heartsRef.current = heartsRef.current.slice(-(count + 40));
      }
    };
    window.addEventListener('wedding:hearts', onHeartBurst);

    function frame(time: number) {
      ctx!.clearRect(0, 0, width, height);
      for (let i = 0; i < heartsRef.current.length; i++) {
        const heart = heartsRef.current[i];
        const elapsed = Math.max(0, time - heart.startTime);
        const x = heart.x + Math.sin(elapsed * heart.swayFreq + i) * heart.swayAmp;
        const y = heart.y - elapsed * heart.speed * 0.036;

        if (y < -40) {
          if (i >= count) {
            heartsRef.current.splice(i, 1);
            i--;
            continue;
          }
          heartsRef.current[i] = newHeart(width, height, time);
          continue;
        }

        const fadeTop = Math.max(0, Math.min(1, y / (height * 0.15)));
        const fadeBottom = Math.max(0, Math.min(1, (height + 40 - y) / 80));
        drawHeart(
          ctx!,
          x,
          y,
          heart.size,
          heart.color,
          heart.opacity * fadeTop * fadeBottom,
          heart.rotation + elapsed * heart.rotSpeed * 0.02,
          heart.variant
        );
      }
      rafRef.current = requestAnimationFrame(frame);
    }

    const onVisibility = () => {
      cancelAnimationFrame(rafRef.current);
      if (!document.hidden) rafRef.current = requestAnimationFrame(frame);
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', resize);
    if (!document.hidden) rafRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', resize);
      window.removeEventListener('wedding:hearts', onHeartBurst);
    };
  }, [enabled, count]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="floating-hearts"
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
