import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Coffee, RefreshCw } from 'lucide-react';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

// Catches render-time crashes anywhere below it in the tree. Without this,
// a single unhandled error in any component blanks the entire screen with
// nothing on it — which is especially bad for non-technical cafe staff
// trying to use this during a busy shift. This does NOT catch errors in
// async code (e.g. a failed fetch) — those are handled per-component with
// their own try/catch and error state, same as before.
//
// This logs to the browser console only. If you want real error tracking
// (an email/dashboard alert when something breaks for a real user), the
// next step is wiring up a free Sentry account — ask me when you're ready,
// it's a ~20 minute add and needs your own Sentry account/DSN key.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Qafé crashed:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-cream-50 px-4 text-center">
          <Coffee className="h-10 w-10 text-coffee-300" />
          <h1 className="mt-4 font-display text-xl font-semibold text-coffee-900">Something went wrong</h1>
          <p className="mt-2 max-w-xs text-sm text-coffee-500">
            Sorry about that — please try reloading the page. If it keeps happening, let us know.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 flex items-center gap-2 rounded-2xl bg-coffee-900 px-6 py-3 text-sm font-semibold text-cream-50 transition-colors hover:bg-coffee-800"
          >
            <RefreshCw className="h-4 w-4" />
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
