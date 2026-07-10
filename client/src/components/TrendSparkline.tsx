import type { ForecastDay } from '../types.ts';
import { Sparkline } from './Sparkline.tsx';
import { useUnit } from '../context/UnitContext.tsx';
import '../styles/trendSparkline.css';

interface TrendSparklineProps {
  days: ForecastDay[];
}

export function TrendSparkline({ days }: TrendSparklineProps) {
  const { convertTemp } = useUnit();
  if (days.length < 2) return null;

  // Converted before the chart sees them, not just the range label — the
  // sparkline's own min/max scaling needs to operate on displayed units too.
  const highs = days.map((d) => convertTemp(d.tempMax));
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
