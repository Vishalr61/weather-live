import type { ForecastDay } from '../types.ts';
import { weatherCodeToColor } from '../three/weatherVisuals.ts';
import '../styles/forecastStrip.css';

interface ForecastStripProps {
  days: ForecastDay[];
}

function dayLabel(dateStr: string, index: number): string {
  if (index === 0) return 'Today';
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString(undefined, { weekday: 'short' });
}

export function ForecastStrip({ days }: ForecastStripProps) {
  if (days.length === 0) return null;

  return (
    <div className="forecast-strip">
      {days.map((day, i) => (
        <div key={day.date} className="forecast-day">
          <span className="forecast-day-label">{dayLabel(day.date, i)}</span>
          <span
            className="forecast-day-dot"
            style={{ background: weatherCodeToColor(day.weatherCode) }}
          />
          <span className="forecast-day-temps">
            <span className="forecast-day-max">{Math.round(day.tempMax)}°</span>
            <span className="forecast-day-min">{Math.round(day.tempMin)}°</span>
          </span>
        </div>
      ))}
    </div>
  );
}
