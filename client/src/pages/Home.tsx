import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { useSocket } from '../hooks/useSocket.ts';
import { useMessages } from '../hooks/useMessages.ts';
import { fetchCities, fetchWeather } from '../api/weather.ts';
import { ToastContainer } from '../components/ToastContainer.tsx';
import type { City, WeatherResponse } from '../types.ts';
import '../styles/home.css';

export function Home() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const socket = useSocket();
  const { toasts, dismiss } = useMessages(socket);

  const [cities, setCities] = useState<City[]>([]);
  const [currentCityId, setCurrentCityId] = useState('');
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const selectCity = async (cityId: string) => {
    if (!cityId) return;
    setCurrentCityId(cityId);
    setWeather(null);
    setWeatherError(null);
    setLoading(true);
    try {
      const data = await fetchWeather(cityId);
      setWeather(data);
    } catch {
      setWeatherError('Could not load weather. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="home-container">
      <header className="home-header">
        <span className="home-title">⛅ Weather Live</span>
        <button onClick={handleLogout} className="logout-btn">Sign out</button>
      </header>
      <main className="home-main">
        <div className="city-selector">
          <label htmlFor="city">Select a city</label>
          <select
            id="city"
            value={currentCityId}
            onChange={(e) => { void selectCity(e.target.value); }}
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
            <h2>{weather.city}</h2>
            <p className="weather-temp">{weather.temp}°C</p>
            <p className="weather-desc">{weather.description}</p>
          </div>
        )}
      </main>
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
