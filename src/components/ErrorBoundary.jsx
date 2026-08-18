import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        console.error('Uncaught error:', error, info);
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-[#F3F9F7] p-6">
                    <div className="text-center p-8 md:p-10 border border-emerald-100 rounded-3xl bg-white max-w-md w-full shadow-xl">
                        <div className="flex justify-center text-amber-500 mb-4">
                            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-100">
                                <AlertTriangle size={36} strokeWidth={2} />
                            </div>
                        </div>
                        <h1 className="text-2xl font-extrabold text-teal-950 mb-2">Something went wrong</h1>
                        <p className="text-slate-500 text-sm leading-relaxed mb-6">Mop ran into an unexpected issue. Try reloading the application.</p>
                        <button
                            className="inline-flex items-center justify-center gap-2 w-full py-3 px-5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all text-sm"
                            onClick={this.handleReload}
                        >
                            <RefreshCw size={16} />
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
