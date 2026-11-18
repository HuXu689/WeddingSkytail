'use client';
import {useEffect,useRef,useState} from 'react';

/**
 * Hiệu ứng pháo hoa chúc mừng — bắn pháo hoa hình trái tim, liễu rủ vàng kim và sao băng.
 * Ở chế độ 'burst' (mặc định trên thiệp), vòng lặp requestAnimationFrame tự động nghỉ hoàn toàn
 * (0% CPU) ngay khi các hạt pháo tan hết và chỉ thức dậy khi có sự kiện 'wedding:fireworks'.
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
  [[255, 215, 100], [255, 180, 60], [255, 245, 200]],
  [[255, 130, 160], [235, 70, 110], [255, 210, 225]],
  [[225, 190, 130], [195, 162, 107], [255, 240, 215]],
  [[255, 160, 120], [255, 215, 150], [240, 110, 130]],
];

function createExplosion(
  x: number,
  y: number,
  palette: [number, number, number][],
  shape: Rocket['shape']
): FireworkParticle[] {
  const particles: FireworkParticle[] = [];

  if (shape === 'heart') {
    const count = 42;
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 2;
      const hx = 16 * Math.pow(Math.sin(t), 3);
      const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      const scale = 0.13 + Math.random() * 0.03;
      const color = palette[i % palette.length];
      particles.push({
        x,
        y,
        vx: hx * scale,
        vy: hy * scale,
        size: 1.9 + Math.random() * 1.4,
        life: 0,
        maxLife: 1250 + Math.random() * 450,
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

  const count = shape === 'willow' ? 50 : 38;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
    const tier = i % 3 === 0 ? 0.55 : 1;
    const speed = (1.3 + Math.random() * 2.6) * tier;
    const color = palette[Math.floor(Math.random() * palette.length)];
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 1.5 + Math.random() * 2,
      life: 0,
      maxLife: (shape === 'willow' ? 1500 : 1150) + Math.random() * 600,
      r: color[0],
      g: color[1],
      b: color[2],
      trail: [],
      gravity: shape === 'willow' ? 0.034 : 0.022,
      friction: shape === 'willow' ? 0.988 : 0.984,
      twinkle: Math.random() > 0.35,
    });
  }
  return particles;
}

export function Fireworks({
  mode = 'burst',
  active = true,
}: {
  mode?: 'burst' | 'continuous';
  active?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const runningRef = useRef(false);
  const rocketsRef = useRef<Rocket[]>([]);
  const particlesRef = useRef<FireworkParticle[]>([]);
  const lastLaunch = useRef(0);
  const [motionOk, setMotionOk] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setMotionOk(!mq.matches);
    const handler = (e: MediaQueryListEvent) => setMotionOk(!e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const enabled = motionOk && active;

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let lastTime = 0;

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
        x: width * (0.15 + Math.random() * 0.7),
        y: height * (0.85 + Math.random() * 0.12),
        vx: (Math.random() - 0.5) * 0.7,
        targetY: height * (0.14 + Math.random() * 0.36),
        speed: 3.5 + Math.random() * 1.6,
        palette,
        shape,
        trail: [],
      });
    }

    function frame(time: number) {
      if (!canvas || !ctx) return;
      const dt = lastTime ? Math.min(time - lastTime, 40) : 16;
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      if (mode === 'continuous' && time - lastLaunch.current > 4200 + Math.random() * 2600) {
        lastLaunch.current = time;
        spawnRocket();
        if (Math.random() < 0.3) {
          spawnRocket('heart');
          const twin = rocketsRef.current[rocketsRef.current.length - 1];
          if (twin) twin.y += 42;
        }
      }

      rocketsRef.current = rocketsRef.current.filter(r => {
        r.trail.push({ x: r.x, y: r.y });
        if (r.trail.length > 9) r.trail.shift();

        r.y -= r.speed * (dt / 16);
        r.x += r.vx * (dt / 16);

        for (let i = 0; i < r.trail.length; i++) {
          const t = r.trail[i];
          const alpha = ((i + 1) / r.trail.length) * 0.5;
          ctx.fillStyle = `rgba(255,220,150,${alpha})`;
          ctx.beginPath();
          ctx.arc(t.x, t.y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        const headColor = r.palette[0];
        ctx.fillStyle = `rgb(${headColor[0]},${headColor[1]},${headColor[2]})`;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 2.4, 0, Math.PI * 2);
        ctx.fill();

        if (r.y <= r.targetY) {
          particlesRef.current.push(...createExplosion(r.x, r.y, r.palette, r.shape));
          if (particlesRef.current.length > 220) {
            particlesRef.current = particlesRef.current.slice(-220);
          }
          return false;
        }
        return true;
      });

      particlesRef.current = particlesRef.current.filter(p => {
        p.life += dt;
        if (p.life >= p.maxLife) return false;

        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 5) p.trail.shift();

        p.vx *= p.friction;
        p.vy *= p.friction;
        p.vy += p.gravity * (dt / 16);
        p.x += p.vx * (dt / 16);
        p.y += p.vy * (dt / 16);

        const progress = p.life / p.maxLife;
        const flicker = p.twinkle ? 0.65 + 0.35 * Math.sin(time * 0.025 + p.x) : 1;
        const alpha = Math.max(0, (1 - progress) * flicker * 0.68);

        for (let i = 0; i < p.trail.length; i++) {
          const t = p.trail[i];
          const trailAlpha = ((i + 1) / p.trail.length) * alpha * 0.32;
          ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${trailAlpha})`;
          ctx.beginPath();
          ctx.arc(t.x, t.y, p.size * 0.52, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha * 0.25})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - progress * 0.35), 0, Math.PI * 2);
        ctx.fill();

        return true;
      });

      if (mode === 'burst' && rocketsRef.current.length === 0 && particlesRef.current.length === 0) {
        ctx.clearRect(0, 0, width, height);
        runningRef.current = false;
        return;
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    function ensureRunning() {
      if (runningRef.current || document.hidden) return;
      runningRef.current = true;
      lastTime = 0;
      rafRef.current = requestAnimationFrame(frame);
    }

    function launchSalvo(count = 3) {
      resize();
      for (let i = 0; i < count; i++) {
        spawnRocket(i === 0 ? 'heart' : undefined);
        const r = rocketsRef.current[rocketsRef.current.length - 1];
        if (r) r.y += i * 38;
      }
      ensureRunning();
    }

    if (mode === 'continuous') launchSalvo(3);

    const onCustomBurst = () => launchSalvo(4);
    window.addEventListener('wedding:fireworks', onCustomBurst);

    const onVisibility = () => {
      cancelAnimationFrame(rafRef.current);
      runningRef.current = false;
      if (!document.hidden && (mode === 'continuous' || rocketsRef.current.length > 0 || particlesRef.current.length > 0)) {
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
