import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100dvh",
            padding: "2rem",
            background: "var(--color-bg, #0a0c12)",
            color: "var(--color-text, #e4e6ed)",
            fontFamily: "var(--font-body, sans-serif)",
            textAlign: "center",
            gap: "1rem",
          }}
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ff5c5c" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ color: "var(--color-text-muted, #7d829a)", maxWidth: "36ch" }}>
            The application encountered an unexpected error. Please reload the page to try again.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: "0.5rem",
              padding: "0.5rem 1.5rem",
              borderRadius: "8px",
              border: "1px solid var(--color-border, #252a3d)",
              background: "var(--color-surface-2, #171b2a)",
              color: "var(--color-text, #e4e6ed)",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
