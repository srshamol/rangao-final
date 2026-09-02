import React, { Component, type ReactNode } from "react";
import { reportError, type SanitizedErrorReport } from "@/lib/errorMonitoring";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorReport: SanitizedErrorReport | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorReport: null,
    };
  }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const report = reportError(error, {
      componentStack: errorInfo.componentStack,
    });
    this.setState({ errorReport: report });
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = "/";
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 text-foreground">
          <div className="max-w-md w-full bg-card border border-border/60 rounded-2xl p-6 md:p-8 shadow-xl text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                কিছু একটা ঠিক নেই
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                দুঃখিত, অ্যাপ্লিকেশনটি রেন্ডার করতে সমস্যা হয়েছে। আমাদের টিম বিষয়টি স্বয়ংক্রিয়ভাবে লিপিবদ্ধ করেছে।
              </p>
            </div>

            {this.state.errorReport && (
              <div className="rounded-lg bg-muted/60 p-3 text-left">
                <p className="text-[11px] font-mono text-muted-foreground break-all">
                  <span className="font-semibold">ত্রুটি কোড:</span> {this.state.errorReport.id}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={this.handleReload}
              >
                <RefreshCw className="w-4 h-4" />
                রিফ্রেশ করুন
              </Button>
              <Button
                className="flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={this.handleGoHome}
              >
                <Home className="w-4 h-4" />
                হোমে যান
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
