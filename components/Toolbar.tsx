import React from 'react';
import { BrushIcon, CodeIcon, DownloadIcon, EraserIcon, EnhanceIcon, RedoIcon, RemoveObjectIcon, ReplaceBackgroundIcon, UndoIcon, VaryIcon } from './Icon';
import Spinner from './Spinner';

export type Tool = 'brush' | 'eraser';
export type EditorMode = 'edit' | 'remove' | 'replace_bg' | 'enhance';

export const modeConfig = {
    edit: { name: "Edit with Mask", icon: BrushIcon, hasPrompt: true, hasMasking: true },
    remove: { name: "Remove Object", icon: RemoveObjectIcon, hasPrompt: false, hasMasking: true },
    replace_bg: { name: "Replace Background", icon: ReplaceBackgroundIcon, hasPrompt: true, hasMasking: true },
    enhance: { name: "Enhance Quality", icon: EnhanceIcon, hasPrompt: false, hasMasking: false },
};

interface ToolbarProps {
    editorMode: EditorMode;
    setEditorMode: (mode: EditorMode) => void;
    currentTool: Tool;
    setCurrentTool: (tool: Tool) => void;
    handleDescribeImage: () => void;
    handleDownloadImage: () => void;
    handleUndo: () => void;
    handleRedo: () => void;
    handleVary: () => void;
    isImageLoaded: boolean;
    isLoading: boolean;
    isDescribing: boolean;
    canUndo: boolean;
    canRedo: boolean;
    canVary: boolean;
}

const Toolbar: React.FC<ToolbarProps> = (props) => {
    const {
        editorMode, setEditorMode, currentTool, setCurrentTool,
        handleDescribeImage, handleDownloadImage, handleUndo, handleRedo, handleVary,
        isImageLoaded, isLoading, isDescribing, canUndo, canRedo, canVary
    } = props;

    const currentModeConfig = modeConfig[editorMode];

    return (
        <div className="bg-white dark:bg-dark-surface p-2 rounded-lg shadow-lg flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap" role="toolbar" aria-label="Editing Tools">
                <span className="text-sm font-medium text-gray-500 dark:text-dark-text-secondary ml-2">Tools:</span>
                
                {Object.entries(modeConfig).map(([key, { name, icon: Icon }]) => (
                    <button
                        key={key}
                        onClick={() => setEditorMode(key as EditorMode)}
                        title={name}
                        className={`p-2 rounded-md ${editorMode === key ? 'bg-sky-600 text-white' : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-dark-text'}`}
                        disabled={!isImageLoaded && key !== 'edit'}
                    >
                        <Icon />
                    </button>
                ))}

                {currentModeConfig.hasMasking && <div className="h-6 w-px bg-gray-300 dark:bg-dark-border mx-1"></div>}
                
                {currentModeConfig.hasMasking && (
                    <>
                        <button onClick={() => setCurrentTool('brush')} title="Brush Tool" className={`p-2 rounded-md ${currentTool === 'brush' ? 'bg-sky-600 text-white' : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-dark-text'}`}>
                            <BrushIcon />
                        </button>
                        <button onClick={() => setCurrentTool('eraser')} title="Eraser Tool" className={`p-2 rounded-md ${currentTool === 'eraser' ? 'bg-sky-600 text-white' : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-dark-text'}`}>
                            <EraserIcon />
                        </button>
                    </>
                )}
                         
                <div className="h-6 w-px bg-gray-300 dark:bg-dark-border mx-1"></div>

                <button onClick={handleDescribeImage} title="Describe & Recreate" disabled={!isImageLoaded || isLoading || isDescribing} className="p-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-dark-text rounded-md disabled:opacity-50 disabled:cursor-not-allowed">
                    {isDescribing ? <Spinner /> : <CodeIcon />}
                </button>
                <button onClick={handleDownloadImage} title="Download Image" disabled={!isImageLoaded} className="p-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-dark-text rounded-md disabled:opacity-50 disabled:cursor-not-allowed">
                    <DownloadIcon/>
                </button>
            </div>
            <div className="flex items-center gap-2" role="toolbar" aria-label="History Controls">
                <button onClick={handleUndo} title="Undo (Ctrl+Z)" disabled={!canUndo} className="p-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-dark-text rounded-md disabled:opacity-50">
                    <UndoIcon/>
                </button>
                <button onClick={handleRedo} title="Redo (Ctrl+Y)" disabled={!canRedo} className="p-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-dark-text rounded-md disabled:opacity-50">
                    <RedoIcon/>
                </button>
                {editorMode === 'edit' && 
                    <button onClick={handleVary} title="Vary Result" disabled={!canVary} className="p-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-dark-text rounded-md disabled:opacity-50">
                        <VaryIcon/>
                    </button>
                }
            </div>
        </div>
    );
};

export default Toolbar;