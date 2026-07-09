// WMO weather interpretation codes → human-readable description.
// Full table: https://open-meteo.com/en/docs#weathervariables
export const WMO_DESCRIPTIONS: Record<number, string> = {
  0: 'Clear sky',        1: 'Mainly clear',    2: 'Partly cloudy',  3: 'Overcast',
  45: 'Fog',             48: 'Icy fog',
  51: 'Light drizzle',   53: 'Drizzle',        55: 'Heavy drizzle',
  61: 'Light rain',      63: 'Rain',           65: 'Heavy rain',
  71: 'Light snow',      73: 'Snow',           75: 'Heavy snow',
  80: 'Showers',         81: 'Heavy showers',  82: 'Violent showers',
  95: 'Thunderstorm',    96: 'Thunderstorm with hail',
  99: 'Thunderstorm with heavy hail',
};

export function describeWeatherCode(code: number): string {
  return WMO_DESCRIPTIONS[code] ?? 'Unknown';
}
