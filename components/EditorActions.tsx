import React from 'react';
import { SparklesIcon, LightBulbIcon, CodeIcon, DownloadIcon, RedoIcon, UndoIcon, VaryIcon, SaveSnapshotIcon, ViewSnapshotsIcon } from './Icon';
import Spinner from './Spinner';
import StylePresets from './StylePresets';
import { EditorMode } from './EditorPage';
import { modeConfig } from './ControlsPanel';
import { Suggestion } from '../types';

interface EditorActionsProps {
    promptText: string;
    onPromptChange: (text: string) => void;
    onImprovePrompt: () => void;
    isImprovingPrompt: boolean;
    onGetAiSuggestions: () => void;
    isAnalyzing: boolean;
    editSuggestions: Suggestion[];
    onStyleSelect: (keywords: string | null) => void;
    onGenerate: () => void;
    isLoading: boolean;
    error: string | null;
    editorMode: EditorMode;
    styleImageName: string | null;

    showFillButton: boolean;
    onFillExpanded: () => void;
    
    onDescribeImage: () => void;
    isDescribing: boolean;
    onDownloadImage: () => void;
    onUndo: () => void;
    canUndo: boolean;
    onRedo: () => void;
    canRedo: boolean;
    onVary: () => void;
    canVary: boolean;
    onSaveSnapshot: () => void;
    onViewSnapshots: () => void;
}

