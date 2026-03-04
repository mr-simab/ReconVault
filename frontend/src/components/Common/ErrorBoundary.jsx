import React from 'react';
import { motion } from 'framer-motion';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo);
    }
  }

  logErrorToService(error, errorInfo) {
    // In production, send to error tracking service (e.g., Sentry)
    console.log('[ErrorBoundary] Would log to external service:', {
      error: error.toString(),
      componentStack: errorInfo.componentStack
    });
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

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <div className="min-h-screen bg-cyber-black flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl w-full"
          >
            {/* Error Card */}
            <div className="bg-gradient-to-br from-danger-red/20 to-cyber-dark border-2 border-danger-red rounded-lg p-8 shadow-2xl">
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-danger-red/20 rounded-full flex items-center justify-center">
                  <svg 
                    className="w-12 h-12 text-danger-red"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                    />
                  </svg>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-3xl font-bold text-danger-red text-center mb-2 font-mono">
                System Error
              </h1>
              
              <p className="text-gray-400 text-center mb-6">
                {isDevelopment 
                  ? 'A component error has occurred. See details below.'
                  : 'An unexpected error occurred. Our team has been notified.'
                }
              </p>

              {/* Error Count Badge */}
              {this.state.errorCount > 1 && (
                <div className="mb-4 text-center">
                  <span className="inline-block bg-warning-yellow/20 text-warning-yellow px-3 py-1 rounded-full text-sm font-mono">
                    Error occurred {this.state.errorCount} times
                  </span>
                </div>
              )}

              {/* Error Details (Development Only) */}
              {isDevelopment && this.state.error && (
                <div className="mb-6 bg-cyber-darker rounded-lg p-4 border border-danger-red/30">
                  <h3 className="text-danger-red font-mono font-bold mb-2 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Error Details
                  </h3>
                  
                  <div className="space-y-2">
                    <div>
                      <span className="text-gray-500 text-sm">Message:</span>
                      <pre className="text-danger-red text-sm mt-1 overflow-x-auto whitespace-pre-wrap break-words">
                        {this.state.error.toString()}
                      </pre>
                    </div>
                    
                    {this.state.errorInfo && this.state.errorInfo.componentStack && (
                      <div>
                        <span className="text-gray-500 text-sm">Component Stack:</span>
                        <pre className="text-gray-400 text-xs mt-1 overflow-x-auto max-h-48 overflow-y-auto bg-cyber-black/50 p-2 rounded">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={this.handleReset}
                  className="px-6 py-3 bg-neon-green text-cyber-black rounded-lg font-mono font-bold hover:bg-neon-green/80 transition-colors flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Try Again
                </button>
                
                <button
                  onClick={this.handleReload}
                  className="px-6 py-3 bg-cyber-purple text-white rounded-lg font-mono font-bold hover:bg-cyber-purple/80 transition-colors flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reload Page
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="px-6 py-3 bg-gray-700 text-white rounded-lg font-mono font-bold hover:bg-gray-600 transition-colors flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Go Home
                </button>
              </div>

              {/* Help Text */}
              <div className="mt-6 text-center text-gray-500 text-sm">
                <p>If the problem persists, please contact support.</p>
              </div>
            </div>

            {/* Additional Info */}
            {isDevelopment && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-4 bg-cyber-dark border border-neon-green/30 rounded-lg p-4"
              >
                <h4 className="text-neon-green font-mono font-bold mb-2 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Development Tips
                </h4>
                <ul className="text-gray-400 text-sm space-y-1 ml-6 list-disc">
                  <li>Check the browser console for additional error details</li>
                  <li>Verify all required props are being passed correctly</li>
                  <li>Ensure data fetching is handling errors properly</li>
                  <li>Check for null/undefined values in render logic</li>
                </ul>
              </motion.div>
            )}
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
