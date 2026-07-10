import type { WeatherResponse } from '../types.ts';
import { useUnit } from '../context/UnitContext.tsx';
import { formatLocalTime } from '../formatLocalTime.ts';
import '../styles/weatherDetails.css';

interface WeatherDetailsProps {
  weather: WeatherResponse;
}

const COMPASS_POINTS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
];

function degreesToCompass(deg: number): string {
  return COMPASS_POINTS[Math.round(deg / 22.5) % 16];
}

function uvLabel(uv: number): string {
  if (uv < 3) return 'Low';
  if (uv < 6) return 'Moderate';
  if (uv < 8) return 'High';
  if (uv < 11) return 'Very High';
  return 'Extreme';
}

export function WeatherDetails({ weather }: WeatherDetailsProps) {
  const { formatTemp } = useUnit();

  return (
    <div className="weather-details">
      <div className="weather-detail">
        <span className="weather-detail-label">Feels like</span>
        <span className="weather-detail-value">{formatTemp(weather.feelsLike)}</span>
      </div>
      <div className="weather-detail">
        <span className="weather-detail-label">Humidity</span>
        <span className="weather-detail-value">{weather.humidity}%</span>
      </div>
      <div className="weather-detail">
        <span className="weather-detail-label">Wind</span>
        <span className="weather-detail-value">
          {Math.round(weather.windSpeedKmh)} km/h {degreesToCompass(weather.windDirectionDeg)}
        </span>
      </div>
      <div className="weather-detail">
        <span className="weather-detail-label">UV index</span>
        <span className="weather-detail-value">
          {Math.round(weather.uvIndexMax)} · {uvLabel(weather.uvIndexMax)}
        </span>
      </div>
      <div className="weather-detail">
        <span className="weather-detail-label">Sunrise</span>
        <span className="weather-detail-value">{formatLocalTime(weather.sunrise)}</span>
      </div>
      <div className="weather-detail">
        <span className="weather-detail-label">Sunset</span>
        <span className="weather-detail-value">{formatLocalTime(weather.sunset)}</span>
      </div>
    </div>
  );
}
