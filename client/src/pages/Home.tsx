import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { useSocket } from '../hooks/useSocket.ts';
import { useMessages } from '../hooks/useMessages.ts';
import { useWeatherSnapshot } from '../hooks/useWeatherSnapshot.ts';
import { useGlobalAlerts } from '../hooks/useGlobalAlerts.ts';
import { useSoundscape } from '../hooks/useSoundscape.ts';
import { useWatchlist } from '../hooks/useWatchlist.ts';
import { useTheme } from '../hooks/useTheme.ts';
import { fetchCities, fetchForecast, fetchHistory, fetchWeather } from '../api/weather.ts';
import { ToastContainer } from '../components/ToastContainer.tsx';
import { ConnectionStatus } from '../components/ConnectionStatus.tsx';
import type { FlyToRequest } from '../components/Globe.tsx';
import { AlertTicker } from '../components/AlertTicker.tsx';
import { WeatherParticles } from '../components/WeatherParticles.tsx';
import { WeatherDetails } from '../components/WeatherDetails.tsx';
import { ForecastStrip } from '../components/ForecastStrip.tsx';
import { TrendSparkline } from '../components/TrendSparkline.tsx';
import { CitySearch } from '../components/CitySearch.tsx';
import { SoundToggle } from '../components/SoundToggle.tsx';
import { ThemeToggle } from '../components/ThemeToggle.tsx';
import { Watchlist } from '../components/Watchlist.tsx';
import type { City, ForecastDay, WeatherResponse } from '../types.ts';
import '../styles/home.css';

// Lazy-loaded: Three.js (renderer, scene graph, OrbitControls) is the bulk
// of this app's JS weight, and the login/register pages never touch it —
// splitting it into its own chunk keeps those pages' initial load light.
const Globe = lazy(() => import('../components/Globe.tsx').then((m) => ({ default: m.Globe })));

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

export function Home() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { socket, status } = useSocket();
  const { toasts, dismiss } = useMessages(socket);
  const { snapshot } = useWeatherSnapshot(socket);
  const { lastAlert, recentAlerts } = useGlobalAlerts(socket);
  const { watchlist, addCity, removeCity } = useWatchlist(socket);

  const [cities, setCities] = useState<City[]>([]);
  const [currentCityId, setCurrentCityId] = useState('');
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [history, setHistory] = useState<ForecastDay[]>([]);
  const [flyTo, setFlyTo] = useState<FlyToRequest | null>(null);
  const { enabled: soundEnabled, toggle: toggleSound } = useSoundscape(weather?.weatherCode ?? null);
  const { theme, toggleTheme } = useTheme();

  // Tracks the in-flight request set for the most recently selected city, so
  // a slower older request that resolves after a newer selection can't
  // overwrite the display with stale data. Aborting handles the common case
  // (the old request is still in flight); the isCurrent() checks below also
  // cover the narrower case of an old request completing successfully in the
  // brief window before it could be aborted.
  const activeRequestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchCities()
      .then(setCities)
      .catch(() => { /* server unreachable — city list stays empty */ });
  }, []);

  useEffect(() => {
    return () => activeRequestRef.current?.abort();
  }, []);

  // Viewing a city also adds it to the watchlist — the room join/rejoin
  // logic for alerts now lives entirely in useWatchlist, keyed off that
  // list rather than a single "current city." Switching which city is
  // being viewed no longer drops alerts for previously-viewed cities.
  const selectCity = async (cityId: string) => {
    if (!cityId) return;

    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;
    const isCurrent = () => activeRequestRef.current === controller;

    setCurrentCityId(cityId);
    addCity(cityId);
    setWeather(null);
    setWeatherError(null);
    setForecast([]);
    setHistory([]);
    setLoading(true);
    try {
      const data = await fetchWeather(cityId, controller.signal);
      if (isCurrent()) setWeather(data);
    } catch (err) {
      if (isCurrent() && !isAbortError(err)) {
        setWeatherError('Could not load weather. Please try again.');
      }
    } finally {
      if (isCurrent()) setLoading(false);
    }

    // Supplementary to the current-conditions card — a failure here shouldn't
    // block or error out the primary weather display, so it's fetched and
    // handled independently.
    try {
      const data = await fetchForecast(cityId, controller.signal);
      if (isCurrent()) setForecast(data.days);
    } catch {
      if (isCurrent()) setForecast([]);
    }

    try {
      const data = await fetchHistory(cityId, controller.signal);
      if (isCurrent()) setHistory(data.days);
    } catch {
      if (isCurrent()) setHistory([]);
    }
  };

  // Used by the search box and the <select> fallback, where the target city
  // may currently be on the globe's far side. A direct marker click skips
  // this — the user is already looking at what they clicked.
  const selectCityAndFly = (cityId: string) => {
    void selectCity(cityId);
    if (cityId) setFlyTo({ cityId, nonce: Date.now() });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="home-container">
      <header className="home-header">
        <span className="home-title">⛅ Weather Live</span>
        <ConnectionStatus status={status} />
        <div className="home-header-actions">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />
          <button onClick={handleLogout} className="logout-btn">Sign out</button>
        </div>
      </header>
      <main className="home-main">
        <section className="globe-panel">
          <Suspense fallback={<div className="globe-canvas globe-canvas--loading">Loading globe…</div>}>
            <Globe
              cities={cities}
              snapshot={snapshot}
              selectedCityId={currentCityId}
              onSelectCity={(id) => { void selectCity(id); }}
              lastAlert={lastAlert}
              flyTo={flyTo}
              watchedCityIds={watchlist}
            />
          </Suspense>
          <p className="globe-hint">Drag to rotate. Click a city marker to select it.</p>
          <AlertTicker alerts={recentAlerts} />
        </section>

        <section className="detail-panel">
          <div className="city-selector">
            <label htmlFor="city-search">Find a city</label>
            <CitySearch cities={cities} onSelect={selectCityAndFly} />
            <label htmlFor="city" className="city-selector-fallback-label">
              Or browse the full list
            </label>
            <select
              id="city"
              value={currentCityId}
              onChange={(e) => { selectCityAndFly(e.target.value); }}
            >
              <option value="">— choose a city —</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="watchlist-section">
            <h3 className="watchlist-heading">Watchlist</h3>
            <Watchlist
              cityIds={watchlist}
              cities={cities}
              snapshot={snapshot}
              onSelect={selectCityAndFly}
              onRemove={removeCity}
            />
          </div>

          {loading && <p className="weather-loading">Loading weather...</p>}
          {weatherError && <p className="weather-error">{weatherError}</p>}
          {weather && (
            <div className="weather-card">
              <WeatherParticles weatherCode={weather.weatherCode} />
              <div className="weather-card-content">
                <h2>{weather.city}</h2>
                <p className="weather-temp">{weather.temp}°C</p>
                <p className="weather-desc">{weather.description}</p>
                <WeatherDetails weather={weather} />
                <TrendSparkline days={history} />
                <ForecastStrip days={forecast} />
              </div>
            </div>
          )}
        </section>
      </main>
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
