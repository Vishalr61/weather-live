import type { WeatherResponse } from '../types.ts';
import { useUnit } from '../context/UnitContext.tsx';
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

// Open-Meteo's sunrise/sunset strings are already in the city's own local
// time (timezone=auto) with no offset suffix — parsing them with Date would
// reinterpret the wall-clock value against the *viewer's* timezone instead
// of just displaying it, so this formats the string directly.
function formatLocalTime(isoLocal: string): string {
  const time = isoLocal.split('T')[1];
  if (!time) return isoLocal;
  const [hourStr, minute] = time.split(':');
  const hour = Number(hourStr);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute} ${period}`;
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
