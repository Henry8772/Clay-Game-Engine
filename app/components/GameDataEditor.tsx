
import React, { useState, useEffect, useMemo } from "react";

interface GameDataEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newData: any) => void;
    initialData: any;
}

type ViewMode = 'raw' | 'structured';

export const GameDataEditor: React.FC<GameDataEditorProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const [mode, setMode] = useState<ViewMode>('raw');

    // Raw Mode State
    const [rawJson, setRawJson] = useState("");

    // Structured Mode State
    const [structuredData, setStructuredData] = useState<any>({});
    const [activeTab, setActiveTab] = useState<string>("");
    const [activeTabJson, setActiveTabJson] = useState("");

    const [error, setError] = useState<string | null>(null);

    // Initialize
    useEffect(() => {
        if (isOpen && initialData) {
            const json = JSON.stringify(initialData, null, 2);
            setRawJson(json);
            setMode('raw');
            setError(null);

            // Pre-populate structured data for smoother transition if valid
            try {
                setStructuredData(initialData);
                const keys = Object.keys(initialData);
                if (keys.length > 0) setActiveTab(keys[0]);
            } catch (e) {
                // Ignore
            }
        }
    }, [isOpen, initialData]);

    const handleSwitchToStructured = () => {
        try {
            const parsed = JSON.parse(rawJson);
            if (typeof parsed !== 'object' || parsed === null) {
                throw new Error("Root must be an object");
            }
            setStructuredData(parsed);
            const keys = Object.keys(parsed);

            // Default to first tab if none selected or invalid
            let nextTab = activeTab;
            if (!nextTab || !keys.includes(nextTab)) {
                nextTab = keys[0] || "";
            }

            setActiveTab(nextTab);
            setActiveTabJson(JSON.stringify(parsed[nextTab], null, 2));
            setMode('structured');
            setError(null);
        } catch (e: any) {
            setError("Cannot switch to structured view: Invalid JSON in Raw view. " + e.message);
        }
    };

    const handleSwitchToRaw = () => {
        // Commit current tab changes to structured object first
        try {
            const currentTabValue = activeTab ? JSON.parse(activeTabJson) : undefined;
            const newData = { ...structuredData };
            if (activeTab) {
                newData[activeTab] = currentTabValue;
            }

            setRawJson(JSON.stringify(newData, null, 2));
            setMode('raw');
            setError(null);
        } catch (e: any) {
            setError("Cannot switch to Raw view: Invalid JSON in current tab. " + e.message);
        }
    };

    const handleTabChange = (newTab: string) => {
        if (newTab === activeTab) return;

        // Save current tab
        try {
            const currentVal = JSON.parse(activeTabJson);
            const newData = { ...structuredData, [activeTab]: currentVal };
            setStructuredData(newData);

            // Switch
            setActiveTab(newTab);
            setActiveTabJson(JSON.stringify(newData[newTab], null, 2));
            setError(null);
        } catch (e: any) {
            setError(`Cannot switch tabs: Invalid JSON in '${activeTab}'. fix it first.`);
        }
    };

    const handleSave = () => {
        try {
            let finalData;
            if (mode === 'raw') {
                finalData = JSON.parse(rawJson);
            } else {
                // Commit current tab
                const currentVal = JSON.parse(activeTabJson);
                finalData = { ...structuredData, [activeTab]: currentVal };
            }
            onSave(finalData);
            onClose();
        } catch (e: any) {
            setError("Save failed: Invalid JSON. " + e.message);
        }
    };

    // Derived list of tabs
    const tabs = useMemo(() => {
        return structuredData && typeof structuredData === 'object' ? Object.keys(structuredData) : [];
    }, [structuredData]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 shrink-0">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-semibold text-white">Edit Game State</h2>

                        {/* View Switcher */}
                        <div className="flex bg-black rounded p-1 border border-neutral-800">
                            <button
                                onClick={() => mode === 'structured' && handleSwitchToRaw()}
                                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${mode === 'raw' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                            >
                                Raw JSON
                            </button>
                            <button
                                onClick={() => mode === 'raw' && handleSwitchToStructured()}
                                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${mode === 'structured' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                            >
                                Structured
                            </button>
                        </div>
                    </div>

                    <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="shrink-0 bg-red-900/20 text-red-400 text-sm p-3 border-b border-red-900/50 px-6">
                        {error}
                    </div>
                )}

                {/* Main Content */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    {mode === 'raw' ? (
                        <textarea
                            className="flex-1 w-full bg-black text-green-400 font-mono text-sm p-4 focus:outline-none resize-none leading-relaxed"
                            value={rawJson}
                            onChange={(e) => setRawJson(e.target.value)}
                            spellCheck={false}
                        />
                    ) : (
                        <div className="flex h-full">
                            {/* Sidebar / Tabs */}
                            <div className="w-48 border-r border-neutral-800 bg-black/50 overflow-y-auto shrink-0">
                                {tabs.map(key => (
                                    <button
                                        key={key}
                                        onClick={() => handleTabChange(key)}
                                        className={`w-full text-left px-4 py-3 text-xs font-mono border-b border-neutral-900 transition-colors truncate
                                            ${activeTab === key ? 'bg-neutral-800 text-white border-l-2 border-l-white' : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900'}`}
                                    >
                                        {key}
                                    </button>
                                ))}
                                {tabs.length === 0 && (
                                    <div className="p-4 text-xs text-neutral-600 italic">No keys found</div>
                                )}
                            </div>

                            {/* Editor Area */}
                            <div className="flex-1 flex flex-col min-w-0 bg-black">
                                <div className="px-4 py-2 border-b border-neutral-800 text-xs font-mono text-neutral-500 flex justify-between">
                                    <span>Key: <span className="text-white">{activeTab}</span></span>
                                    <span>{activeTabJson.length} chars</span>
                                </div>
                                <textarea
                                    className="flex-1 w-full bg-transparent text-green-400 font-mono text-sm p-4 focus:outline-none resize-none leading-relaxed"
                                    value={activeTabJson}
                                    onChange={(e) => setActiveTabJson(e.target.value)}
                                    spellCheck={false}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-800 bg-neutral-900">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 text-sm font-medium bg-white text-black rounded hover:bg-neutral-200 transition-colors"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};
