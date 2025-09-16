import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UploadIcon, SparklesIcon, EraserIcon, LightBulbIcon, WandIcon, RefreshIcon, HomeIcon, BrushIcon, CodeIcon, DownloadIcon, EnhanceIcon, RedoIcon, RemoveObjectIcon, ReplaceBackgroundIcon, UndoIcon, VaryIcon, StyleTransferIcon, SaveSnapshotIcon, ViewSnapshotsIcon, ResizeIcon } from './Icon';
import Spinner from './Spinner';
import StylePresets from './StylePresets';
import { EditorMode, Tool } from './EditorPage';
import AiFilters from './AiFilters';

export const modeConfig: Record<EditorMode, { name: string; icon: React.FC<any>; hasPrompt: boolean; hasMasking: boolean; }> = {
    edit: { name: "Edit", icon: BrushIcon, hasPrompt: true, hasMasking: true },
    remove: { name: "Remove", icon: RemoveObjectIcon, hasPrompt: false, hasMasking: true },
    replace_bg: { name: "Replace BG", icon: ReplaceBackgroundIcon, hasPrompt: true, hasMasking: true },
    enhance: { name: "Enhance", icon: EnhanceIcon, hasPrompt: false, hasMasking: false },
    style_transfer: { name: "Style Transfer", icon: StyleTransferIcon, hasPrompt: false, hasMasking: false },
};

interface ControlsPanelProps {
    onGoHome: () => void;
    onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onStyleImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    styleImageName: string | null;
    promptText: string;
    onPromptChange: (text: string) => void;
    onImprovePrompt: () => void;
    isImprovingPrompt: boolean;
    onGetAiSuggestions: () => void;
    isAnalyzing: boolean;
    editSuggestions: string[];
    onStyleSelect: (keywords: string | null) => void;
    brushSize: number;
    onBrushSizeChange: (size: number) => void;
    onClearMask: () => void;
    onGenerate: () => void;
    isLoading: boolean;
    error: string | null;
    isImageLoaded: boolean;
    editorMode: EditorMode;
    setEditorMode: (mode: EditorMode) => void;
    currentTool: Tool;
    setCurrentTool: (tool: Tool) => void;
    maskPrompt: string;
    onMaskPromptChange: (text: string) => void;
    onMaskByText: () => void;
    isMaskingByText: boolean;
    onApplyFilter: (prompt: string) => void;
    showFillButton: boolean;
    onFillExpanded: () => void;

    // From Toolbar
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
    onToggleResize: () => void;
    isResizing: boolean;
    onConfirmResize: () => void;
    onCancelResize: () => void;
}

const BrushSizeSlider: React.FC<{
    value: number;
    onChange: (value: number) => void;
    disabled: boolean;
}> = ({ value, onChange, disabled }) => {
    const [isPreviewVisible, setIsPreviewVisible] = useState<boolean>(false);
    const [previewPosition, setPreviewPosition] = useState<number>(0);
    const sliderRef = useRef<HTMLInputElement>(null);

    const updatePreviewPosition = useCallback(() => {
        const slider = sliderRef.current;
        if (!slider) return;
        const min = +slider.min;
        const max = +slider.max;
        const val = +slider.value;
        const width = slider.clientWidth;
        const thumbWidth = 16;
        const percent = (val - min) / (max - min);
        const thumbPosition = percent * (width - thumbWidth) + (thumbWidth / 2);
        setPreviewPosition(thumbPosition);
    }, []);

    useEffect(() => {
        const slider = sliderRef.current;
        if (!slider) return;
        const resizeObserver = new ResizeObserver(updatePreviewPosition);
        resizeObserver.observe(slider);
        updatePreviewPosition();
        return () => resizeObserver.disconnect();
    }, [updatePreviewPosition]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(Number(e.target.value));
        updatePreviewPosition();
    };

    return (
        <div className="relative pt-8">
            {isPreviewVisible && (
                <div 
                    className="absolute top-0 flex items-center justify-center p-2 bg-surface/80 rounded-md pointer-events-none ring-1 ring-border-muted"
                    style={{
                        left: `${previewPosition}px`,
                        transform: 'translateX(-50%)',
                        width: '110px',
                        height: '110px',
                    }}
                >
                    <div style={{
                        width: `${value}px`,
                        height: `${value}px`,
                        backgroundColor: 'rgba(139, 92, 246, 0.5)',
                        borderRadius: '50%',
                    }} />
                </div>
            )}
            <input
                ref={sliderRef}
                id="brush-size"
                type="range"
                min="5"
                max="100"
                value={value}
                onMouseDown={() => setIsPreviewVisible(true)}
                onMouseUp={() => setIsPreviewVisible(false)}
                onMouseLeave={() => setIsPreviewVisible(false)}
                onChange={handleChange}
                className="w-full h-2 bg-surface-muted rounded-lg appearance-none cursor-pointer"
                disabled={disabled}
            />
        </div>
    );
};


