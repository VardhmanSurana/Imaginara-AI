import { useState, useCallback } from 'react';

export const useImageHistory = (
    loadImage: (dataUrl: string, callback?: (img: HTMLImageElement) => void) => void,
    clearMask: () => void,
    clearLastGenerationParams: () => void
) => {
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    const handleUndo = useCallback(() => {
        if (canUndo) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            loadImage(history[newIndex]);
            clearMask();
            clearLastGenerationParams();
        }
    }, [canUndo, history, historyIndex, loadImage, clearMask, clearLastGenerationParams]);

    const handleRedo = useCallback(() => {
        if (canRedo) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            loadImage(history[newIndex]);
            clearMask();
            clearLastGenerationParams();
        }
    }, [canRedo, history, historyIndex, loadImage, clearMask, clearLastGenerationParams]);

    const updateHistory = useCallback((newImageSrc: string) => {
        const newHistory = history.slice(0, historyIndex + 1);
        const updatedHistory = [...newHistory, newImageSrc];
        setHistory(updatedHistory);
        setHistoryIndex(updatedHistory.length - 1);
        clearMask();
    }, [history, historyIndex, clearMask]);
    
    const resetHistory = useCallback((initialImageSrc: string) => {
        const newHistory = [initialImageSrc];
        setHistory(newHistory);
        setHistoryIndex(0);
        clearMask();
    }, [clearMask]);

    return {
        history,
        historyIndex,
        handleUndo,
        handleRedo,
        updateHistory,
        resetHistory,
        canUndo,
        canRedo,
    };
};