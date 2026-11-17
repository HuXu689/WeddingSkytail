'use client';
import {useEffect,useRef,useState} from 'react';

/**
 * Hiệu ứng pháo hoa lộng lẫy — bắn pháo hoa hình trái tim, vương miện kim tuyến và sao băng.
 * Sử dụng clearRect trong suốt tuyệt đối để không làm mờ nền thiệp, hỗ trợ bắn pháo hoa
 * tự động và kích hoạt tức thì qua sự kiện 'wedding:fireworks'.
 */

interface FireworkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  r: number;
  g: number;
  b: number;
  trail: { x: number; y: number }[];
  gravity: number;
  friction: number;
  twinkle: boolean;
}

interface Rocket {
  x: number;
  y: number;
  vx: number;
  targetY: number;
  speed: number;
  palette: [number, number, number][];
  shape: 'heart' | 'willow' | 'starburst';
  trail: { x: number; y: number }[];
}

const PALETTES: [number, number, number][][] = [
  [[255, 215, 100], [255, 180, 60], [255, 245, 200]],   // Hoàng kim rực rỡ
  [[255, 130, 160], [235, 70, 110], [255, 210, 225]],   // Hồng ngọc tình yêu
  [[225, 190, 130], [195, 162, 107], [255, 240, 215]],  // Champagne quý phái
  [[255, 160, 120], [255, 215, 150], [240, 110, 130]],  // Cam đào hoàng hôn
  [[210, 160, 240], [255, 190, 230], [255, 240, 250]],  // Tím pastel mộng mơ
];

function createExplosion(
  x: number,
  y: number,
  palette: [number, number, number][],
  shape: Rocket['shape']
): FireworkParticle[] {
  const particles: FireworkParticle[] = [];

  if (shape === 'heart') {
    const count = 46;
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 2;
      // Phương trình tham số hình trái tim
      const hx = 16 * Math.pow(Math.sin(t), 3);
      const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      const scale = 0.14 + Math.random() * 0.03;
      const color = palette[i % palette.length];
      particles.push({
        x,
        y,
        vx: hx * scale,
        vy: hy * scale,
        size: 2 + Math.random() * 1.5,
        life: 0,
        maxLife: 1300 + Math.random() * 500,
        r: color[0],
        g: color[1],
        b: color[2],
        trail: [],
        gravity: 0.015,
        friction: 0.982,
        twinkle: i % 2 === 0,
      });
    }
    return particles;
  }

  const count = shape === 'willow' ? 58 : 44;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
    const tier = i % 3 === 0 ? 0.55 : 1;
    const speed = (1.4 + Math.random() * 2.8) * tier;
    const color = palette[Math.floor(Math.random() * palette.length)];
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 1.6 + Math.random() * 2.2,
      life: 0,
      maxLife: (shape === 'willow' ? 1600 : 1200) + Math.random() * 700,
      r: color[0],
      g: color[1],
      b: color[2],
      trail: [],
      gravity: shape === 'willow' ? 0.036 : 0.024,
      friction: shape === 'willow' ? 0.988 : 0.984,
      twinkle: Math.random() > 0.35,
    });
  }
  return particles;
}

export function Fireworks({ mode = 'continuous' }: { mode?: 'burst' | 'continuous' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const rocketsRef = useRef<Rocket[]>([]);
  const particlesRef = useRef<FireworkParticle[]>([]);
  const lastLaunch = useRef(0);
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

    const shapes: Rocket['shape'][] = ['heart', 'willow', 'starburst'];

    function spawnRocket(forceShape?: Rocket['shape']) {
      if (width <= 0 || height <= 0) return;
      const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
      const shape = forceShape ?? shapes[Math.floor(Math.random() * shapes.length)];
      rocketsRef.current.push({
        x: width * (0.12 + Math.random() * 0.76),
        y: height * (0.85 + Math.random() * 0.15),
        vx: (Math.random() - 0.5) * 0.8,
        targetY: height * (0.14 + Math.random() * 0.42),
        speed: 3.4 + Math.random() * 1.8,
        palette,
        shape,
        trail: [],
      });
    }

    function launchSalvo(count = 5) {
      for (let i = 0; i < count; i++) {
        spawnRocket(i === 0 ? 'heart' : undefined);
        const r = rocketsRef.current[rocketsRef.current.length - 1];
        if (r) r.y += i * 35;
      }
    }

    if (mode === 'burst') {
      launchSalvo(6);
    } else {
      launchSalvo(3);
    }

    const onCustomBurst = () => launchSalvo(6);
    window.addEventListener('wedding:fireworks', onCustomBurst);

    let lastTime = 0;
    function frame(time: number) {
      if (!canvas || !ctx) return;
      const dt = lastTime ? Math.min(time - lastTime, 40) : 16;
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      if (mode === 'continuous' && time - lastLaunch.current > 2400 + Math.random() * 2200) {
        lastLaunch.current = time;
        spawnRocket();
      }

      // Cập nhật tên lửa đang bay lên
      rocketsRef.current = rocketsRef.current.filter(r => {
        r.trail.push({ x: r.x, y: r.y });
        if (r.trail.length > 10) r.trail.shift();

        r.y -= r.speed * (dt / 16);
        r.x += r.vx * (dt / 16);

        for (let i = 0; i < r.trail.length; i++) {
          const t = r.trail[i];
          const alpha = ((i + 1) / r.trail.length) * 0.55;
          ctx.fillStyle = `rgba(255,220,150,${alpha})`;
          ctx.beginPath();
          ctx.arc(t.x, t.y, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }

        const headColor = r.palette[0];
        ctx.fillStyle = `rgb(${headColor[0]},${headColor[1]},${headColor[2]})`;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 2.6, 0, Math.PI * 2);
        ctx.fill();

        if (r.y <= r.targetY) {
          particlesRef.current.push(...createExplosion(r.x, r.y, r.palette, r.shape));
          if (particlesRef.current.length > 260) {
            particlesRef.current = particlesRef.current.slice(-260);
          }
          return false;
        }
        return true;
      });

      // Cập nhật hạt pháo hoa nổ
      particlesRef.current = particlesRef.current.filter(p => {
        p.life += dt;
        if (p.life >= p.maxLife) return false;

        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 6) p.trail.shift();

        p.vx *= p.friction;
        p.vy *= p.friction;
        p.vy += p.gravity * (dt / 16);
        p.x += p.vx * (dt / 16);
        p.y += p.vy * (dt / 16);

        const progress = p.life / p.maxLife;
        const flicker = p.twinkle ? 0.65 + 0.35 * Math.sin(time * 0.025 + p.x) : 1;
        const alpha = Math.max(0, (1 - progress) * flicker * 0.85);

        // Vẽ đuôi hạt sáng
        for (let i = 0; i < p.trail.length; i++) {
          const t = p.trail[i];
          const trailAlpha = ((i + 1) / p.trail.length) * alpha * 0.35;
          ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${trailAlpha})`;
          ctx.beginPath();
          ctx.arc(t.x, t.y, p.size * 0.55, 0, Math.PI * 2);
          ctx.fill();
        }

        // Vẽ quầng sáng mềm
        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha * 0.28})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Vẽ nhân sáng lấp lánh
        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - progress * 0.35), 0, Math.PI * 2);
        ctx.fill();

        return true;
      });

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
      window.removeEventListener('wedding:fireworks', onCustomBurst);
    };
  }, [enabled, mode]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fireworks-canvas"
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    />
  );
}
