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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-dark-surface rounded-lg shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-gray-200 dark:border-dark-border">
                    <h3 className="text-xl font-bold text-sky-600 dark:text-sky-400">Describe & Recreate</h3>
                    <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">Edit the JSON description below and click "Recreate" to generate a new image.</p>
                </div>
                <div className="p-4 overflow-y-auto">
                    <textarea 
                        value={jsonPrompt} 
                        onChange={(e) => onJsonPromptChange(e.target.value)} 
                        className="w-full h-96 bg-gray-100 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md p-3 text-gray-800 dark:text-dark-text focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition font-mono text-sm" 
                        spellCheck="false" 
                    />
                </div>
                <div className="p-4 border-t border-gray-200 dark:border-dark-border flex justify-end gap-4">
                    <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-dark-text font-bold py-2 px-4 rounded-md transition-colors">Cancel</button>
                    <button onClick={onRecreate} className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-md inline-flex items-center justify-center transition-colors">
                        <SparklesIcon />
                        <span className="ml-2">Recreate Image</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JsonModal;