import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { WAKE_EVENT } from '../api/client';

// 1. Button Component
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  type = 'button',
  onClick,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed';
  
  const sizeStyles = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-11 px-5 text-base',
  };

  const variantStyles = {
    primary: 'bg-brand text-white hover:bg-brand-dark',
    secondary: 'bg-white border border-line text-text hover:bg-canvas shadow-subtle',
    danger: 'bg-danger text-white hover:opacity-90',
    ghost: 'bg-transparent text-text-2 hover:text-text hover:bg-canvas',
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  );
}

// 2. Input Component
export function Input({
  label,
  id,
  error,
  helperText,
  className = '',
  required = false,
  ...props
}) {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-text">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <input
        id={id}
        className={`w-full h-10 px-3 py-2 text-sm bg-white border rounded text-text placeholder-text-3 transition-colors focus:outline-none focus:border-brand focus:ring-3 focus:ring-brand-tint disabled:bg-canvas disabled:cursor-not-allowed ${
          error ? 'border-danger focus:border-danger focus:ring-danger-tint' : 'border-line'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      {helperText && !error && <p className="text-xs text-text-3">{helperText}</p>}
    </div>
  );
}

// 3. Status Badge Component
export function Badge({ status, text, className = '' }) {
  const config = {
    submitted: {
      bg: 'bg-success-tint',
      text: 'text-success',
      label: 'Submitted',
    },
    awaiting: {
      bg: 'bg-warning-tint',
      text: 'text-warning',
      label: 'Awaiting confirmation',
    },
    not_submitted: {
      bg: 'bg-neutral-tint',
      text: 'text-text-2',
      label: 'Not submitted',
    },
    overdue: {
      bg: 'bg-danger-tint',
      text: 'text-danger',
      label: 'Overdue',
    },
    'no-group': {
      bg: 'bg-neutral-tint',
      text: 'text-text-3',
      label: 'No group',
    },
  };

  const style = config[status] || {
    bg: 'bg-neutral-tint',
    text: 'text-text-2',
    label: text || status,
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text} ${className}`}
    >
      {text || style.label}
    </span>
  );
}

// 4. Progress Bar Component
export function ProgressBar({ current, total, showLabel = true, className = '' }) {
  const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  const isComplete = percent === 100;

  return (
    <div className={`w-full space-y-1 ${className}`}>
      <div
        className="w-full h-2 bg-line rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            isComplete ? 'bg-success' : 'bg-brand'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between items-center text-xs text-text-2">
          <span>{percent}% completed</span>
          <span>{current} of {total}</span>
        </div>
      )}
    </div>
  );
}

// 5. Spinner Loader
export function Spinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={`flex justify-center items-center py-6 ${className}`}>
      <Loader2 className={`${sizes[size]} text-brand animate-spin`} />
    </div>
  );
}

// 6. Alert Component
export function Alert({ variant = 'danger', message, action, onAction, className = '' }) {
  const styles = {
    danger: 'bg-danger-tint border-danger/30 text-danger',
    warning: 'bg-warning-tint border-warning/30 text-warning',
    success: 'bg-success-tint border-success/30 text-success',
    info: 'bg-brand-tint border-brand/30 text-brand-dark',
  };

  const icons = {
    danger: AlertCircle,
    warning: AlertTriangle,
    success: CheckCircle2,
    info: AlertCircle,
  };

  const IconComponent = icons[variant] || AlertCircle;

  return (
    <div className={`flex items-start justify-between p-3.5 border rounded text-sm ${styles[variant]} ${className}`}>
      <div className="flex items-start gap-2.5">
        <IconComponent className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <span className="font-medium">{message}</span>
      </div>
      {action && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="text-xs font-semibold underline ml-4 hover:opacity-80"
        >
          {action}
        </button>
      )}
    </div>
  );
}

// 7. Modal Component
export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 transition-opacity">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative w-full ${maxWidth} bg-surface rounded shadow-lg border border-line p-6 z-10 animate-in fade-in-90 zoom-in-95`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
          <h3 className="text-lg font-semibold text-text">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-text-3 hover:text-text p-1 rounded hover:bg-canvas transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

// 8. WakeBanner Component
export function WakeBanner() {
  const [isWaking, setIsWaking] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      setIsWaking(Boolean(e.detail?.isWaking));
    };
    window.addEventListener(WAKE_EVENT, handler);
    return () => window.removeEventListener(WAKE_EVENT, handler);
  }, []);

  if (!isWaking) return null;

  return (
    <div className="bg-warning text-white px-4 py-2 text-xs font-medium text-center shadow-sm fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2">
      <Loader2 className="w-3.5 h-3.5 animate-spin" />
      <span>Waking up the server. The first request after a quiet period can take up to a minute.</span>
    </div>
  );
}

// 9. StatCard Component
export function StatCard({ label, value, subtitle, icon: Icon, className = '' }) {
  return (
    <div className={`bg-surface p-5 rounded border border-line shadow-subtle ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide font-semibold text-text-3">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-text-3" />}
      </div>
      <div className="text-[28px] font-semibold leading-tight text-text mb-1">{value}</div>
      {subtitle && <div className="text-xs text-text-2">{subtitle}</div>}
    </div>
  );
}
