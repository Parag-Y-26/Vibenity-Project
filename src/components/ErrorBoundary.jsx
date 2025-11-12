import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });

    // Log to error reporting service in production
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10 mb-6">
                <AlertTriangle className="w-10 h-10 text-destructive" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Oops! Something went wrong</h1>
              <p className="text-muted-foreground">
                We're sorry for the inconvenience. The application encountered an unexpected error.
              </p>
            </div>

            {/* Error Details */}
            <div className="mb-8 p-6 rounded-lg border border-destructive/30 bg-destructive/5">
              <h3 className="font-semibold mb-2 text-destructive">Error Details</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Message:</span>
                  <p className="text-muted-foreground mt-1">{this.state.error?.toString()}</p>
                </div>
                
                {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                  <details className="mt-4">
                    <summary className="cursor-pointer font-medium hover:text-foreground">
                      Stack Trace (Development Only)
                    </summary>
                    <pre className="mt-2 p-4 bg-muted rounded text-xs overflow-auto max-h-64 scrollbar-thin">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={this.handleReset}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Try Again
              </button>
              
              <button
                onClick={this.handleReload}
                className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors flex items-center justify-center gap-2"
              >
                <Home className="w-5 h-5" />
                Reload Application
              </button>
            </div>

            {/* Help Text */}
            <div className="mt-8 p-4 rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">
              <p>If the problem persists, please try:</p>
              <ul className="mt-2 space-y-1">
                <li>• Clearing your browser cache</li>
                <li>• Checking your internet connection</li>
                <li>• Using a different browser</li>
                <li>• Contacting support if the issue continues</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
