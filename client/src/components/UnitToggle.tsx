import { useUnit } from '../context/UnitContext.tsx';

export function UnitToggle() {
  const { unit, toggleUnit } = useUnit();
  const label = unit === 'celsius' ? 'Switch to Fahrenheit' : 'Switch to Celsius';

  return (
    <button
      type="button"
      className="icon-toggle"
      onClick={toggleUnit}
      aria-label={label}
      title={label}
    >
      {unit === 'celsius' ? '°C' : '°F'}
    </button>
  );
}
