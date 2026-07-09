import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { useSocket } from '../hooks/useSocket.ts';
import { useMessages } from '../hooks/useMessages.ts';
import { useWeatherSnapshot } from '../hooks/useWeatherSnapshot.ts';
import { useGlobalAlerts } from '../hooks/useGlobalAlerts.ts';
import { useSoundscape } from '../hooks/useSoundscape.ts';
import { fetchCities, fetchForecast, fetchWeather } from '../api/weather.ts';
import { ToastContainer } from '../components/ToastContainer.tsx';
import { ConnectionStatus } from '../components/ConnectionStatus.tsx';
import { Globe } from '../components/Globe.tsx';
import type { FlyToRequest } from '../components/Globe.tsx';
import { AlertTicker } from '../components/AlertTicker.tsx';
import { WeatherParticles } from '../components/WeatherParticles.tsx';
import { ForecastStrip } from '../components/ForecastStrip.tsx';
import { CitySearch } from '../components/CitySearch.tsx';
import { SoundToggle } from '../components/SoundToggle.tsx';
import type { City, ForecastDay, WeatherResponse } from '../types.ts';
import '../styles/home.css';

export function Home() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { socket, status } = useSocket();
  const { toasts, dismiss } = useMessages(socket);
  const { snapshot } = useWeatherSnapshot(socket);
  const { lastAlert, recentAlerts } = useGlobalAlerts(socket);

  const [cities, setCities] = useState<City[]>([]);
  const [currentCityId, setCurrentCityId] = useState('');
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [flyTo, setFlyTo] = useState<FlyToRequest | null>(null);
  const { enabled: soundEnabled, toggle: toggleSound } = useSoundscape(weather?.weatherCode ?? null);

  useEffect(() => {
    fetchCities()
      .then(setCities)
      .catch(() => { /* server unreachable — city list stays empty */ });
  }, []);

  // Join/leave the socket room whenever the selected city or socket changes.
  // Handles the case where the socket connects after a city is already selected.
  useEffect(() => {
    if (!socket || !currentCityId) return;
    socket.emit('joinCity', currentCityId);
    return () => {
      // Cleanup runs with the previous closure: when currentCityId changes from
      // 'melbourne' to 'sydney', this emits leaveCity('melbourne') before the
      // next effect emits joinCity('sydney'). React's effect lifecycle guarantees
      // we never end up subscribed to two city rooms at once.
      socket.emit('leaveCity', currentCityId);
    };
  }, [socket, currentCityId]);

  // socket.io-client reuses the same Socket instance across reconnects, so
  // the room-join useEffect above doesn't re-fire on disconnect/reconnect
  // cycles. This effect explicitly re-emits joinCity when the underlying
  // connection comes back, so the user's room subscription survives a
  // backend bounce.
  useEffect(() => {
    if (!socket || !currentCityId) return;
    const rejoin = () => socket.emit('joinCity', currentCityId);
    socket.on('connect', rejoin);
    socket.io.on('reconnect', rejoin);
    return () => {
      socket.off('connect', rejoin);
      socket.io.off('reconnect', rejoin);
    };
  }, [socket, currentCityId]);

  const selectCity = async (cityId: string) => {
    if (!cityId) return;
    setCurrentCityId(cityId);
    setWeather(null);
    setWeatherError(null);
    setForecast([]);
    setLoading(true);
    try {
      const data = await fetchWeather(cityId);
      setWeather(data);
    } catch {
      setWeatherError('Could not load weather. Please try again.');
    } finally {
      setLoading(false);
    }

    // Supplementary to the current-conditions card — a failure here shouldn't
    // block or error out the primary weather display, so it's fetched and
    // handled independently.
    try {
      const data = await fetchForecast(cityId);
      setForecast(data.days);
    } catch {
      setForecast([]);
    }
  };

  // Used by the search box and the <select> fallback, where the target city
  // may currently be on the globe's far side. A direct marker click skips
  // this — the user is already looking at what they clicked.
  const selectCityAndFly = (cityId: string) => {
    void selectCity(cityId);
    if (cityId) setFlyTo({ cityId, nonce: Date.now() });
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="home-container">
      <header className="home-header">
        <span className="home-title">⛅ Weather Live</span>
        <ConnectionStatus status={status} />
        <div className="home-header-actions">
          <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />
          <button onClick={handleLogout} className="logout-btn">Sign out</button>
        </div>
      </header>
      <main className="home-main">
        <section className="globe-panel">
          <Globe
            cities={cities}
            snapshot={snapshot}
            selectedCityId={currentCityId}
            onSelectCity={(id) => { void selectCity(id); }}
            lastAlert={lastAlert}
            flyTo={flyTo}
          />
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

          {loading && <p className="weather-loading">Loading weather...</p>}
          {weatherError && <p className="weather-error">{weatherError}</p>}
          {weather && (
            <div className="weather-card">
              <WeatherParticles weatherCode={weather.weatherCode} />
              <div className="weather-card-content">
                <h2>{weather.city}</h2>
                <p className="weather-temp">{weather.temp}°C</p>
                <p className="weather-desc">{weather.description}</p>
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
