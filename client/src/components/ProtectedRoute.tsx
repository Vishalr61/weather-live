import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext.tsx';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  // The auth check is async now (httpOnly cookie means no synchronous
  // localStorage read) — rendering nothing until it resolves avoids a flash
  // redirect to /login for an already-authenticated user on page load.
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
