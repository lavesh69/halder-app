import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[HALDER ErrorBoundary] Uncaught UI render exception:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#121614] text-zinc-900 dark:text-white flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-white dark:bg-[#1B201D] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xl text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 rounded-2xl flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight">Something went wrong</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Don't worry! Your farm cart and orders are safe. Please reload the Mandi to continue.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl text-xs text-zinc-400 font-mono text-left overflow-x-auto no-scrollbar max-h-24">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="w-full sm:flex-1 min-h-[44px] py-3 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Return Home
              </button>
              <button
                onClick={this.handleReload}
                className="w-full sm:flex-1 min-h-[44px] py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Mandi
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
