import { Component } from 'react';
import type { ReactNode } from 'react';
import { Router } from './router';
import { Providers } from './providers';
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="container">
        <h1>Unable to display this page</h1>
        <p>Reload to try again.</p>
        <a href="/events">Return to events</a>
      </div>
    ) : (
      this.props.children
    );
  }
}
export function App() {
  return (
    <ErrorBoundary>
      <Providers>
        <Router />
      </Providers>
    </ErrorBoundary>
  );
}
