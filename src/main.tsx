import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const RELOAD_GUARD_KEY = 'intramed_chunk_reload_at';

function tryAutoReloadOnce(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || '0');
    if (Date.now() - last > 15_000) {
      sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
      window.location.reload();
      return true;
    }
  } catch {
    // Ignore storage errors
  }
  return false;
}

// Recover automatically from stale Vite dynamic imports after a new deploy
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  tryAutoReloadOnce();
});

class GlobalErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown) {
    const msg = error instanceof Error ? error.message : String(error || '');
    return { hasError: true, message: msg };
  }

  componentDidCatch(error: unknown) {
    const msg = error instanceof Error ? error.message : String(error || '');
    const isChunkError =
      /dynamically imported module|Loading chunk|Importing a module script failed|Failed to fetch/i.test(
        msg
      );
    if (isChunkError) {
      tryAutoReloadOnce();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-6">
          <div className="max-w-sm w-full rounded-2xl border border-white/10 bg-slate-900 p-6 text-center space-y-4 shadow-2xl">
            <h1 className="text-lg font-bold">Atualização disponível</h1>
            <p className="text-sm text-slate-300">
              O aplicativo foi atualizado ou encontrou um erro ao carregar esta tela.
            </p>
            <button
              type="button"
              onClick={() => {
                try {
                  sessionStorage.clear();
                } catch {
                  // Ignore
                }
                window.location.reload();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-400 text-slate-950 font-bold text-sm hover:bg-amber-300 transition"
            >
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>
);
