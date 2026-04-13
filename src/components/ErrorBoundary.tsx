import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto text-red-600 dark:text-red-400">
              <AlertTriangle size={40} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Ops! Algo correu mal</h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                A aplicação encontrou um erro inesperado. Não se preocupe, os seus dados estão seguros.
              </p>
            </div>

            {this.state.error && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-left overflow-hidden">
                <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <RefreshCw size={18} />
                Recarregar
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex items-center justify-center gap-2 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                <Home size={18} />
                Início
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
