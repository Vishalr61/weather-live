interface ToastProps {
  id: string;
  text: string;
  city: string;
  timestamp: string;
  onDismiss: (id: string) => void;
}

export function Toast({ id, text, city, onDismiss }: ToastProps) {
  return (
    <div className="toast">
      <div className="toast-body">
        <span className="toast-city">{city}</span>
        <span className="toast-text">{text}</span>
      </div>
      <button
        className="toast-dismiss"
        onClick={() => onDismiss(id)}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
