// @ts-nocheck
import React from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground transition-colors duration-300">
          <div className="max-w-md w-full glass-panel border p-8 rounded-3xl text-center space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-12 -left-12 w-24 h-24 bg-destructive/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-destructive/10 rounded-full blur-2xl pointer-events-none" />

            <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center shadow-lg">
              <AlertTriangle className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold tracking-tight">System Render Failure</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                An unexpected javascript execution error crashed the console layout (500 Error).
              </p>
              {this.state.error && (
                <div className="mt-4 p-3 rounded-xl bg-destructive/5 border border-destructive/15 text-left text-destructive font-mono text-[10px] break-all max-h-28 overflow-y-auto">
                  {this.state.error.toString()}
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-opacity-95 transition-all shadow-md shadow-primary/20"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Interface</span>
              </button>
              <a
                href="/"
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-muted/40 hover:bg-muted/80 text-foreground border border-border/10 text-xs font-bold transition-all"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Go to Home</span>
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
