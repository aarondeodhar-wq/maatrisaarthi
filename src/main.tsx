import React, { StrictMode, Component, ErrorInfo, ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled app error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-3xl">
              🏥
            </div>
            <h1 className="text-xl font-black text-teal-400">MaatriSaarthi</h1>
            <p className="text-sm text-slate-300">
              The application encountered a temporary display issue.
            </p>
            {this.state.error?.message && (
              <pre className="text-xs text-rose-300 bg-rose-950/40 p-3 rounded-xl overflow-x-auto text-left font-mono">
                {this.state.error.message}
              </pre>
            )}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl text-sm transition-colors cursor-pointer"
              >
                Reload Application
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Clear Local Cache & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
)

