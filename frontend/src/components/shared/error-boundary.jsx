import React from "react";
import { ErrorState } from "./error-state";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught application error:", error, errorInfo);
    const msg = error?.message || "";
    const isChunkLoadError = 
      msg.includes("dynamically imported module") || 
      msg.includes("Failed to fetch") ||
      msg.includes("error loading dynamically imported module") ||
      msg.includes("Loading chunk") ||
      msg.includes("Importing a module script failed") ||
      error?.name === "ChunkLoadError";

    if (isChunkLoadError) {
      const refreshed = sessionStorage.getItem("chunk_reload_attempted");
      if (!refreshed) {
        sessionStorage.setItem("chunk_reload_attempted", "true");
        window.location.reload();
      }
    }
  }

  handleCleanReload = async () => {
    try {
      sessionStorage.clear();
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister().catch(() => {});
        }
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        for (const k of keys) {
          await caches.delete(k).catch(() => {});
        }
      }
    } catch {}
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <ErrorState
            title="App Encountered an Issue"
            description="We hit an unexpected error while loading the page. Tap below to reload."
            error={this.state.error}
            onRetry={() => {
              try {
                sessionStorage.clear();
              } catch {}
              window.location.reload();
            }}
            onCleanReload={this.handleCleanReload}
          />
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
