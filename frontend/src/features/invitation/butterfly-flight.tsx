'use client';
import {useEffect,useRef,useState} from 'react';

/**
 * Hiệu ứng đàn bướm vàng kim & hồng phấn đập cánh 3D bay lượn mềm mại khắp thiệp.
 */

interface Butterfly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  flapSpeed: number;
  flapPhase: number;
  waveSpeed: number;
  waveAmp: number;
  palette: { wing: string; border: string; glow: string };
}

const BUTTERFLY_PALETTES = [
  { wing: 'rgba(254, 224, 232, 0.3)', border: 'rgba(232, 198, 126, 0.34)', glow: 'rgba(255, 236, 188, 0.2)' },
  { wing: 'rgba(255, 242, 208, 0.32)', border: 'rgba(224, 188, 108, 0.34)', glow: 'rgba(255, 232, 168, 0.22)' },
  { wing: 'rgba(252, 218, 226, 0.28)', border: 'rgba(228, 178, 188, 0.32)', glow: 'rgba(252, 224, 232, 0.2)' },
];

function createButterfly(w: number, h: number): Butterfly {
  const fromLeft = Math.random() > 0.5;
  return {
    x: fromLeft ? -30 - Math.random() * 60 : w + 30 + Math.random() * 60,
    y: h * (0.15 + Math.random() * 0.75),
    vx: (fromLeft ? 1 : -1) * (0.55 + Math.random() * 0.65),
    vy: -0.25 - Math.random() * 0.35,
    size: 11 + Math.random() * 8,
    flapSpeed: 0.011 + Math.random() * 0.006,
    flapPhase: Math.random() * Math.PI * 2,
    waveSpeed: 0.002 + Math.random() * 0.002,
    waveAmp: 0.8 + Math.random() * 1.1,
    palette: BUTTERFLY_PALETTES[Math.floor(Math.random() * BUTTERFLY_PALETTES.length)],
  };
}

function drawButterfly(ctx: CanvasRenderingContext2D, b: Butterfly, time: number) {
  const flap = 0.22 + 0.78 * Math.abs(Math.sin(time * b.flapSpeed + b.flapPhase));
  const heading = Math.atan2(b.vy, b.vx) + Math.PI / 2;
  const s = b.size;

  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(heading * 0.35);

  // Quầng sáng thần tiên quanh cánh bướm
  const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 1.8);
  aura.addColorStop(0, b.palette.glow);
  aura.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, s * 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Hai cánh bướm co giãn theo nhịp đập 3D
  ctx.scale(flap, 1);
  ctx.fillStyle = b.palette.wing;
  ctx.strokeStyle = b.palette.border;
  ctx.lineWidth = 1.1;

  // Cánh trên trái & phải
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(dir * s * 0.9, -s * 0.95, dir * s * 1.35, -s * 0.15, 0, s * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cánh dưới trái & phải
    ctx.beginPath();
    ctx.moveTo(0, s * 0.1);
    ctx.bezierCurveTo(dir * s * 0.95, s * 0.25, dir * s * 0.75, s * 0.95, 0, s * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Thân bướm vàng kim
  ctx.fillStyle = b.palette.border;
  ctx.beginPath();
  ctx.ellipse(0, s * 0.12, 1.3, s * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function ButterflyFlight({ count = 2, active = true }: { count?: number; active?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const butterfliesRef = useRef<Butterfly[]>([]);
  const rafRef = useRef(0);
  const [motionOk, setMotionOk] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    setMotionOk(!motion.matches);
    const update = (e: MediaQueryListEvent) => setMotionOk(!e.matches);
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
      if (!butterfliesRef.current.length && width > 0) {
        butterfliesRef.current = Array.from({ length: count }, () => {
          const b = createButterfly(width, height);
          b.x = Math.random() * width;
          return b;
        });
      }
    };
    resize();

    let lastTime = 0;
    const frame = (time: number) => {
      const dt = lastTime ? Math.min(time - lastTime, 40) : 16;
      lastTime = time;
      ctx.clearRect(0, 0, width, height);

      for (const b of butterfliesRef.current) {
        b.x += b.vx * (dt / 16);
        b.y += (b.vy + Math.sin(time * b.waveSpeed + b.flapPhase) * b.waveAmp * 0.45) * (dt / 16);

        if (b.x < -80 || b.x > width + 80 || b.y < -80 || b.y > height + 80) {
          Object.assign(b, createButterfly(width, height));
          continue;
        }
        drawButterfly(ctx, b, time);
      }

      rafRef.current = requestAnimationFrame(frame);
    };

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
      className="butterfly-flight"
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
