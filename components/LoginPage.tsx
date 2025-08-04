
'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signIn, signUp } = useAuth();

  // FORM SUBMISSION: Handle email/password authentication
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        // USER REGISTRATION: Create new Firebase Auth account
        await signUp(email, password);
      } else {
        // USER LOGIN: Authenticate existing Firebase Auth account
        await signIn(email, password);
      }
    } catch (error: any) {
      // ERROR HANDLING: Display Firebase Auth errors to user
      console.error('Authentication error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center">
              <div className="w-8 h-8 flex items-center justify-center">
                <i className="ri-mic-line text-white text-2xl"></i>
              </div>
            </div>
          </div>
          <div className="text-4xl font-bold text-blue-500 mb-2">ShowAI</div>
          <h2 className="text-3xl font-bold text-white">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="mt-2 text-gray-400">
            {isSignUp ? 'Join ShowAI to get started' : 'Sign in to your account'}
          </p>
        </div>

        {/* AUTHENTICATION FORM: Email/Password login and registration */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* ERROR DISPLAY: Show Firebase Auth errors */}
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-error-warning-line"></i>
                </div>
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* EMAIL INPUT: Firebase Auth email field */}
            <div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Email address"
                disabled={loading}
              />
            </div>
            
            {/* PASSWORD INPUT: Firebase Auth password field */}
            <div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Password"
                disabled={loading}
                minLength={6}
              />
            </div>
          </div>

          {/* SUBMIT BUTTON: Firebase Auth form submission */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Processing...</span>
              </div>
            ) : (
              isSignUp ? 'Create Account' : 'Sign In'
            )}
          </button>

          {/* MODE TOGGLE: Switch between login and registration */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="text-blue-400 hover:text-blue-300 cursor-pointer"
              disabled={loading}
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </form>

        {/* ADDITIONAL INFO: Help text for users */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            By signing in, you agree to our terms of service and privacy policy.
          </p>
        </div>
      </div>
    </div>
  );
}