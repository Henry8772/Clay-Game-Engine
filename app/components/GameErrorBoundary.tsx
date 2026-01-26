"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class GameErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error in Game Component:", error, errorInfo);
    }

    public resetErrorBoundary = () => {
        this.setState({ hasError: false, error: null });
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-full w-full bg-neutral-950 text-white p-6 border border-red-900/50 rounded-lg">
                    <div className="w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center mb-4 text-red-500">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-semibold mb-2">Game Runtime Error</h2>
                    <p className="text-neutral-400 text-sm mb-6 text-center max-w-md font-mono bg-black p-2 rounded border border-neutral-900">
                        {this.state.error?.message || "Unknown error occurred"}
                    </p>
                    <button
                        className="px-4 py-2 bg-white text-black text-sm font-medium rounded hover:bg-neutral-200 transition-colors"
                        onClick={this.resetErrorBoundary}
                    >
                        Retry Game
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
