import { createRoot } from 'react-dom/client';
import { loadViewerConfig } from './config/viewerConfig';
import './styles/globals.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);

/**
 * Config must resolve before the app module is even evaluated.
 *
 * AppContext reads the tenant list and map theme at module scope, so a static
 * `import App from './App'` would run getViewerConfig() at import time —
 * before this file's body executes — and throw before anything rendered. The
 * dynamic import defers that evaluation until the config is in place.
 */
loadViewerConfig()
  .then(async () => {
    const { default: App } = await import('./App');
    root.render(<App />);
  })
  .catch((error: unknown) => {
    console.error('[viewer] failed to load configuration', error);
    root.render(
      <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
        <h1>Configuration error</h1>
        <p>
          Could not load <code>config.json</code> (or <code>config.example.json</code>).
          Copy <code>public/config.example.json</code> to <code>public/config.json</code>
          and adjust it for your environment.
        </p>
      </div>,
    );
  });
