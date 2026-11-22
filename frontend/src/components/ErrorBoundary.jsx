import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './ui';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
          <div className="bg-surface max-w-md w-full p-6 rounded border border-line shadow-subtle text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-danger-tint text-danger flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text">Something went wrong</h2>
              <p className="text-xs text-text-2 mt-1">
                An unexpected application error occurred. You can reload the page to restore state.
              </p>
            </div>
            <Button variant="primary" onClick={this.handleReload} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" /> Reload Application
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
