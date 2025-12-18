// Runtime configuration for web and desktop modes

// Check if running in Wails desktop environment
const isDesktop = () => {
  return typeof window !== 'undefined' && window.go !== undefined;
};

let serverURL = '';

// Initialize server URL
if (isDesktop()) {
  // Desktop mode: backend runs on dynamic localhost port
  // URL will be set asynchronously after app starts
  serverURL = 'http://localhost:8080'; // fallback
} else {
  // Web mode: backend is on same origin
  serverURL = window.location.origin;
}

// Get server URL from desktop app if available
export const initializeServerURL = async () => {
  if (isDesktop() && window.go?.main?.App?.GetServerURL) {
    try {
      serverURL = await window.go.main.App.GetServerURL();
      console.log('[Desktop Mode] Backend server running at:', serverURL);
    } catch (err) {
      console.error('[Desktop Mode] Failed to get server URL:', err);
    }
  }
};

export const getServerURL = () => serverURL;

export const getAPIBase = () => `${getServerURL()}/api`;

export const isDesktopMode = isDesktop;

// Global type declaration for Wails
declare global {
  interface Window {
    go?: {
      main?: {
        App?: {
          GetServerURL: () => Promise<string>;
          SelectDirectory: () => Promise<string>;
          SelectFile: () => Promise<string>;
          GetAppInfo: () => Promise<{
            version: string;
            dataPath: string;
            outputPath: string;
            configPath: string;
            serverURL: string;
          }>;
        };
      };
    };
  }
}

