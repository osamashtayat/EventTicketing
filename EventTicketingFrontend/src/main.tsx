import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { parseConfig } from './app/config';
import { authTransport } from './app/session';
import { configureApi } from './lib/api/client';
import './styles/globals.css';
const root = document.getElementById('root');
if (!root) throw new Error('Application root is missing.');
let configurationError: string | undefined;
try {
  configureApi(parseConfig(import.meta.env.VITE_API_BASE_URL, import.meta.env.PROD), authTransport);
} catch (error) {
  configurationError = error instanceof Error ? error.message : 'Invalid API configuration.';
}
createRoot(root).render(
  <StrictMode>
    {configurationError ? (
      <main className="container">
        <h1>API configuration needed</h1>
        <p role="alert">{configurationError}</p>
      </main>
    ) : (
      <App />
    )}
  </StrictMode>,
);
