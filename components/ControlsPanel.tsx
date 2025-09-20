
import React from 'react';
import { UploadIcon, SparklesIcon, EraserIcon, WandIcon, HomeIcon, BrushIcon, EnhanceIcon, RemoveObjectIcon, ReplaceBackgroundIcon, StyleTransferIcon, ResizeIcon, TransformIcon, AspectRatioIcon, AdjustmentsIcon } from './Icon';
import Spinner from './Spinner';
import { EditorMode, Tool, AdjustmentsState } from '../types/editor';
import AiFilters from './AiFilters';
import Adjustments from './Adjustments';

export const modeConfig: Record<EditorMode, { name: string; icon: React.FC<any>; hasPrompt: boolean; hasMasking: boolean; }> = {
    edit: { name: "Edit", icon: BrushIcon, hasPrompt: true, hasMasking: true },
    remove: { name: "Remove", icon: RemoveObjectIcon, hasPrompt: true, hasMasking: false },
    replace_bg: { name: "Replace BG", icon: ReplaceBackgroundIcon, hasPrompt: true, hasMasking: true },
    enhance: { name: "Enhance", icon: EnhanceIcon, hasPrompt: false, hasMasking: false },
    style_transfer: { name: "Style Transfer", icon: StyleTransferIcon, hasPrompt: false, hasMasking: false },
    adjustments: { name: "Adjust", icon: AdjustmentsIcon, hasPrompt: false, hasMasking: false },
    resize: { name: "Resize", icon: ResizeIcon, hasPrompt: false, hasMasking: false },
    change_ratio: { name: "Change Ratio", icon: AspectRatioIcon, hasPrompt: false, hasMasking: false },
    transform: { name: "Transform", icon: TransformIcon, hasPrompt: false, hasMasking: false },
};

const toolGroups = [
    {
        title: 'Generative Tools',
        tools: ['edit', 'remove', 'replace_bg']
    },
    {
        title: 'Adjustments',
        tools: ['enhance', 'style_transfer', 'adjustments']
    },
    {
        title: 'Transform',
        tools: ['resize', 'change_ratio', 'transform']
    }
];

interface ControlsPanelProps {
    onGoHome: () => void;
    onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onStyleImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    styleImageName: string | null;
    brushSize: number;
    onBrushSizeChange: (size: number) => void;
    onClearMask: () => void;
    isLoading: boolean;
    editorMode: EditorMode;
    setEditorMode: (mode: EditorMode) => void;
    currentTool: Tool;
    setCurrentTool: (tool: Tool) => void;
    maskPrompt: string;
    onMaskPromptChange: (text: string) => void;
    onMaskByText: () => void;
    isMaskingByText: boolean;
    onApplyFilter: (prompt: string) => void;
    onConfirmResize: () => void;
    onCancelResize: () => void;
    rotation: number;
    onRotationChange: (value: number) => void;
    skewX: number;
    onSkewXChange: (value: number) => void;
    skewY: number;
    onSkewYChange: (value: number) => void;
    onApplyTransform: () => void;
    onCancelTransform: () => void;
    // Adjustment props
    adjustments: AdjustmentsState;
    onAdjustmentChange: (key: keyof AdjustmentsState, value: any) => void;
    onColorBalanceChange: (tone: 'shadows' | 'midtones' | 'highlights', channel: 'r' | 'g' | 'b', value: number) => void;
    onApplyAdjustments: () => void;
    onResetAdjustments: () => void;
}

const BrushSizeSlider: React.FC<{
    value: number;
    onChange: (value: number) => void;
    disabled: boolean;
}> = ({ value, onChange, disabled }) => {
    return (
        <div className="relative">
            <input
                id="brush-size"
                type="range"
                min="5"
                max="100"
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full h-2 bg-surface-muted rounded-lg appearance-none cursor-pointer"
                disabled={disabled}
            />
        </div>
    );
};


