import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UploadIcon, SparklesIcon, EraserIcon, LightBulbIcon } from './Icon';
import Spinner from './Spinner';
import StylePresets from './StylePresets';
import { EditorMode } from './Toolbar';

interface ControlsPanelProps {
    onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
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
    modeHasPrompt: boolean;
    modeHasMasking: boolean;
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
        <>
            <p className="text-sm text-gray-500 dark:text-dark-text-secondary mb-2">Brush Size: {value}px</p>
            <div className="relative pt-8">
                {isPreviewVisible && (
                    <div 
                        className="absolute top-0 flex items-center justify-center p-2 bg-white/80 dark:bg-gray-900/80 rounded-md pointer-events-none ring-1 ring-gray-300 dark:ring-gray-600"
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
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    disabled={disabled}
                />
            </div>
        </>
    );
};

const ControlsPanel: React.FC<ControlsPanelProps> = (props) => {
    const {
        onImageUpload, promptText, onPromptChange, onImprovePrompt, isImprovingPrompt,
        onGetAiSuggestions, isAnalyzing, editSuggestions, onStyleSelect,
        brushSize, onBrushSizeChange, onClearMask, onGenerate,
        isLoading, error, isImageLoaded, editorMode, modeHasPrompt, modeHasMasking
    } = props;

    return (
        <div className="lg:col-span-1 bg-white dark:bg-dark-surface p-6 rounded-lg shadow-lg flex flex-col gap-6">
            <div>
                <label htmlFor="file-upload" className="block text-sm font-medium text-gray-600 dark:text-dark-text mb-2">1. Upload Image</label>
                <label htmlFor="file-upload" className="cursor-pointer bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-dark-text font-bold py-3 px-4 rounded-md inline-flex items-center justify-center w-full transition-colors">
                    <UploadIcon />
                    <span className="ml-2">{isImageLoaded ? 'Change Image' : 'Select Image'}</span>
                </label>
                <input id="file-upload" type="file" accept="image/*" onChange={onImageUpload} className="hidden" />
            </div>
                
            {modeHasPrompt && (
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label htmlFor="prompt" className="block text-sm font-medium text-gray-600 dark:text-dark-text">2. Describe Your Edit</label>
                        <button 
                            onClick={onImprovePrompt} 
                            disabled={!promptText.trim() || isImprovingPrompt || !isImageLoaded}
                            className="text-xs inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Improve prompt with AI"
                        >
                            {isImprovingPrompt ? <Spinner className="h-4 w-4" /> : <SparklesIcon className="h-4 w-4" />}
                            <span>Improve</span>
                        </button>
                    </div>

                    <textarea id="prompt" value={promptText} onChange={(e) => onPromptChange(e.target.value)}
                        placeholder={editorMode === 'replace_bg' ? "e.g., 'a vibrant, colorful city street'" : "e.g., 'a majestic castle in the background'"}
                        className="w-full bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md p-3 text-gray-800 dark:text-dark-text focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
                        rows={3} disabled={!isImageLoaded}/>
                    
                    <div className="mt-4">
                        <button 
                            onClick={onGetAiSuggestions}
                            disabled={!isImageLoaded || isAnalyzing}
                            className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-dark-text font-bold py-2 px-4 rounded-md inline-flex items-center justify-center transition-colors disabled:opacity-50"
                        >
                            {isAnalyzing ? <Spinner /> : <LightBulbIcon />}
                            <span className="ml-2">{isAnalyzing ? 'Analyzing...' : 'Get AI Suggestions'}</span>
                        </button>
                    </div>

                     {editSuggestions.length > 0 && (
                        <div className="mt-4">
                            <h4 className="text-sm font-medium text-gray-600 dark:text-dark-text mb-2 flex items-center">Suggestions</h4>
                            <div className="flex flex-wrap gap-2">{editSuggestions.map((suggestion, index) => (<button key={index} onClick={() => onPromptChange(suggestion)} className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-dark-text text-xs font-medium py-1 px-3 rounded-full transition-colors">{suggestion}</button>))}</div>
                        </div>
                    )}
                    {editorMode === 'edit' && <div className="mt-4"><StylePresets onSelect={onStyleSelect} /></div> }
                </div>
            )}
                
            {modeHasMasking && (
                <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-dark-text mb-2">3. Draw Mask</label>
                    <BrushSizeSlider value={brushSize} onChange={onBrushSizeChange} disabled={!isImageLoaded} />
                </div>
            )}
            <div className="flex flex-col gap-4">
                {modeHasMasking && (
                    <button onClick={onClearMask} disabled={!isImageLoaded || isLoading} className="w-full bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500 text-white dark:text-dark-text font-bold py-3 px-4 rounded-md inline-flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <EraserIcon /><span className="ml-2">Clear Mask</span>
                    </button>
                )}
                <button onClick={onGenerate} disabled={!isImageLoaded || isLoading || (modeHasPrompt && !promptText)} className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 px-4 rounded-md inline-flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {isLoading && editorMode !== 'enhance' ? <Spinner /> : <SparklesIcon />}
                    <span className="ml-2">{isLoading ? 'Generating...' : (editorMode === 'enhance' ? 'Enhance Image' : 'Generate')}</span>
                </button>
            </div>
            <div className="mt-auto">{error && <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded-md text-sm">{error}</div>}</div>
        </div>
    );
};

export default ControlsPanel;