

import { useState, useCallback } from 'react';
import { EditorMode, AdjustmentsState, defaultAdjustments } from '../types/editor';

interface ColorBalanceValue { r: number; g: number; b: number; }

// This hook manages the state and logic for image adjustments.
export const useAdjustments = (
    originalImage: HTMLImageElement | null,
    loadImage: (dataUrl: string, callback?: (img: HTMLImageElement) => void) => void,
    updateHistory: (newImageSrc: string) => void,
    setEditorMode: (mode: EditorMode) => void
) => {
    const [adjustments, setAdjustments] = useState<AdjustmentsState>(defaultAdjustments);

    const applyColorBalance = useCallback((ctx: CanvasRenderingContext2D) => {
        const { colorBalance } = adjustments;
        const isAdjusted = Object.values(colorBalance).some(
            (val: any) => val.r !== 0 || val.g !== 0 || val.b !== 0
        );
        if (!isAdjusted) return;
        
        const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];
            
            const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            let adj: ColorBalanceValue;
            
            if (luminance < 85) { // Shadows
                adj = colorBalance.shadows;
            } else if (luminance > 170) { // Highlights
                adj = colorBalance.highlights;
            } else { // Midtones
                adj = colorBalance.midtones;
            }
            
            data[i] = Math.max(0, Math.min(255, r + adj.r));
            data[i + 1] = Math.max(0, Math.min(255, g + adj.g));
            data[i + 2] = Math.max(0, Math.min(255, b + adj.b));
        }
        ctx.putImageData(imageData, 0, 0);
    }, [adjustments]);

    const handleAdjustmentChange = (key: keyof Omit<AdjustmentsState, 'colorBalance'>, value: number) => {
        setAdjustments(prev => ({ ...prev, [key]: value }));
    };

    const handleColorBalanceChange = (tone: 'shadows' | 'midtones' | 'highlights', channel: 'r' | 'g' | 'b', value: number) => {
        setAdjustments(prev => ({
            ...prev,
            colorBalance: {
                ...prev.colorBalance,
                [tone]: {
                    ...prev.colorBalance[tone],
                    [channel]: value,
                },
            },
        }));
    };
    
    const handleApplyAdjustments = useCallback(() => {
        if (!originalImage) return;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = originalImage.width;
        tempCanvas.height = originalImage.height;
        const ctx = tempCanvas.getContext('2d')!;

        const { blur, sharpen, brightness, contrast, saturation, hue } = adjustments;
        const sharpenContrast = 1 + (sharpen / 100);
        const baseContrast = contrast / 100;
        // FIX: Changed typo `baseVision` to `baseContrast`.
        const finalContrast = baseContrast * sharpenContrast;

        ctx.filter = `blur(${blur}px) brightness(${brightness}%) contrast(${finalContrast * 100}%) saturate(${saturation}%) hue-rotate(${hue}deg)`;
        ctx.drawImage(originalImage, 0, 0);
        ctx.filter = 'none';
        
        applyColorBalance(ctx);
        
        const newImageSrc = tempCanvas.toDataURL('image/png');
        
        loadImage(newImageSrc, () => {
            updateHistory(newImageSrc);
            setAdjustments(defaultAdjustments);
            setEditorMode('edit');
        });
    }, [originalImage, adjustments, applyColorBalance, loadImage, updateHistory, setEditorMode]);
    
    const handleResetAdjustments = useCallback(() => {
        setAdjustments(defaultAdjustments);
        setEditorMode('edit');
    }, [setEditorMode]);

    return {
        adjustments,
        applyColorBalance,
        handleAdjustmentChange,
        handleColorBalanceChange,
        handleApplyAdjustments,
        handleResetAdjustments,
    };
};