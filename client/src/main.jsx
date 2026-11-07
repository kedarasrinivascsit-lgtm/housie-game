
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

class AppErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Unhandled React rendering error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main
          role="alert"
          style={{
            minHeight: "100vh",
            display: "grid",
            placeContent: "center",
            gap: 16,
            padding: 24,
            background: "#080d1b",
            color: "#f5f5f5",
            textAlign: "center"
          }}
        >
          <h1 style={{ color: "#d4af37" }}>Something went wrong</h1>
          <p>The game could not render. Reload the page to try again.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              justifySelf: "center",
              padding: "11px 20px",
              border: 0,
              borderRadius: 8,
              background: "#d4af37",
              color: "#101522",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Reload game
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);
