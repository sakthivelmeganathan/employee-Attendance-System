import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('[ErrorBoundary] Caught error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '40px',
                    fontFamily: 'Inter, sans-serif',
                    maxWidth: '600px',
                    margin: '80px auto',
                    textAlign: 'center'
                }}>
                    <h1 style={{ color: '#ef4444', fontSize: '24px', marginBottom: '16px' }}>
                        Something went wrong
                    </h1>
                    <p style={{ color: '#64748b', marginBottom: '24px' }}>
                        The application encountered an error. Please try refreshing the page.
                    </p>
                    <details style={{
                        textAlign: 'left',
                        background: '#f1f5f9',
                        padding: '16px',
                        borderRadius: '8px',
                        marginBottom: '16px'
                    }}>
                        <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#334155' }}>
                            Error Details
                        </summary>
                        <pre style={{
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            fontSize: '12px',
                            color: '#dc2626',
                            marginTop: '8px'
                        }}>
                            {this.state.error?.toString()}
                        </pre>
                        <pre style={{
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            fontSize: '11px',
                            color: '#64748b',
                            marginTop: '8px',
                            maxHeight: '200px',
                            overflow: 'auto'
                        }}>
                            {this.state.errorInfo?.componentStack}
                        </pre>
                    </details>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            background: '#4f46e5',
                            color: 'white',
                            padding: '10px 24px',
                            borderRadius: '8px',
                            border: 'none',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        Refresh Page
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
