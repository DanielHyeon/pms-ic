/**
 * App configuration store.
 * Fetches feature flags from backend GET /api/config on init.
 * When backend is unreachable, defaults to mock mode.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8083/api';
const CONFIG_URL = API_BASE.replace(/\/api\/?$/, '') + '/api/config';

interface AppConfig {
  useMockData: boolean;
}

let _config: AppConfig = { useMockData: true };
let _loaded = false;
let _loading: Promise<AppConfig> | null = null;

export async function loadAppConfig(): Promise<AppConfig> {
  if (_loaded) return _config;
  if (_loading) return _loading;

  _loading = (async () => {
    try {
      const res = await fetch(CONFIG_URL, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const json = await res.json();
        _config = { useMockData: Boolean(json.useMockData) };
        console.log(`[AppConfig] useMockData=${_config.useMockData}`);
      } else {
        console.warn('[AppConfig] Config endpoint returned non-OK, defaulting to mock mode');
        _config = { useMockData: true };
      }
    } catch {
      console.debug('[AppConfig] Backend not reachable, defaulting to mock mode');
      _config = { useMockData: true };
    }
    _loaded = true;
    return _config;
  })();

  return _loading;
}

export function getAppConfig(): AppConfig {
  return _config;
}

export function isUseMockData(): boolean {
  return _config.useMockData;
}
