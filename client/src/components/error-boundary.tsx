import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Last-resort catch for a render crash: without it React unmounts the whole
 * tree and the visitor is left on a blank white page with no way forward.
 * Plain markup/inline-safe classes only — the providers (theme, query…) may
 * be what failed, so nothing here depends on them.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Erreur d'affichage non gérée :", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div role="alert" className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
        <div className="max-w-md space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Un problème est survenu</h1>
          <p className="text-muted-foreground">
            La page n'a pas pu s'afficher. Rechargez-la ; si le problème continue, revenez à l'accueil.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="h-11 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Recharger la page
            </button>
            <a
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-md border border-input px-5 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Retour à l'accueil
            </a>
          </div>
        </div>
      </div>
    );
  }
}
