import type { HourlyEntry } from '../types.ts';
import { weatherCodeToColor } from '../three/weatherVisuals.ts';
import { useUnit } from '../context/UnitContext.tsx';
import '../styles/hourlyForecast.css';

interface HourlyForecastProps {
  hours: HourlyEntry[];
}

function hourLabel(timeStr: string, index: number): string {
  if (index === 0) return 'Now';
  const date = new Date(timeStr);
  return date.toLocaleTimeString(undefined, { hour: 'numeric' });
}

export function HourlyForecast({ hours }: HourlyForecastProps) {
  const { convertTemp } = useUnit();
  if (hours.length === 0) return null;

  return (
    <div className="hourly-forecast">
      {hours.map((hour, i) => (
        <div key={hour.time} className="hourly-entry">
          <span className="hourly-entry-label">{hourLabel(hour.time, i)}</span>
          <span
            className="hourly-entry-dot"
            style={{ background: weatherCodeToColor(hour.weatherCode) }}
          />
          <span className="hourly-entry-temp">{Math.round(convertTemp(hour.temp))}°</span>
          {hour.precipProbabilityPct > 0 && (
            <span className="hourly-entry-precip">💧{hour.precipProbabilityPct}%</span>
          )}
        </div>
      ))}
    </div>
  );
}
