import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Void Launcher UI crashed", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="grid h-screen place-items-center bg-void-950 p-8 text-white">
          <section className="max-w-lg rounded-2xl border border-red-500/20 bg-void-900 p-6 shadow-2xl">
            <p className="text-xs font-bold tracking-[0.22em] text-red-300 uppercase">Interface error</p>
            <h1 className="mt-2 text-xl font-bold">The launcher could not be rendered.</h1>
            <p className="mt-3 select-text font-mono text-xs leading-6 text-ink-300">
              {this.state.error.message}
            </p>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
