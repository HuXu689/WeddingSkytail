'use client';
import {useEffect,useRef,useState} from 'react';

/**
 * Hiệu ứng trái tim chúc phúc bay lên khi mở thiệp và khi khách thả tim ('wedding:hearts').
 * Tự động ngủ đông dừng requestAnimationFrame khi không còn hạt trên màn hình (khi count === 0).
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
  'rgba(218, 105, 125, 0.5)',
  'rgba(195, 162, 107, 0.46)',
  'rgba(235, 145, 160, 0.5)',
  'rgba(214, 170, 135, 0.45)',
  'rgba(185, 75, 95, 0.42)',
];

function newHeart(w: number, h: number, now: number, burst = false): FloatingHeart {
  const variants: FloatingHeart['variant'][] = ['glossy', 'double', 'sparkle', 'glossy'];
  return {
    x: 24 + Math.random() * Math.max(20, w - 48),
    y: h + (burst ? Math.random() * 45 : 10 + Math.random() * 120),
    size: (burst ? 11 : 8) + Math.random() * 14,
    speed: (burst ? 1.05 : 0.42) + Math.random() * 0.65,
    swayAmp: 12 + Math.random() * 26,
    swayFreq: 0.002 + Math.random() * 0.0026,
    rotation: (Math.random() - 0.5) * 24,
    rotSpeed: (Math.random() - 0.5) * 0.3,
    opacity: (burst ? 0.5 : 0.24) + Math.random() * 0.32,
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

  ctx.fillStyle = 'rgba(255, 250, 245, 0.42)';
  ctx.beginPath();
  ctx.ellipse(-size * 0.18, -size * 0.22, size * 0.1, size * 0.05, -0.5, 0, Math.PI * 2);
  ctx.fill();

  if (variant === 'double') {
    ctx.translate(size * 0.42, -size * 0.22);
    ctx.rotate(0.25);
    ctx.strokeStyle = 'rgba(255, 235, 190, 0.72)';
    ctx.lineWidth = 1.1;
    drawHeartPath(ctx, size * 0.62);
    ctx.stroke();
  } else if (variant === 'sparkle') {
    ctx.fillStyle = 'rgba(255, 240, 195, 0.75)';
    ctx.beginPath();
    ctx.arc(0, -size * 0.52, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function FloatingHearts({
  count = 0,
  active = true,
}: {
  count?: number;
  active?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heartsRef = useRef<FloatingHeart[]>([]);
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

  const enabled = motionOk && active;

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

      if (count === 0 && heartsRef.current.length === 0) {
        ctx!.clearRect(0, 0, width, height);
        runningRef.current = false;
        return;
      }
      rafRef.current = requestAnimationFrame(frame);
    }

    function ensureRunning() {
      if (runningRef.current || document.hidden) return;
      runningRef.current = true;
      rafRef.current = requestAnimationFrame(frame);
    }

    const now = performance.now();
    const initialBurst = count > 0 ? count : 8;
    heartsRef.current = Array.from({ length: initialBurst }, (_, index) => {
      const heart = newHeart(width, height, now + index * 90, count === 0);
      if (count > 0) heart.y = Math.random() * height;
      return heart;
    });
    ensureRunning();

    const onHeartBurst = () => {
      resize();
      const burstTime = performance.now();
      for (let i = 0; i < 14; i++) {
        heartsRef.current.push(newHeart(width, height, burstTime + i * 35, true));
      }
      if (heartsRef.current.length > count + 36) {
        heartsRef.current = heartsRef.current.slice(-(count + 36));
      }
      ensureRunning();
    };
    window.addEventListener('wedding:hearts', onHeartBurst);

    const onVisibility = () => {
      cancelAnimationFrame(rafRef.current);
      runningRef.current = false;
      if (!document.hidden && (count > 0 || heartsRef.current.length > 0)) {
        ensureRunning();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      runningRef.current = false;
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
