'use client';
import {useEffect,useRef,useState} from 'react';

/**
 * Hiệu ứng Ánh Sáng Pha Lê Hoàng Gia, Sao Kim Cương 4 Cánh & Lá Vàng 24K Lấp Lánh:
 * Thay thế hoàn toàn các sợi lụa mảnh bằng chùm nắng vàng dịu, sao bốn cánh lấp lánh
 * và vảy nhũ vàng/ngọc trai xoay 3D sang trọng, giữ độ trong trẻo cho chữ tiếng Việt.
 */

interface ChandelierGem {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  spinSpeed: number;
  flipPhase: number;
  flipSpeed: number;
  twinklePhase: number;
  twinkleSpeed: number;
  kind: 'starburst' | 'goldleaf' | 'pearl';
  tone: 'champagne' | 'pearl' | 'blush';
}

function createGem(w: number, h: number, scatter = false): ChandelierGem {
  const roll = Math.random();
  const kind: ChandelierGem['kind'] = roll < 0.44 ? 'starburst' : roll < 0.8 ? 'goldleaf' : 'pearl';
  const tones: ChandelierGem['tone'][] = ['champagne', 'champagne', 'pearl', 'blush'];
  return {
    x: Math.random() * w,
    y: scatter ? Math.random() * h : -28 - Math.random() * 90,
    vx: (Math.random() - 0.5) * 0.28,
    vy: kind === 'starburst' ? 0.12 + Math.random() * 0.24 : 0.34 + Math.random() * 0.46,
    size: kind === 'starburst' ? 5.5 + Math.random() * 6.5 : 3.5 + Math.random() * 4.2,
    rotation: Math.random() * Math.PI * 2,
    spinSpeed: (Math.random() - 0.5) * 0.012,
    flipPhase: Math.random() * Math.PI * 2,
    flipSpeed: 0.0022 + Math.random() * 0.0028,
    twinklePhase: Math.random() * Math.PI * 2,
    twinkleSpeed: 0.0024 + Math.random() * 0.0032,
    kind,
    tone: tones[Math.floor(Math.random() * tones.length)],
  };
}