const ControlsPanel: React.FC<ControlsPanelProps> = (props) => {
    const {
        onGoHome, onImageUpload, onStyleImageUpload, styleImageName,
        brushSize, onBrushSizeChange, onClearMask,
        isLoading, editorMode, setEditorMode, currentTool, setCurrentTool,
        maskPrompt, onMaskPromptChange, onMaskByText, isMaskingByText, onApplyFilter,
        onConfirmResize, onCancelResize,
        rotation, onRotationChange, skewX, onSkewXChange, skewY, onSkewYChange, onApplyTransform, onCancelTransform,
        adjustments, onAdjustmentChange, onColorBalanceChange, onApplyAdjustments, onResetAdjustments
    } = props;

    const currentModeConfig = modeConfig[editorMode];
    const isTransforming = editorMode === 'resize' || editorMode === 'transform' || editorMode === 'change_ratio';

    return (
        <div className="bg-surface rounded-lg shadow-lg flex flex-col h-full">
             {/* HEADER */}
             <div className="p-4 border-b border-border-base flex-shrink-0">
                <div className="flex items-center gap-2">
                    <button onClick={onGoHome} className="p-2 bg-surface-muted hover:bg-surface-muted-hover text-text-primary rounded-md transition-colors" title="Back to Home"><HomeIcon /></button>
                    <label htmlFor="file-upload" className="flex-grow cursor-pointer bg-surface-secondary hover:bg-surface-muted text-text-primary font-bold py-2 px-4 rounded-md inline-flex items-center justify-center transition-colors">
                        <UploadIcon />
                        <span className="ml-2">Change Image</span>
                    </label>
                    <input id="file-upload" type="file" accept="image/*" onChange={onImageUpload} className="hidden" />
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
                 {/* TOOLS SECTION */}
                <div className="space-y-3">
                     {toolGroups.map(group => (
                        <div key={group.title}>
                            <h3 className="text-sm font-medium text-text-tertiary mb-2 px-1">{group.title}</h3>
                             <div className="grid grid-cols-4 gap-2">
                                {group.tools.map(key => {
                                    const { name, icon: Icon } = modeConfig[key as EditorMode];
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => setEditorMode(key as EditorMode)}
                                            title={name}
                                            className={`p-1.5 rounded-md flex flex-col items-center justify-center text-xs gap-1 transition-colors ${editorMode === key ? 'bg-brand text-brand-text' : 'bg-surface-muted hover:bg-surface-muted-hover text-text-tertiary'}`}
                                        >
                                            <Icon className="h-4 w-4" />
                                            <span className="text-[10px]">{name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                     ))}
                </div>
                
                {/* DYNAMIC OPTIONS */}
                <div className={`flex flex-col gap-4 pt-2 border-t border-border-base ${isTransforming ? 'opacity-50 pointer-events-none' : ''}`}>
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
                            <button onClick={onClearMask} disabled={isLoading || isTransforming} className="w-full mt-3 bg-surface-secondary hover:bg-surface-muted text-text-primary font-bold py-2 px-4 rounded-md inline-flex items-center justify-center disabled:opacity-50">
                                <EraserIcon /><span className="ml-2">Clear Mask</span>
                            </button>
                        </div>
                    )}
                    
                    {editorMode === 'style_transfer' && (
                        <div>
                             <label htmlFor="style-upload" className="block text-sm font-medium text-text-tertiary mb-2">Style Image</label>
                             <label htmlFor="style-upload" className="cursor-pointer bg-surface-secondary hover:bg-surface-muted py-3 px-4 rounded-md inline-flex items-center justify-center w-full">
                                <UploadIcon /> <span className="ml-2 truncate">{styleImageName || 'Select Style Image'}</span>
                            </label>
                            <input id="style-upload" type="file" accept="image/*" onChange={onStyleImageUpload} className="hidden" />
                        </div>
                    )}
                    <AiFilters onApplyFilter={onApplyFilter} />
                </div>
                 
                 {editorMode === 'adjustments' && (
                     <Adjustments 
                        adjustments={adjustments}
                        onAdjustmentChange={onAdjustmentChange}
                        onColorBalanceChange={onColorBalanceChange}
                        onApply={onApplyAdjustments}
                        onReset={onResetAdjustments}
                     />
                 )}

                {/* TRANSFORM/RESIZE UI */}
                {editorMode === 'resize' && (
                    <div className="p-3 bg-brand-subtle-bg rounded-lg flex flex-col gap-2">
                        <h4 className="text-sm font-bold text-brand-subtle-text">Resize Mode</h4>
                        <p className="text-xs text-brand-subtle-text/80">Drag handles on the canvas to resize. Press Enter to confirm or Esc to cancel.</p>
                         <div className="flex items-center gap-2">
                            <button onClick={onCancelResize} className="flex-1 bg-surface-muted hover:bg-surface-muted-hover text-text-primary font-bold py-2 px-4 rounded-md text-sm">Cancel</button>
                            <button onClick={onConfirmResize} className="flex-1 bg-brand hover:bg-brand-hover text-brand-text font-bold py-2 px-4 rounded-md text-sm">Confirm</button>
                        </div>
                    </div>
                )}
                {editorMode === 'transform' && (
                    <div className="p-3 bg-brand-subtle-bg rounded-lg flex flex-col gap-4">
                        <h4 className="text-sm font-bold text-brand-subtle-text">Transform Controls</h4>
                        <div className="flex flex-col gap-1">
                            <label htmlFor="rotation" className="text-xs text-brand-subtle-text/80 flex justify-between">
                                <span>Rotation</span>
                                <span>{rotation}°</span>
                            </label>
                            <input id="rotation" type="range" min="-180" max="180" value={rotation} onChange={(e) => onRotationChange(Number(e.target.value))} className="w-full h-2 bg-surface-muted rounded-lg appearance-none cursor-pointer" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label htmlFor="skewX" className="text-xs text-brand-subtle-text/80 flex justify-between">
                                <span>Skew X</span>
                                <span>{skewX}°</span>
                            </label>
                            <input id="skewX" type="range" min="-45" max="45" value={skewX} onChange={(e) => onSkewXChange(Number(e.target.value))} className="w-full h-2 bg-surface-muted rounded-lg appearance-none cursor-pointer" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label htmlFor="skewY" className="text-xs text-brand-subtle-text/80 flex justify-between">
                                <span>Skew Y</span>
                                <span>{skewY}°</span>
                            </label>
                            <input id="skewY" type="range" min="-45" max="45" value={skewY} onChange={(e) => onSkewYChange(Number(e.target.value))} className="w-full h-2 bg-surface-muted rounded-lg appearance-none cursor-pointer" />
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => { onRotationChange(0); onSkewXChange(0); onSkewYChange(0); }} className="flex-1 bg-surface-muted hover:bg-surface-muted-hover text-text-primary font-bold py-2 px-4 rounded-md text-sm">Reset</button>
                            <button onClick={onCancelTransform} className="flex-1 bg-surface-muted hover:bg-surface-muted-hover text-text-primary font-bold py-2 px-4 rounded-md text-sm">Cancel</button>
                            <button onClick={onApplyTransform} className="flex-1 bg-brand hover:bg-brand-hover text-brand-text font-bold py-2 px-4 rounded-md text-sm">Apply</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ControlsPanel;
