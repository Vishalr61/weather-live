// Open-Meteo's sunrise/sunset strings are already in the city's own local
// time (timezone=auto) with no offset suffix — parsing them with Date would
// reinterpret the wall-clock value against the *viewer's* timezone instead
// of just displaying it, so this formats the string directly. Shared by
// WeatherDetails and shareCard so both render the same sunrise/sunset text.
export function formatLocalTime(isoLocal: string): string {
  const time = isoLocal.split('T')[1];
  if (!time) return isoLocal;
  const [hourStr, minute] = time.split(':');
  const hour = Number(hourStr);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute} ${period}`;
}
