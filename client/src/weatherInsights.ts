// Pure, client-only derived insights from data the app already has — no new
// API calls. Deliberately simple heuristics, not a scientific comfort index;
// the goal is "useful at a glance," not precision.

export interface ComfortResult {
  score: number; // 0-100
  label: string;
}

// Feels-like (not raw temp) already folds in Open-Meteo's own wind-chill/
// heat-index math, so it's the right single temperature input here — this
// just layers a humidity and wind penalty on top of it.
export function computeComfortScore(feelsLikeC: number, humidityPct: number, windKmh: number): ComfortResult {
  let score = 100;

  const idealTempMin = 18;
  const idealTempMax = 24;
  if (feelsLikeC < idealTempMin) score -= (idealTempMin - feelsLikeC) * 3;
  else if (feelsLikeC > idealTempMax) score -= (feelsLikeC - idealTempMax) * 3;

  const idealHumidityMin = 30;
  const idealHumidityMax = 60;
  if (humidityPct < idealHumidityMin) score -= (idealHumidityMin - humidityPct) * 0.5;
  else if (humidityPct > idealHumidityMax) score -= (humidityPct - idealHumidityMax) * 0.7;

  if (windKmh > 20) score -= (windKmh - 20) * 0.8;

  score = Math.max(0, Math.min(100, Math.round(score)));

  let label: string;
  if (score >= 80) label = 'Excellent';
  else if (score >= 60) label = 'Good';
  else if (score >= 40) label = 'Fair';
  else if (score >= 20) label = 'Poor';
  else label = 'Harsh';

  return { score, label };
}

// All three of currentTimeLocal/sunrise/sunset come from the same
// Open-Meteo response for the same city, so they share a local-time
// reference frame — comparing them as wall-clock minutes needs no
// timezone math at all, just like the sunrise/sunset display formatting.
function timeStringToMinutes(isoLocal: string): number {
  const time = isoLocal.split('T')[1];
  if (!time) return NaN;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

const GOLDEN_HOUR_WINDOW_MINUTES = 45;
const GOLDEN_HOUR_MAX_CLOUD_COVER_PCT = 60;

export function isGoldenHour(currentTimeLocal: string, sunrise: string, sunset: string, cloudCoverPct: number): boolean {
  if (cloudCoverPct >= GOLDEN_HOUR_MAX_CLOUD_COVER_PCT) return false;
  const now = timeStringToMinutes(currentTimeLocal);
  const sunriseMin = timeStringToMinutes(sunrise);
  const sunsetMin = timeStringToMinutes(sunset);
  return (
    Math.abs(now - sunriseMin) <= GOLDEN_HOUR_WINDOW_MINUTES ||
    Math.abs(now - sunsetMin) <= GOLDEN_HOUR_WINDOW_MINUTES
  );
}

export function getActivityTip(weatherCode: number, tempC: number, windKmh: number): string {
  if (weatherCode >= 95) return '⛈️ Thunderstorm — stay indoors if you can.';
  if ((weatherCode >= 71 && weatherCode <= 77) || weatherCode === 85 || weatherCode === 86) {
    return '❄️ Snowy — bundle up and watch for slick surfaces.';
  }
  if ((weatherCode >= 51 && weatherCode <= 67) || (weatherCode >= 80 && weatherCode <= 82)) {
    return '☔ Rainy — bring an umbrella.';
  }
  if (weatherCode === 45 || weatherCode === 48) return '🌫️ Foggy — take it slow, visibility is reduced.';
  if (tempC >= 32) return '🥵 Very hot — stay hydrated and seek shade.';
  if (tempC <= 0) return '🧥 Freezing — dress in layers.';
  if (windKmh >= 40) return '💨 Very windy — secure anything loose outside.';
  if (tempC >= 18 && tempC <= 26 && weatherCode <= 3) return '🌤️ Great day to be outside.';
  return '🙂 Fairly typical conditions today.';
}
