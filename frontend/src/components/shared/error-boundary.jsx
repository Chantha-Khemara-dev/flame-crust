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
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <ErrorState
            title="App Encountered an Issue"
            description="We hit an unexpected error while loading the page. Tap below to reload."
            onRetry={() => {
              try {
                sessionStorage.clear();
              } catch {}
              window.location.reload();
            }}
          />
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
