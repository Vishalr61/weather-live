import type { WeatherResponse } from '../types.ts';
import { computeComfortScore, getActivityTip, isGoldenHour } from '../weatherInsights.ts';
import { getMoonPhase } from '../moonPhase.ts';
import '../styles/weatherInsights.css';

interface WeatherInsightsProps {
  weather: WeatherResponse;
}

export function WeatherInsights({ weather }: WeatherInsightsProps) {
  const comfort = computeComfortScore(weather.feelsLike, weather.humidity, weather.windSpeedKmh);
  const tip = getActivityTip(weather.weatherCode, weather.temp, weather.windSpeedKmh);
  const goldenHour = isGoldenHour(weather.currentTimeLocal, weather.sunrise, weather.sunset, weather.cloudCoverPct);
  const moon = getMoonPhase(new Date());

  return (
    <div className="weather-insights">
      <div className="weather-insights-row">
        <span className="comfort-badge" data-level={comfort.label.toLowerCase()}>
          Comfort {comfort.score} · {comfort.label}
        </span>
        {goldenHour && <span className="golden-hour-badge">✨ Golden hour</span>}
        <span className="moon-phase-badge" title={moon.name}>
          {moon.emoji} {moon.name}
        </span>
      </div>
      <p className="activity-tip">{tip}</p>
    </div>
  );
}
