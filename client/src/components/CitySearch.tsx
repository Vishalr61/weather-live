import { useMemo, useState } from 'react';
import type { City } from '../types.ts';
import '../styles/citySearch.css';

interface CitySearchProps {
  cities: City[];
  onSelect: (cityId: string) => void;
}

const MAX_RESULTS = 6;

export function CitySearch({ cities, onSelect }: CitySearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return cities.filter((c) => c.label.toLowerCase().includes(q)).slice(0, MAX_RESULTS);
  }, [cities, query]);

  const handleSelect = (city: City) => {
    onSelect(city.id);
    setQuery(city.label);
    setOpen(false);
  };

  return (
    <div className="city-search">
      <input
        id="city-search"
        type="text"
        placeholder="Find a city..."
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && matches.length > 0) handleSelect(matches[0]);
          if (e.key === 'Escape') setOpen(false);
        }}
        aria-label="Find a city"
      />
      {open && matches.length > 0 && (
        <ul className="city-search-results">
          {matches.map((c) => (
            <li key={c.id}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => handleSelect(c)}>
                {c.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
