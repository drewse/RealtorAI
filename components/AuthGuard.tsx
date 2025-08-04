
'use client';

import { useAuth } from '@/hooks/useAuth';
import LoginPage from './LoginPage';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();

  // AUTHENTICATION FLOW: Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // ROUTE PROTECTION: Redirect to login if user not authenticated
  if (!user) {
    return <LoginPage />;
  }

  // USER AUTHENTICATED: Render protected content
  return <>{children}</>;
}