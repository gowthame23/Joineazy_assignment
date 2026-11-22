import React, { useEffect, useId, useRef, useState } from 'react';
import { Loader2, AlertCircle, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { WAKE_EVENT } from '../api/client';

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
    sm: 'h-10 px-3 text-sm',
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
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error && id ? `${id}-error` : undefined}
        className={`w-full h-10 px-3 py-2 text-sm bg-white border rounded text-text placeholder-text-3 transition-colors focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand-tint disabled:bg-canvas disabled:cursor-not-allowed ${
          error ? 'border-danger focus:border-danger focus:ring-danger-tint' : 'border-line'
        } ${className}`}
        {...props}
      />
      {error && <p id={id ? `${id}-error` : undefined} className="text-xs text-danger">{error}</p>}
      {helperText && !error && <p className="text-xs text-text-3">{helperText}</p>}
    </div>
  );
}

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

// Centred dialog on >=640px, bottom sheet on phones. Closes on Esc and overlay click.
// Moves focus into the dialog on open, keeps Tab inside it, restores focus on close.
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return undefined;

    const previouslyFocused = document.activeElement;
    const dialog = dialogRef.current;

    // Focus the first form field if there is one, otherwise the dialog itself
    const firstField = dialog?.querySelector('input, textarea, select');
    (firstField || dialog)?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !dialog) return;

      const items = Array.from(dialog.querySelectorAll(FOCUSABLE));
      if (items.length === 0) {
        e.preventDefault();
        dialog.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-ink/50">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`relative w-full ${maxWidth} max-h-[90vh] overflow-y-auto bg-surface rounded-t-lg sm:rounded-lg shadow-subtle border border-line p-6 z-10 focus:outline-none modal-panel`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
          <h3 id={titleId} className="text-lg font-semibold text-text">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-text-3 hover:text-text p-1.5 rounded hover:bg-canvas transition-colors focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

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