function drawSunbeams(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  const breathe = 0.72 + 0.28 * Math.sin(time * 0.0007);
  const beams = [
    { x0: w * 0.08, x1: w * 0.42, spread: w * 0.22, alpha: 0.075 * breathe },
    { x0: w * 0.92, x1: w * 0.58, spread: w * 0.2, alpha: 0.065 * breathe },
  ];
  for (const beam of beams) {
    ctx.save();
    const grad = ctx.createLinearGradient(beam.x0, 0, beam.x1, h * 0.72);
    grad.addColorStop(0, `rgba(255, 244, 214, ${beam.alpha})`);
    grad.addColorStop(0.55, `rgba(248, 228, 184, ${beam.alpha * 0.45})`);
    grad.addColorStop(1, 'rgba(255, 244, 214, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(beam.x0 - beam.spread * 0.35, 0);
    ctx.lineTo(beam.x0 + beam.spread * 0.35, 0);
    ctx.lineTo(beam.x1 + beam.spread, h * 0.75);
    ctx.lineTo(beam.x1 - beam.spread, h * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawFourPointStar(ctx: CanvasRenderingContext2D, radius: number) {
  const inner = radius * 0.22;
  ctx.beginPath();
  ctx.moveTo(0, -radius);
  ctx.quadraticCurveTo(inner, -inner, radius, 0);
  ctx.quadraticCurveTo(inner, inner, 0, radius);
  ctx.quadraticCurveTo(-inner, inner, -radius, 0);
  ctx.quadraticCurveTo(-inner, -inner, 0, -radius);
  ctx.closePath();
}

function drawGem(ctx: CanvasRenderingContext2D, gem: ChandelierGem, time: number) {
  const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * gem.twinkleSpeed + gem.twinklePhase));
  ctx.save();
  ctx.translate(gem.x, gem.y);

  if (gem.kind === 'starburst') {
    const r = gem.size * (0.82 + 0.26 * twinkle);
    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.3);
    if (gem.tone === 'blush') {
      halo.addColorStop(0, `rgba(255, 225, 232, ${0.24 * twinkle})`);
      halo.addColorStop(1, 'rgba(255, 225, 232, 0)');
    } else {
      halo.addColorStop(0, `rgba(255, 238, 192, ${0.26 * twinkle})`);
      halo.addColorStop(1, 'rgba(255, 238, 192, 0)');
    }
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(gem.rotation * 0.25);
    ctx.fillStyle =
      gem.tone === 'pearl'
        ? `rgba(255, 252, 244, ${0.28 * twinkle})`
        : gem.tone === 'blush'
          ? `rgba(252, 212, 220, ${0.26 * twinkle})`
          : `rgba(238, 200, 118, ${0.28 * twinkle})`;
    drawFourPointStar(ctx, r);
    ctx.fill();

    // Tâm kim cương sáng lấp lánh
    ctx.fillStyle = `rgba(255, 254, 248, ${0.24 * twinkle})`;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(1.1, r * 0.18), 0, Math.PI * 2);
    ctx.fill();
  } else if (gem.kind === 'goldleaf') {
    const flipX = 0.28 + 0.72 * Math.abs(Math.cos(time * gem.flipSpeed + gem.flipPhase));
    const specular = flipX > 0.92 ? 1.12 : 1;
    ctx.rotate(gem.rotation);
    ctx.scale(flipX, 1);
    const s = gem.size;
    const leafGrad = ctx.createLinearGradient(-s, -s, s, s);
    if (gem.tone === 'blush') {
      leafGrad.addColorStop(0, `rgba(252, 218, 224, ${0.19 * specular})`);
      leafGrad.addColorStop(0.5, `rgba(255, 244, 232, ${0.22 * specular})`);
      leafGrad.addColorStop(1, `rgba(232, 186, 168, ${0.17 * specular})`);
    } else {
      leafGrad.addColorStop(0, `rgba(242, 208, 134, ${0.19 * specular})`);
      leafGrad.addColorStop(0.5, `rgba(255, 248, 222, ${0.22 * specular})`);
      leafGrad.addColorStop(1, `rgba(212, 172, 94, ${0.17 * specular})`);
    }
    ctx.fillStyle = leafGrad;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(s * 0.75, -s * 0.15, 0, s);
    ctx.quadraticCurveTo(-s * 0.75, -s * 0.15, 0, -s);
    ctx.closePath();
    ctx.fill();
  } else {
    const r = gem.size * 0.72;
    const pearl = ctx.createRadialGradient(-r * 0.25, -r * 0.25, 0, 0, 0, r * 1.4);
    pearl.addColorStop(0, `rgba(255, 253, 248, ${0.24 * twinkle})`);
    pearl.addColorStop(0.6, `rgba(246, 226, 192, ${0.15 * twinkle})`);
    pearl.addColorStop(1, 'rgba(246, 226, 192, 0)');
    ctx.fillStyle = pearl;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function FallingRibbons({ count = 4, active = true }: { count?: number; active?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gemsRef = useRef<ChandelierGem[]>([]);
  const rafRef = useRef<number>(0);
  const [motionOk, setMotionOk] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setMotionOk(!mq.matches);
    const handler = (e: MediaQueryListEvent) => setMotionOk(!e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const enabled = motionOk && active && count > 0;

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let width = 0;
    let height = 0;

    function resize() {
      if (!canvas || !ctx) return;
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
      const totalGems = width < 640 ? Math.max(8, count * 2) : Math.max(14, count * 4);
      if (!gemsRef.current.length && width > 0 && height > 0) {
        gemsRef.current = Array.from({ length: totalGems }, () => createGem(width, height, true));
      }
    }
    resize();

    let lastTime = 0;
    function frame(time: number) {
      if (!canvas || !ctx) return;
      const dt = lastTime ? Math.min(time - lastTime, 40) : 16;
      lastTime = time;
      ctx.clearRect(0, 0, width, height);

      drawSunbeams(ctx, width, height, time);

      for (const gem of gemsRef.current) {
        gem.x += (gem.vx + Math.sin(time * 0.0012 + gem.twinklePhase) * 0.18) * (dt / 16);
        gem.y += gem.vy * (dt / 16);
        gem.rotation += gem.spinSpeed * (dt / 16);

        if (gem.y > height + 32 || gem.x < -36 || gem.x > width + 36) {
          Object.assign(gem, createGem(width, height, false));
          continue;
        }
        drawGem(ctx, gem, time);
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
      }}
    />
  );
}
