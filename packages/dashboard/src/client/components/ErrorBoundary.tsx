/**
 * Error Boundary Component
 *
 * Catches React errors and displays a fallback UI.
 */

import React, { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Dashboard error:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-dark-bg text-dark-text flex items-center justify-center p-6">
          <div className="card max-w-md text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-dark-muted mb-4">
              The dashboard encountered an error. Try refreshing the page.
            </p>
            {this.state.error && (
              <pre className="text-xs text-left bg-dark-bg p-3 rounded overflow-auto max-h-32 text-severity-error">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary mt-4"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
