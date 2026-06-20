/**
 * Error Boundary Component
 * 
 * Catches React errors and displays a user-friendly error message.
 * Prevents the entire app from crashing due to component errors.
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Log to desktop logger if available
    if (typeof window !== 'undefined' && (window as any).desktopAPI) {
      (window as any).desktopAPI.logError('React error boundary', error);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleSendLogs = async () => {
    if (typeof window !== 'undefined' && (window as any).desktopAPI) {
      try {
        await (window as any).desktopAPI.sendLogs();
        alert('Logs sent successfully!');
      } catch (error) {
        console.error('Failed to send logs:', error);
        alert('Failed to send logs. Please try again.');
      }
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Something went wrong</h2>
              <p className="text-gray-400">
                An unexpected error occurred. The app has been stabilized.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={this.handleReload}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
              >
                Reload Application
              </button>
              <button
                onClick={this.handleSendLogs}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg font-medium transition-colors"
              >
                Send Error Logs
              </button>
            </div>

            {this.state.error && (
              <details className="mt-6">
                <summary className="text-gray-500 text-sm cursor-pointer hover:text-gray-400">
                  Error Details
                </summary>
                <pre className="mt-2 bg-gray-900 p-4 rounded-lg text-xs text-red-400 overflow-auto max-h-40">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
