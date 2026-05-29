import type { ConnectionStatus as Status } from '../hooks/useSocket.ts';

interface ConnectionStatusProps {
  status: Status;
}

const CONFIG: Record<Status, { color: string; label: string }> = {
  connected:    { color: '#16a34a', label: 'Connected' },
  connecting:   { color: '#d97706', label: 'Connecting…' },
  // Same label as 'connecting' — to the user there's no meaningful difference
  // between first-time connecting and retrying after a drop.
  reconnecting: { color: '#d97706', label: 'Connecting…' },
  disconnected: { color: '#9ca3af', label: 'Disconnected' },
};

export function ConnectionStatus({ status }: ConnectionStatusProps) {
  const { color, label } = CONFIG[status];
  return (
    <div className="connection-status">
      <span className="connection-dot" style={{ background: color }} />
      <span className="connection-label">{label}</span>
    </div>
  );
}
