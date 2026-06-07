import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class QueryErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error inside QueryErrorBoundary:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[300px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-destructive/20 bg-destructive/5 p-6 text-center shadow-sm">
          <div className="rounded-full bg-destructive/10 p-3 text-destructive animate-pulse">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h2 className="mt-4 font-display text-lg font-bold text-foreground">
            লোড করতে সমস্যা হয়েছে
          </h2>
          <p className="mt-2 max-w-md font-bengali text-sm text-muted-foreground leading-relaxed">
            দুঃখিত, তথ্য লোড করার সময় একটি অপ্রত্যাশিত ত্রুটি ঘটেছে। আপনার ইন্টারনেট কানেকশন চেক করে আবার চেষ্টা করুন।
          </p>
          <Button
            onClick={this.handleRetry}
            className="mt-6 rounded-xl bg-destructive hover:bg-destructive/90 text-white font-semibold flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" /> আবার চেষ্টা করুন
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
