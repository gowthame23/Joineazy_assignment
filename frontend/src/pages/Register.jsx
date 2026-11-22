import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Button, Input, Alert } from '../components/ui';

export function Register() {
  const [role, setRole] = useState('student'); // 'student' | 'admin'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const errs = {};
    if (!name.trim()) errs.name = 'Please enter your full name.';
    if (!email.trim()) errs.email = 'Please enter your email address.';
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = 'Enter a valid email address.';
    if (password.length < 6) errs.password = 'Password must be at least 6 characters.';
    if (role === 'admin' && !adminCode.trim()) errs.adminCode = 'Invite code is required to register as a professor.';
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsLoading(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        studentId: role === 'student' && studentId.trim() ? studentId.trim() : null,
        adminCode: role === 'admin' ? adminCode.trim() : null,
      };

      const res = await api.post('/api/auth/register', payload);
      register(res.token, res.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded bg-brand text-white font-bold text-2xl mb-3">
          J
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-ink">
          Create an account
        </h2>
        <p className="mt-1 text-sm text-text-2">
          Join Joineazy to manage your groups and assignments
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface py-8 px-6 sm:px-10 rounded border border-line shadow-subtle">
          {error && <Alert variant="danger" message={error} className="mb-5" />}

          <div className="flex bg-canvas p-1 rounded border border-line mb-5">
            <button
              type="button"
              onClick={() => { setRole('student'); setFieldErrors({}); }}
              aria-pressed={role === 'student'}
              className={`flex-1 py-1.5 text-xs font-semibold rounded transition-colors ${
                role === 'student'
                  ? 'bg-surface text-ink shadow-subtle'
                  : 'text-text-3 hover:text-text'
              }`}
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => { setRole('admin'); setFieldErrors({}); }}
              aria-pressed={role === 'admin'}
              className={`flex-1 py-1.5 text-xs font-semibold rounded transition-colors ${
                role === 'admin'
                  ? 'bg-surface text-ink shadow-subtle'
                  : 'text-text-3 hover:text-text'
              }`}
            >
              Professor (Admin)
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Input
              label="Full Name"
              id="name"
              type="text"
              autoComplete="name"
              error={fieldErrors.name}
              placeholder={role === 'admin' ? 'Dr. Jane Smith' : 'Alex Johnson'}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <Input
              label="Email address"
              id="email"
              type="email"
              autoComplete="email"
              error={fieldErrors.email}
              placeholder="alex@joineazy.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              label="Password (min 6 characters)"
              id="password"
              type="password"
              autoComplete="new-password"
              error={fieldErrors.password}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {role === 'student' ? (
              <Input
                label="Student ID (Optional)"
                id="studentId"
                type="text"
                placeholder="e.g. STU1001"
                helperText="Can be used by team leaders to find and add you to groups."
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
            ) : (
              <Input
                label="Professor Invite Code"
                id="adminCode"
                type="password"
                autoComplete="off"
                error={fieldErrors.adminCode}
                placeholder="Enter invite code"
                helperText="Use demo code: joineazy-prof-2026"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
              />
            )}

            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="w-full mt-2"
            >
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-text-2">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-brand hover:text-brand-dark">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
