import { Component, type ErrorInfo, type ReactNode, lazy, Suspense } from "react";

// Lazy-load the heavy error fallback UI (Card, Button, lucide icons)
// so they don't bloat the entry chunk (~40KB savings)
const ErrorFallbackLazy = lazy(() => import("./ErrorFallbackUI"));

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// Minimal inline fallback while the fancy UI loads (or if lazy load fails)
function MinimalFallback({ onReset }: { onReset: () => void }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", background: "#f9fafb" }}>
      <div style={{ textAlign: "center", maxWidth: "400px" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#dc2626", marginBottom: ".5rem" }}>حدث خطأ غير متوقع</h2>
        <p style={{ color: "#6b7280", marginBottom: "1rem" }}>نأسف على هذا الخطأ. يرجى المحاولة مرة أخرى.</p>
        <button onClick={onReset} style={{ padding: ".5rem 1.5rem", background: "#6B4D9D", color: "#fff", border: "none", borderRadius: ".5rem", cursor: "pointer", fontSize: "1rem" }}>
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
    
    if (process.env.NODE_ENV === "production") {
      console.log("Error logged for production monitoring");
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <Suspense fallback={<MinimalFallback onReset={this.handleReset} />}>
          <ErrorFallbackLazy error={this.state.error} onReset={this.handleReset} />
        </Suspense>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
