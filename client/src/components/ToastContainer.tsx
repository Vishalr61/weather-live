import { Toast } from './Toast.tsx';
import type { ToastMessage } from '../hooks/useMessages.ts';
import '../styles/toast.css';

interface ToastContainerProps {
  toasts: ToastMessage[];
  dismiss: (id: string) => void;
}

export function ToastContainer({ toasts, dismiss }: ToastContainerProps) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <Toast key={t.id} {...t} onDismiss={dismiss} />
      ))}
    </div>
  );
}
