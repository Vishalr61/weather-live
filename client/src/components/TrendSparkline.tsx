import type { ForecastDay } from '../types.ts';
import { Sparkline } from './Sparkline.tsx';
import '../styles/trendSparkline.css';

interface TrendSparklineProps {
  days: ForecastDay[];
}

export function TrendSparkline({ days }: TrendSparklineProps) {
  if (days.length < 2) return null;

  const highs = days.map((d) => d.tempMax);
  const min = Math.min(...highs);
  const max = Math.max(...highs);

  return (
    <div className="trend-sparkline">
      <div className="trend-sparkline-header">
        <span>Past {days.length - 1} days</span>
        <span className="trend-sparkline-range">
          {Math.round(min)}° – {Math.round(max)}°
        </span>
      </div>
      <Sparkline values={highs} />
    </div>
  );
}
