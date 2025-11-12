'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Brain } from 'lucide-react';

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showSignupConfirmation, setShowSignupConfirmation] = useState(false);
  const { signIn, signUp, resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email || !password || (!isLogin && !fullName)) {
        setError('Please fill in all required fields');
        return;
      }

      const { error } = isLogin
        ? await signIn(email, password)
        : await signUp(email, password, fullName);

      if (error) {
        // Handle specific error cases
        if (error.message?.includes('Email not confirmed')) {
          setShowSignupConfirmation(true);
        } else {
          setError(error.message || 'An error occurred during authentication');
        }
      } else if (!isLogin) {
        // Show confirmation page after successful signup
        setShowSignupConfirmation(true);
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await resetPassword(resetEmail);

      if (error) {
        setError(error.message);
      } else {
        setResetSuccess(true);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (showSignupConfirmation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-slate-700">
            <div className="flex items-center justify-center mb-8">
              <div className="bg-cyan-500/10 p-4 rounded-2xl">
                <Brain className="w-12 h-12 text-cyan-400" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-white text-center mb-2">
              Check Your Email
            </h1>
            <p className="text-slate-400 text-center mb-8">
              We've sent a confirmation email to <span className="text-cyan-400">{email}</span>. 
              Please check your inbox and click the confirmation link to activate your account.
            </p>

            <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4 mb-6">
              <p className="text-blue-400 text-center text-sm">
                Didn't receive the email? Check your spam folder or wait a few minutes.
              </p>
            </div>

            <button
              onClick={() => {
                setShowSignupConfirmation(false);
                setIsLogin(true);
                setEmail('');
                setPassword('');
                setFullName('');
              }}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold py-3 px-4 rounded-lg hover:from-cyan-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-slate-700">
            <div className="flex items-center justify-center mb-8">
              <div className="bg-cyan-500/10 p-4 rounded-2xl">
                <Brain className="w-12 h-12 text-cyan-400" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-white text-center mb-2">
              Reset Password
            </h1>
            <p className="text-slate-400 text-center mb-8">
              Enter your email to receive a password reset link
            </p>

            {resetSuccess ? (
              <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4 mb-6">
                <p className="text-green-400 text-center">
                  Password reset link sent to your email. Please check your inbox.
                </p>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label htmlFor="resetEmail" className="block text-sm font-medium text-slate-300 mb-2">
                    Email
                  </label>
                  <input
                    id="resetEmail"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                    placeholder="you@example.com"
                    required
                  />
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold py-3 px-4 rounded-lg hover:from-cyan-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            )}

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setError('');
                  setResetSuccess(false);
                  setResetEmail('');
                }}
                className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-3 max-w-full">
      <div className="max-w-md w-full">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-slate-700">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-cyan-500/10 p-3 rounded-2xl">
              <Brain className="w-10 h-10 text-cyan-400" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white text-center mb-1">
            Welcome to KYNEX.dev
          </h1>
          <p className="text-slate-400 text-center mb-6 text-sm">
            Your AI that remembers, plans, and acts
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-sm"
                  placeholder="Your Name"
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-sm"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-sm"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold py-2.5 px-4 rounded-lg hover:from-cyan-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {isLogin && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowForgotPassword(true)}
                className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors"
              >
                Forgot Password?
              </button>
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}