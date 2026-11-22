import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Button, Input, Alert } from '../components/ui';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/api/auth/login', { email, password });
      login(res.token, res.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
    setError('');
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded bg-brand text-white font-bold text-2xl mb-3">
          J
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-ink">
          Sign in to Joineazy
        </h2>
        <p className="mt-1 text-sm text-text-2">
          Student, Group & Assignment Management System
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface py-8 px-6 sm:px-10 rounded border border-line shadow-subtle">
          {error && <Alert variant="danger" message={error} className="mb-5" />}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email address"
              id="email"
              type="email"
              autoComplete="email"
              required
              placeholder="name@joineazy.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              label="Password"
              id="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="w-full mt-2"
            >
              Sign In
            </Button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 pt-5 border-t border-line text-xs">
            <p className="font-semibold text-text-2 mb-2">Quick Demo Accounts:</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleFillDemo('professor@joineazy.com')}
                className="p-2 border border-line rounded text-left hover:bg-canvas transition-colors"
              >
                <div className="font-semibold text-brand">Professor</div>
                <div className="text-[11px] text-text-3 truncate">professor@joineazy.com</div>
              </button>

              <button
                type="button"
                onClick={() => handleFillDemo('student1@joineazy.com')}
                className="p-2 border border-line rounded text-left hover:bg-canvas transition-colors"
              >
                <div className="font-semibold text-brand">Student 1 (Alpha)</div>
                <div className="text-[11px] text-text-3 truncate">student1@joineazy.com</div>
              </button>
            </div>
            <p className="text-[11px] text-text-3 mt-1.5 text-center">Default password: password123</p>
          </div>

          <div className="mt-6 text-center text-sm text-text-2">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-brand hover:text-brand-dark">
              Register here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
