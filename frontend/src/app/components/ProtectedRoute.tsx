import { Navigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: JSX.Element;
  allowedRoles?: Array<'admin' | 'trainer' | 'member' | 'owner'>;
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect based on their role if they try to access something they shouldn't
    switch (user.role) {
      case 'admin':
      case 'owner':
        return <Navigate to="/members" replace />;
      case 'trainer':
        return <Navigate to="/trainer" replace />;
      case 'member':
        return <Navigate to="/dashboard" replace />;
      default:
        return <Navigate to="/" replace />;
    }
  }

  return children;
}
