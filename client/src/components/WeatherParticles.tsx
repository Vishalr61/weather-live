import { useEffect, useRef } from 'react';
import { weatherCodeToPrecipMode } from '../three/weatherVisuals.ts';

interface WeatherParticlesProps {
  weatherCode: number;
}

interface Particle {
  x: number;
  y: number;
  speed: number;
  drift: number;
  length: number;
  radius: number;
}

const PARTICLE_COUNT = 90;

export function WeatherParticles({ weatherCode }: WeatherParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mode = weatherCodeToPrecipMode(weatherCode);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || mode === 'none') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = canvas.parentElement;
    let width = 0;
    let height = 0;

    function resize() {
      if (!container || !canvas) return;
      width = container.clientWidth;
      height = container.clientHeight;
      canvas.width = width;
      canvas.height = height;
    }
    resize();
    const resizeObserver = new ResizeObserver(resize);
    if (container) resizeObserver.observe(container);

    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      speed: mode === 'rain' ? 6 + Math.random() * 6 : 0.6 + Math.random() * 1.2,
      drift: mode === 'rain' ? -1 + Math.random() * 2 : -0.5 + Math.random(),
      length: mode === 'rain' ? 10 + Math.random() * 10 : 0,
      radius: mode === 'snow' ? 1 + Math.random() * 2 : 0,
    }));

    let animationFrame: number;
    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = 'rgba(148, 197, 235, 0.55)';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.5;

      for (const p of particles) {
        if (mode === 'rain') {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.drift * 2, p.y + p.length);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        }

        p.y += p.speed;
        p.x += p.drift * (mode === 'snow' ? Math.sin(p.y / 20) : 1) * 0.3;

        if (p.y > height) {
          p.y = -10;
          p.x = Math.random() * width;
        }
      }

      animationFrame = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, [mode]);

  if (mode === 'none') return null;

  return <canvas ref={canvasRef} className="weather-particles" />;
}
