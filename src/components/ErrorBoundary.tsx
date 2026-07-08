"use client";

import React from "react";
import { WarningCircle } from "@phosphor-icons/react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-[var(--surface)] border border-[var(--border)] rounded-xl m-4 text-center">
          <WarningCircle size={48} className="text-[var(--error)] mb-4" />
          <h2 className="text-lg font-bold text-[var(--ink)] font-display mb-2">Something went wrong</h2>
          <p className="text-sm text-[var(--ink-muted)] max-w-md mx-auto">
            {this.state.error?.message || "An unexpected error occurred in this component."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="mt-6 btn btn-secondary"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
