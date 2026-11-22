import React from 'react';
import { Button } from './ui';
import { Inbox } from 'lucide-react';

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div className={`p-8 text-center bg-surface border border-line rounded flex flex-col items-center justify-center space-y-3 ${className}`}>
      <div className="w-10 h-10 rounded-full bg-canvas border border-line flex items-center justify-center text-text-3">
        <Icon className="w-5 h-5" />
      </div>
      <div className="max-w-sm">
        <h4 className="text-sm font-semibold text-text">{title}</h4>
        {description && <p className="text-xs text-text-3 mt-1">{description}</p>}
      </div>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
