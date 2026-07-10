// Hand-drawn on an offscreen <canvas> rather than screenshotting the real
// DOM card (which would need a DOM-to-image library like html2canvas just
// to rasterize text/gradients) — this keeps the feature dependency-free and
// gives a purpose-built shareable layout instead of a literal UI screenshot.
import { weatherCodeToColor } from './three/weatherVisuals.ts';
import { computeComfortScore, getActivityTip } from './weatherInsights.ts';
import { getMoonPhase } from './moonPhase.ts';
import { formatLocalTime } from './formatLocalTime.ts';
import type { WeatherResponse } from './types.ts';

interface ShareCardOptions {
  weather: WeatherResponse;
  formatTemp: (celsius: number) => string;
}

const WIDTH = 600;
const HEIGHT = 610;

function drawStatPair(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  value: string
): void {
  ctx.textAlign = 'left';
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(label.toUpperCase(), x, y);
  ctx.font = '600 22px system-ui, sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(value, x, y + 28);
}

// Pure function of (weather, formatTemp) — same inputs the on-page
// WeatherDetails/WeatherInsights cards already render, just laid out on a
// canvas instead of in the DOM.
export function renderShareCard({ weather, formatTemp }: ShareCardOptions): string {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const accent = weatherCodeToColor(weather.weatherCode);
  const comfort = computeComfortScore(weather.feelsLike, weather.humidity, weather.windSpeedKmh);
  const tip = getActivityTip(weather.weatherCode, weather.temp, weather.windSpeedKmh);
  const moon = getMoonPhase(new Date());

  const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  bg.addColorStop(0, '#0f172a');
  bg.addColorStop(1, '#1e293b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.save();
  const glow = ctx.createRadialGradient(WIDTH / 2, 170, 10, WIDTH / 2, 170, 280);
  glow.addColorStop(0, accent);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.restore();

  ctx.textAlign = 'center';

  ctx.font = '600 26px system-ui, sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(weather.city, WIDTH / 2, 80);

  ctx.font = '700 92px system-ui, sans-serif';
  ctx.fillText(formatTemp(weather.temp), WIDTH / 2, 190);

  ctx.font = '400 24px system-ui, sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(weather.description, WIDTH / 2, 228);

  const statsTop = 290;
  const colX = [64, WIDTH / 2 + 32];
  drawStatPair(ctx, colX[0], statsTop, 'Feels like', formatTemp(weather.feelsLike));
  drawStatPair(ctx, colX[1], statsTop, 'Humidity', `${weather.humidity}%`);
  drawStatPair(ctx, colX[0], statsTop + 64, 'Wind', `${Math.round(weather.windSpeedKmh)} km/h`);
  drawStatPair(ctx, colX[1], statsTop + 64, 'UV index', `${Math.round(weather.uvIndexMax)}`);
  drawStatPair(ctx, colX[0], statsTop + 128, 'Sunrise', formatLocalTime(weather.sunrise));
  drawStatPair(ctx, colX[1], statsTop + 128, 'Sunset', formatLocalTime(weather.sunset));

  const pillY = statsTop + 190;
  ctx.textAlign = 'center';
  ctx.font = '600 17px system-ui, sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(`Comfort ${comfort.score} · ${comfort.label}`, WIDTH / 2, pillY);

  ctx.font = '400 15px system-ui, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`${moon.emoji} ${moon.name}`, WIDTH / 2, pillY + 32);

  ctx.font = '400 18px system-ui, sans-serif';
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(tip, WIDTH / 2, pillY + 70);

  ctx.font = '400 14px system-ui, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText(`⛅ Weather Live · ${new Date().toLocaleDateString()}`, WIDTH / 2, HEIGHT - 30);

  return canvas.toDataURL('image/png');
}