const ControlsPanel: React.FC<ControlsPanelProps> = (props) => {
    const {
        onGoHome, onImageUpload, onStyleImageUpload, styleImageName, promptText, onPromptChange, onImprovePrompt, isImprovingPrompt,
        onGetAiSuggestions, isAnalyzing, editSuggestions, onStyleSelect,
        brushSize, onBrushSizeChange, onClearMask, onGenerate,
        isLoading, error, editorMode, setEditorMode, currentTool, setCurrentTool,
        maskPrompt, onMaskPromptChange, onMaskByText, isMaskingByText, onApplyFilter,
        showFillButton, onFillExpanded,
        onDescribeImage, isDescribing, onDownloadImage, onUndo, canUndo, onRedo, canRedo, onVary, canVary,
        onSaveSnapshot, onViewSnapshots, onToggleResize, isResizing, onConfirmResize, onCancelResize
    } = props;

    const currentModeConfig = modeConfig[editorMode];

    const getGenerateButtonText = () => {
        if (isLoading) return 'Generating...';
        switch (editorMode) {
            case 'enhance': return 'Enhance Image';
            case 'style_transfer': return 'Apply Style';
            default: return 'Generate';
        }
    };
    
    const isGenerateDisabled = () => {
        if (isLoading || isResizing) return true;
        if (editorMode === 'style_transfer' && !styleImageName) return true;
        if (currentModeConfig.hasPrompt && !promptText) return true;
        return false;
    };

    return (
        <div className="bg-surface p-4 rounded-lg shadow-lg flex flex-col gap-4 h-full">
             <div className="flex items-center gap-2 pb-2 border-b border-border-base">
                <button onClick={onGoHome} className="p-2 bg-surface-muted hover:bg-surface-muted-hover text-text-primary rounded-md transition-colors" title="Back to Home"><HomeIcon /></button>
                <label htmlFor="file-upload" className="flex-grow cursor-pointer bg-surface-secondary hover:bg-surface-muted text-text-primary font-bold py-2 px-4 rounded-md inline-flex items-center justify-center transition-colors">
                    <UploadIcon />
                    <span className="ml-2">Change Image</span>
                </label>
                <input id="file-upload" type="file" accept="image/*" onChange={onImageUpload} className="hidden" />
             </div>

            <fieldset disabled={isResizing} className="flex flex-col gap-4 disabled:opacity-50">
                <div>
                    <h3 className="text-sm font-medium text-text-tertiary mb-2">Tools</h3>
                    <div className="grid grid-cols-5 gap-2">
                        {Object.entries(modeConfig).map(([key, { name, icon: Icon }]) => (
                            <button
                                key={key}
                                onClick={() => setEditorMode(key as EditorMode)}
                                title={name}
                                className={`p-2 rounded-md flex flex-col items-center justify-center text-xs gap-1 ${editorMode === key ? 'bg-brand text-brand-text' : 'bg-surface-muted hover:bg-surface-muted-hover text-text-tertiary'}`}
                            >
                                <Icon className="h-5 w-5" />
                                <span>{name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                     {currentModeConfig.hasMasking && (
                        <div className="p-3 bg-bg rounded-lg">
                            <h4 className="text-sm font-medium text-text-tertiary mb-2">Masking Options</h4>
                            <div className="flex items-center gap-2 mb-2">
                                <button onClick={() => setCurrentTool('brush')} title="Brush Tool" className={`flex-1 py-2 px-3 rounded-md text-sm inline-flex items-center justify-center gap-2 ${currentTool === 'brush' ? 'bg-brand text-brand-text' : 'bg-surface-muted hover:bg-surface-muted-hover text-text-tertiary'}`}>
                                    <BrushIcon /> Brush
                                </button>
                                <button onClick={() => setCurrentTool('eraser')} title="Eraser Tool" className={`flex-1 py-2 px-3 rounded-md text-sm inline-flex items-center justify-center gap-2 ${currentTool === 'eraser' ? 'bg-brand text-brand-text' : 'bg-surface-muted hover:bg-surface-muted-hover text-text-tertiary'}`}>
                                    <EraserIcon /> Eraser
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                               <input type="text" placeholder="e.g., 'the person'" value={maskPrompt} onChange={(e) => onMaskPromptChange(e.target.value)}
                                   className="flex-grow bg-surface border border-border-muted rounded-md p-2 text-sm text-text-primary focus:ring-2 focus:ring-brand" disabled={isMaskingByText} />
                               <button onClick={onMaskByText} disabled={!maskPrompt.trim() || isMaskingByText}
                                   className="bg-surface-muted hover:bg-surface-muted-hover font-bold p-2 rounded-md" title="Auto-mask from text">
                                {isMaskingByText ? <Spinner className="h-5 w-5" /> : <WandIcon className="h-5 w-5" />}
                               </button>
                            </div>
                            <div className="mt-2">
                                <p className="text-sm font-medium text-text-tertiary mb-2">Brush Size: {brushSize}px</p>
                                <BrushSizeSlider value={brushSize} onChange={onBrushSizeChange} disabled={false} />
                            </div>
                        </div>
                    )}

                    {currentModeConfig.hasPrompt && (
                         <div>
                            <div className="flex justify-between items-center mb-2">
                                <label htmlFor="prompt" className="text-sm font-medium text-text-tertiary">Prompt</label>
                                <button onClick={onImprovePrompt} disabled={!promptText.trim() || isImprovingPrompt}
                                    className="text-xs inline-flex items-center gap-1 text-brand-subtle-text hover:text-brand" title="Improve prompt with AI">
                                    {isImprovingPrompt ? <Spinner className="h-4 w-4" /> : <SparklesIcon className="h-4 w-4" />} Improve
                                </button>
                            </div>
                            <textarea id="prompt" value={promptText} onChange={(e) => onPromptChange(e.target.value)}
                                placeholder={(editorMode === 'replace_bg' ? "Describe the new background..." : "Describe your edit...")}
                                className="w-full bg-bg border border-border-muted rounded-md p-3 text-text-primary focus:ring-2 focus:ring-brand" rows={3}/>
                            <button onClick={onGetAiSuggestions} disabled={isAnalyzing} className="w-full mt-2 bg-surface-secondary hover:bg-surface-muted font-bold py-2 px-4 rounded-md inline-flex items-center justify-center">
                                {isAnalyzing ? <Spinner /> : <LightBulbIcon />} <span className="ml-2">{isAnalyzing ? 'Analyzing...' : 'Get AI Suggestions'}</span>
                            </button>
                             {editSuggestions.length > 0 && (
                                <div className="mt-2">
                                    <div className="flex flex-wrap gap-2">{editSuggestions.map((suggestion, index) => (<button key={index} onClick={() => onPromptChange(suggestion)} className="bg-surface-muted hover:bg-surface-muted-hover text-xs font-medium py-1 px-3 rounded-full">{suggestion}</button>))}</div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {editorMode === 'edit' && <StylePresets onSelect={onStyleSelect} />}
                    {editorMode === 'style_transfer' && (
                        <div>
                             <label htmlFor="style-upload" className="block text-sm font-medium text-text-tertiary mb-2">Style Image</label>
                             <label htmlFor="style-upload" className="cursor-pointer bg-surface-secondary hover:bg-surface-muted py-3 px-4 rounded-md inline-flex items-center justify-center w-full">
                                <UploadIcon /> <span className="ml-2 truncate">{styleImageName || 'Select Style Image'}</span>
                            </label>
                            <input id="style-upload" type="file" accept="image/*" onChange={onStyleImageUpload} className="hidden" />
                        </div>
                    )}
                </div>
                
                <AiFilters onApplyFilter={onApplyFilter} />

                <div className="flex flex-col gap-2 pt-2 border-t border-border-base">
                     {showFillButton && (
                         <button onClick={onFillExpanded} disabled={isLoading} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-md inline-flex items-center justify-center">
                            {isLoading ? <Spinner /> : <SparklesIcon />} <span className="ml-2">Fill Expanded Area</span>
                        </button>
                    )}
                     {currentModeConfig.hasMasking && (
                        <button onClick={onClearMask} disabled={isLoading} className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-md inline-flex items-center justify-center">
                            <EraserIcon /><span className="ml-2">Clear Mask</span>
                        </button>
                    )}
                    <button onClick={onGenerate} disabled={isGenerateDisabled()} className="w-full bg-brand hover:bg-brand-hover text-brand-text font-bold py-3 px-4 rounded-md inline-flex items-center justify-center">
                        {isLoading ? <Spinner /> : <SparklesIcon />}
                        <span className="ml-2">{getGenerateButtonText()}</span>
                    </button>
                </div>
            </fieldset>

            {isResizing && (
                <div className="p-3 bg-brand-subtle-bg rounded-lg flex flex-col gap-2">
                    <h4 className="text-sm font-bold text-brand-subtle-text">Resize Mode</h4>
                    <p className="text-xs text-brand-subtle-text/80">Drag handles on the canvas to resize. Press Enter to confirm or Esc to cancel.</p>
                     <div className="flex items-center gap-2">
                        <button onClick={onCancelResize} className="flex-1 bg-surface-muted hover:bg-surface-muted-hover text-text-primary font-bold py-2 px-4 rounded-md text-sm">Cancel</button>
                        <button onClick={onConfirmResize} className="flex-1 bg-brand hover:bg-brand-hover text-brand-text font-bold py-2 px-4 rounded-md text-sm">Confirm</button>
                    </div>
                </div>
            )}

            <div className="pt-2 border-t border-border-base mt-auto">
                 <h3 className="text-sm font-medium text-text-tertiary mb-2">History & Actions</h3>
                 <div className="grid grid-cols-4 gap-2">
                    <button onClick={onUndo} title="Undo" disabled={!canUndo} className="p-2 bg-surface-muted rounded-md disabled:opacity-50 flex items-center justify-center"><UndoIcon/></button>
                    <button onClick={onRedo} title="Redo" disabled={!canRedo} className="p-2 bg-surface-muted rounded-md disabled:opacity-50 flex items-center justify-center"><RedoIcon/></button>
                    <button onClick={onSaveSnapshot} title="Save Snapshot" className="p-2 bg-surface-muted rounded-md disabled:opacity-50 flex items-center justify-center"><SaveSnapshotIcon/></button>
                    <button onClick={onViewSnapshots} title="View Snapshots" className="p-2 bg-surface-muted rounded-md disabled:opacity-50 flex items-center justify-center"><ViewSnapshotsIcon/></button>
                    {editorMode === 'edit' && <button onClick={onVary} title="Vary Result" disabled={!canVary} className="p-2 bg-surface-muted rounded-md disabled:opacity-50 flex items-center justify-center"><VaryIcon/></button>}
                    <button onClick={onToggleResize} title="Resize" className={`p-2 rounded-md flex items-center justify-center ${isResizing ? 'bg-brand text-brand-text' : 'bg-surface-muted'}`}><ResizeIcon/></button>
                    <button onClick={onDescribeImage} title="Describe & Recreate" disabled={isDescribing} className="p-2 bg-surface-muted rounded-md disabled:opacity-50 flex items-center justify-center">{isDescribing ? <Spinner/> : <CodeIcon/>}</button>
                    <button onClick={onDownloadImage} title="Download" className="p-2 bg-surface-muted rounded-md disabled:opacity-50 flex items-center justify-center"><DownloadIcon/></button>
                 </div>
            </div>

            {error && <div className="p-3 bg-error-bg border border-error-border text-error-text rounded-md text-sm">{error}</div>}
        </div>
    );
};

export default ControlsPanel;