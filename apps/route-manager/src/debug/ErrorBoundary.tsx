import React, { Component, type ReactNode } from 'react';
import { addDebugError } from './debugStore';
import { AlertTriangle, RefreshCw, Bug, Copy } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  onOpenDebugCenter?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorId: string;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorId: '' };
    this.handleReload = this.handleReload.bind(this);
    this.handleOpenDebug = this.handleOpenDebug.bind(this);
    this.handleCopyError = this.handleCopyError.bind(this);
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    const errorId = `ERR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    return { hasError: true, errorId };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const safeMsg = error.message?.length > 120 ? error.message.slice(0, 120) + '…' : (error.message || 'Render error');
    addDebugError({
      category: 'crash',
      message: safeMsg,
      source: errorInfo.componentStack?.split('\n')[1]?.trim() || 'ErrorBoundary',
      pathname: window.location.pathname,
      statusCode: null,
      retryable: false,
    });
  }

  handleReload() {
    window.location.reload();
  }

  handleOpenDebug() {
    this.props.onOpenDebugCenter?.();
  }

  handleCopyError() {
    const text = `Error ID: ${this.state.errorId}\nTime: ${new Date().toISOString()}\nPath: ${window.location.pathname}`;
    navigator.clipboard.writeText(text).catch(() => { /* clipboard blocked */ });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <AlertTriangle size={32} className="text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Something went wrong</h1>
              <p className="mt-2 text-sm text-slate-400">
                The app encountered an unexpected error. Your data is safe.
              </p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <p className="text-xs text-slate-500 font-mono">Error ID: {this.state.errorId}</p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white py-3 px-4 text-sm font-black transition-all min-h-[48px]"
              >
                <RefreshCw size={16} />
                Reload App
              </button>
              <button
                onClick={this.handleOpenDebug}
                className="flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 text-white py-3 px-4 text-sm font-bold transition-all min-h-[48px]"
              >
                <Bug size={16} />
                Open Debug Center
              </button>
              <button
                onClick={this.handleCopyError}
                className="flex items-center justify-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 py-3 px-4 text-xs font-bold transition-all min-h-[48px]"
              >
                <Copy size={14} />
                Copy Error ID
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
