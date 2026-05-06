import { Component, ReactNode } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) return <>{this.props.fallback}</>;
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="glass-card max-w-md w-full p-6 text-center space-y-4">
            <div className="flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>
            <div>
              <h2 className="display-font text-xl font-semibold">Algo salió mal</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Ocurrió un error inesperado al cargar esta sección.
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button onClick={this.handleReset} variant="outline">
                <RotateCw className="h-4 w-4 mr-1" /> Reintentar
              </Button>
              <Button
                onClick={() => window.location.reload()}
                className="bg-gradient-primary text-primary-foreground hover:opacity-90"
              >
                Recargar la app
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
