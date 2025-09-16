import React from 'react';
import { SparklesIcon } from './Icon';

interface JsonModalProps {
    isOpen: boolean;
    onClose: () => void;
    jsonPrompt: string;
    onJsonPromptChange: (value: string) => void;
    onRecreate: () => void;
}

const JsonModal: React.FC<JsonModalProps> = ({ isOpen, onClose, jsonPrompt, onJsonPromptChange, onRecreate }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50 p-4">
            <div className="bg-surface rounded-lg shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-border-base">
                    <h3 className="text-xl font-bold text-brand">Describe & Recreate</h3>
                    <p className="text-sm text-text-secondary mt-1">Edit the JSON description below and click "Recreate" to generate a new image.</p>
                </div>
                <div className="p-4 overflow-y-auto">
                    <textarea 
                        value={jsonPrompt} 
                        onChange={(e) => onJsonPromptChange(e.target.value)} 
                        className="w-full h-96 bg-bg border border-border-muted rounded-md p-3 text-text-primary focus:ring-2 focus:ring-brand focus:border-brand transition font-mono text-sm" 
                        spellCheck="false" 
                    />
                </div>
                <div className="p-4 border-t border-border-base flex justify-end gap-4">
                    <button onClick={onClose} className="bg-surface-muted hover:bg-surface-muted-hover text-text-primary font-bold py-2 px-4 rounded-md transition-colors">Cancel</button>
                    <button onClick={onRecreate} className="bg-brand hover:bg-brand-hover text-brand-text font-bold py-2 px-4 rounded-md inline-flex items-center justify-center transition-colors">
                        <SparklesIcon />
                        <span className="ml-2">Recreate Image</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JsonModal;