const EditorActions: React.FC<EditorActionsProps> = (props) => {
    const {
        promptText, onPromptChange, onImprovePrompt, isImprovingPrompt,
        onGetAiSuggestions, isAnalyzing, editSuggestions, onStyleSelect,
        onGenerate, isLoading, error, editorMode, styleImageName,
        showFillButton, onFillExpanded,
        onDescribeImage, isDescribing, onDownloadImage, onUndo, canUndo, onRedo, canRedo, onVary, canVary,
        onSaveSnapshot, onViewSnapshots,
    } = props;
    
    const currentModeConfig = modeConfig[editorMode];
    const isTransforming = ['resize', 'transform', 'change_ratio'].includes(editorMode);

    const getGenerateButtonText = () => {
        if (isLoading) return 'Generating...';
        switch (editorMode) {
            case 'enhance': return 'Enhance Image';
            case 'style_transfer': return 'Apply Style';
            case 'remove': return 'Remove Object';
            default: return 'Generate';
        }
    };

    const isGenerateDisabled = () => {
        if (isLoading || isTransforming) return true;
        if (editorMode === 'style_transfer' && !styleImageName) return true;
        if (currentModeConfig.hasPrompt && !promptText) return true;
        return false;
    };

    const getPromptPlaceholder = () => {
        switch (editorMode) {
            case 'replace_bg': return "Describe the new background...";
            case 'remove': return "Describe the object to remove...";
            case 'edit': default: return "Describe your edit...";
        }
    };

    return (
        <div className="bg-surface rounded-lg shadow-lg p-4 flex-shrink-0 border-t-4 border-bg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                
                <div className="md:col-span-2 flex flex-col gap-3">
                    {currentModeConfig.hasPrompt && (
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label htmlFor="prompt" className="text-sm font-medium text-text-tertiary">Prompt</label>
                                <button onClick={onImprovePrompt} disabled={!promptText.trim() || isImprovingPrompt} className="text-xs inline-flex items-center gap-1 text-brand-subtle-text hover:text-brand" title="Improve prompt with AI">
                                    {isImprovingPrompt ? <Spinner className="h-4 w-4" /> : <SparklesIcon className="h-4 w-4" />} Improve
                                </button>
                            </div>
                            <textarea id="prompt" value={promptText} onChange={(e) => onPromptChange(e.target.value)} placeholder={getPromptPlaceholder()} className="w-full bg-bg border border-border-muted rounded-md p-2 text-text-primary focus:ring-2 focus:ring-brand" rows={2}/>
                            <button onClick={onGetAiSuggestions} disabled={isAnalyzing} className="w-full mt-2 bg-surface-secondary hover:bg-surface-muted font-bold py-2 px-4 rounded-md inline-flex items-center justify-center text-sm">
                                {isAnalyzing ? <Spinner /> : <LightBulbIcon />} <span className="ml-2">{isAnalyzing ? 'Analyzing...' : 'Get AI Suggestions'}</span>
                            </button>
                            {editSuggestions.length > 0 && (
                                <div className="mt-2">
                                    <div className="flex flex-wrap gap-2">{editSuggestions.map((suggestion, index) => (<button key={index} onClick={() => onPromptChange(suggestion.prompt)} title={suggestion.prompt} className="bg-surface-muted hover:bg-surface-muted-hover text-xs font-medium py-1 px-3 rounded-full">{suggestion.heading}</button>))}</div>
                                </div>
                            )}
                        </div>
                    )}

                    {editorMode === 'edit' && <StylePresets onSelect={onStyleSelect} />}
                </div>

                <div className="md:col-span-1 flex flex-col gap-3">
                    <div className="flex flex-col gap-2">
                        {showFillButton && (
                            <button onClick={onFillExpanded} disabled={isLoading} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-md inline-flex items-center justify-center">
                                {isLoading ? <Spinner /> : <SparklesIcon />} <span className="ml-2">Fill Expanded Area</span>
                            </button>
                        )}
                        <button onClick={onGenerate} disabled={isGenerateDisabled()} className="w-full bg-brand hover:bg-brand-hover text-brand-text font-bold py-3 px-4 rounded-md inline-flex items-center justify-center">
                            {isLoading ? <Spinner /> : <SparklesIcon />}
                            <span className="ml-2">{getGenerateButtonText()}</span>
                        </button>
                    </div>

                    <div>
                        <h3 className="text-sm font-medium text-text-tertiary mb-2">History & Actions</h3>
                        <div className="grid grid-cols-4 gap-2">
                            <button onClick={onUndo} title="Undo" disabled={!canUndo || isTransforming} className="p-2 bg-surface-muted rounded-md disabled:opacity-50 flex items-center justify-center"><UndoIcon/></button>
                            <button onClick={onRedo} title="Redo" disabled={!canRedo || isTransforming} className="p-2 bg-surface-muted rounded-md disabled:opacity-50 flex items-center justify-center"><RedoIcon/></button>
                            <button onClick={onSaveSnapshot} title="Save Snapshot" disabled={isTransforming} className="p-2 bg-surface-muted rounded-md disabled:opacity-50 flex items-center justify-center"><SaveSnapshotIcon/></button>
                            <button onClick={onViewSnapshots} title="View Snapshots" disabled={isTransforming} className="p-2 bg-surface-muted rounded-md disabled:opacity-50 flex items-center justify-center"><ViewSnapshotsIcon/></button>
                            {editorMode === 'edit' && <button onClick={onVary} title="Vary Result" disabled={!canVary || isTransforming} className="p-2 bg-surface-muted rounded-md disabled:opacity-50 flex items-center justify-center"><VaryIcon/></button>}
                            <button onClick={onDescribeImage} title="Describe & Recreate" disabled={isDescribing || isTransforming} className="p-2 bg-surface-muted rounded-md disabled:opacity-50 flex items-center justify-center">{isDescribing ? <Spinner/> : <CodeIcon/>}</button>
                            <button onClick={onDownloadImage} title="Download" disabled={isTransforming} className="p-2 bg-surface-muted rounded-md disabled:opacity-50 flex items-center justify-center"><DownloadIcon/></button>
                        </div>
                    </div>

                    {error && <div className="p-3 bg-error-bg border border-error-border text-error-text rounded-md text-sm">{error}</div>}
                </div>
            </div>
        </div>
    );
};

export default EditorActions;