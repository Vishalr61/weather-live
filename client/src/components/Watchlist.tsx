import type { City, WeatherSnapshotPayload } from '../types.ts';
import { weatherCodeToColor } from '../three/weatherVisuals.ts';
import { useUnit } from '../context/UnitContext.tsx';
import '../styles/watchlist.css';

interface WatchlistProps {
  cityIds: string[];
  cities: City[];
  snapshot: WeatherSnapshotPayload | null;
  onSelect: (cityId: string) => void;
  onRemove: (cityId: string) => void;
}

export function Watchlist({ cityIds, cities, snapshot, onSelect, onRemove }: WatchlistProps) {
  const { convertTemp } = useUnit();
  if (cityIds.length === 0) {
    return (
      <div className="watchlist watchlist--empty">
        <span>No cities watched yet — search or select one to add it.</span>
      </div>
    );
  }

  return (
    <ul className="watchlist">
      {cityIds.map((id) => {
        const city = cities.find((c) => c.id === id);
        const snap = snapshot?.cities.find((c) => c.cityId === id);
        return (
          <li key={id} className="watchlist-item">
            <button type="button" className="watchlist-item-select" onClick={() => onSelect(id)}>
              {snap && (
                <span
                  className="watchlist-item-dot"
                  style={{ background: weatherCodeToColor(snap.weatherCode) }}
                />
              )}
              <span className="watchlist-item-label">{city?.label ?? id}</span>
              {snap && <span className="watchlist-item-temp">{Math.round(convertTemp(snap.temp))}°</span>}
            </button>
            <button
              type="button"
              className="watchlist-item-remove"
              onClick={() => onRemove(id)}
              aria-label={`Stop watching ${city?.label ?? id}`}
            >
              ×
            </button>
          </li>
        );
      })}
    </ul>
  );
}
