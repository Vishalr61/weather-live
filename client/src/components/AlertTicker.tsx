import { useEffect, useState } from 'react';
import type { GlobalAlertEntry } from '../hooks/useGlobalAlerts.ts';
import '../styles/alertTicker.css';

interface AlertTickerProps {
  alerts: GlobalAlertEntry[];
}

function timeAgo(timestamp: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - new Date(timestamp).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function AlertTicker({ alerts }: AlertTickerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  if (alerts.length === 0) {
    return (
      <div className="alert-ticker alert-ticker--empty">
        <span>No severe weather detected globally right now.</span>
      </div>
    );
  }

  return (
    <ul className="alert-ticker">
      {alerts.map((alert) => (
        <li key={alert.id} className={`alert-ticker-item alert-ticker-item--${alert.severity}`}>
          <span className="alert-ticker-icon">{alert.severity === 'severe' ? '⚠️' : '⚡'}</span>
          <span className="alert-ticker-text">
            {alert.description} — {alert.label}
          </span>
          <span className="alert-ticker-time">{timeAgo(alert.timestamp, now)}</span>
        </li>
      ))}
    </ul>
  );
}
