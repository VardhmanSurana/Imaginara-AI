

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { generateInpaintedImage, generateImageFromImageAndPrompt, analyzeImageForSuggestions, describeImage, generateImageFromJsonPrompt, generateMask, improvePrompt, applyStyleTransfer } from '../services/geminiService';
import { BoundingBox, Suggestion } from '../types';
import ControlsPanel from './ControlsPanel';
import CanvasView from './CanvasView';
import JsonModal from './JsonModal';
import SnapshotsModal from './SnapshotsModal';
import { useImageHistory } from '../hooks/useImageHistory';
import { useCanvasTransform } from '../hooks/useCanvasTransform';
import { useAdjustments } from '../hooks/useAdjustments';
import { RESIZE_FILL_PROMPT, ASPECT_RATIO_FILL_PROMPT, ENHANCE_IMAGE_PROMPT, REMOVE_OBJECT_PROMPT } from '../prompts';
import EditorActions from './EditorActions';
import { Tool, EditorMode, AdjustmentsState } from '../types/editor';

const isMaskEmpty = (canvas: HTMLCanvasElement | null): boolean => {
    if (!canvas) return true;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return true;
    // Check for any pixel with an alpha value greater than a small threshold
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 10) return false;
    }
    return true;
};

interface EditorPageProps {
    initialImageDataUrl: string | null;
    onGoHome: () => void;
}
const MAX_CANVAS_DIMENSION = 1024;
const HANDLE_SIZE_PX = 10;
const MIN_RESIZE_DIMENSION = 20;
const handleToCursorMap: { [key: string]: string } = {
    topLeft: 'nwse-resize', top: 'ns-resize', topRight: 'nesw-resize',
    left: 'ew-resize', right: 'ew-resize',
    bottomLeft: 'nesw-resize', bottom: 'ns-resize', bottomRight: 'nwse-resize',
};

const EditorPage: React.FC<EditorPageProps> = ({ initialImageDataUrl, onGoHome }) => {
    const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
    const [promptText, setPromptText] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('AI is creating...');
    const [error, setError] = useState<string | null>(null);
    const [isDrawing, setIsDrawing] = useState<boolean>(false);
    const [brushSize, setBrushSize] = useState<number>(40);
    const [editSuggestions, setEditSuggestions] = useState<Suggestion[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const [isImprovingPrompt, setIsImprovingPrompt] = useState<boolean>(false);
    const [currentTool, setCurrentTool] = useState<Tool>('brush');
    const [isCtrlPressed, setIsCtrlPressed] = useState(false);
    const [isJsonModalOpen, setIsJsonModalOpen] = useState<boolean>(false);
    const [jsonPrompt, setJsonPrompt] = useState<string>('');
    const [isDescribing, setIsDescribing] = useState<boolean>(false);
    const [lastGenerationParams, setLastGenerationParams] = useState<{ prompt: string; imageB64: string; } | null>(null);
    const [editorMode, setEditorMode] = useState<EditorMode>('edit');
    const [styleKeywords, setStyleKeywords] = useState<string | null>(null);
    const [styleImage, setStyleImage] = useState<{file: File, dataUrl: string} | null>(null);
    const [maskPrompt, setMaskPrompt] = useState('');
    const [isMaskingByText, setIsMaskingByText] = useState(false);
    const [snapshots, setSnapshots] = useState<{name: string; dataUrl: string; thumbnail: string}[]>([]);
    const [isSnapshotsModalOpen, setIsSnapshotsModalOpen] = useState(false);
    const [showFillButton, setShowFillButton] = useState(false);
    const [fillPrompt, setFillPrompt] = useState<string>('');
    
    // Transform state
    const [rotation, setRotation] = useState(0);
    const [skewX, setSkewX] = useState(0);
    const [skewY, setSkewY] = useState(0);
    // Resize state
    const [resizeBox, setResizeBox] = useState<BoundingBox | null>(null);
    const [activeHandle, setActiveHandle] = useState<string | null>(null);
    const [hoveredHandle, setHoveredHandle] = useState<string | null>(null);
    const [resizeStart, setResizeStart] = useState<{x: number; y: number; box: BoundingBox} | null>(null);
    // Aspect Ratio state
    const [selectedAspectRatio, setSelectedAspectRatio] = useState<string | null>(null);
    const [aspectRatioBox, setAspectRatioBox] = useState<BoundingBox | null>(null);
    const [aspectRatioValue, setAspectRatioValue] = useState<number | null>(null);
    const [isMovingAspectRatioBox, setIsMovingAspectRatioBox] = useState(false);
    const [isCursorInAspectRatioBox, setIsCursorInAspectRatioBox] = useState(false);
    // Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement>(null);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Custom Hooks
    const { transform, fitScreenView, fillScreenView, handleZoom, zoomToPercentage, startPan, pan, endPan, isPanning, handleWheelZoom } = useCanvasTransform(originalImage, containerRef);
    
    const getHandles = useCallback((box: BoundingBox) => {
        const { x, y, width, height } = box;
        return {
            topLeft: { x, y },
            top: { x: x + width / 2, y },
            topRight: { x: x + width, y },
            left: { x, y: y + height / 2 },
            right: { x: x + width, y: y + height / 2 },
            bottomLeft: { x, y: y + height },
            bottom: { x: x + width / 2, y: y + height },
            bottomRight: { x: x + width, y: y + height },
        };
    }, []);

    // FIX: Moved hook initializations before their usage in `redrawCanvas`
    const simpleClearMask = useCallback(() => {
        const maskCanvas = maskCanvasRef.current;
        const maskCtx = maskCanvas?.getContext('2d');
        if (maskCtx) {
            maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        }
    }, []);

    const loadImageFromDataUrl = useCallback((dataUrl: string, callback?: (img: HTMLImageElement) => void) => {
        const img = new Image();
        img.onload = () => {
            const canvas = canvasRef.current;
            const maskCanvas = maskCanvasRef.current;
            const container = containerRef.current;
            if (!canvas || !maskCanvas || !container) return;

            let { width: imgWidth, height: imgHeight } = img;
            const maxDim = Math.max(imgWidth, imgHeight);
            let scaleRatio = 1;
            if (maxDim > MAX_CANVAS_DIMENSION) {
                scaleRatio = MAX_CANVAS_DIMENSION / maxDim;
                imgWidth = Math.round(imgWidth * scaleRatio);
                imgHeight = Math.round(imgHeight * scaleRatio);
            }

            canvas.width = imgWidth;
            canvas.height = imgHeight;
            maskCanvas.width = imgWidth;
            maskCanvas.height = imgHeight;
            
            canvas.style.width = '';
            canvas.style.height = '';
            maskCanvas.style.width = '';
            maskCanvas.style.height = '';

            const scaledImg = new Image();
            scaledImg.onload = () => {
                setOriginalImage(scaledImg);
                if(callback) callback(scaledImg);
            };

            if (scaleRatio < 1) {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = imgWidth;
                tempCanvas.height = imgHeight;
                const tempCtx = tempCanvas.getContext('2d')!;
                tempCtx.drawImage(img, 0, 0, imgWidth, imgHeight);
                scaledImg.src = tempCanvas.toDataURL('image/png');
            } else {
                scaledImg.src = dataUrl;
            }
        };
        img.src = dataUrl;
    }, []);

    const { handleUndo, handleRedo, updateHistory, resetHistory, canUndo, canRedo } = useImageHistory(loadImageFromDataUrl, simpleClearMask, () => setLastGenerationParams(null));
    
    const {
        adjustments,
        applyColorBalance,
        handleAdjustmentChange,
        handleColorBalanceChange,
        handleApplyAdjustments,
        handleResetAdjustments,
    } = useAdjustments(originalImage, loadImageFromDataUrl, updateHistory, setEditorMode);

    const redrawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const maskCanvas = maskCanvasRef.current;
        if (!canvas || !maskCanvas || !originalImage) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.filter = 'none';

        if (editorMode === 'adjustments') {
            const { blur, sharpen, brightness, contrast, saturation, hue } = adjustments;
            const sharpenContrast = 1 + (sharpen / 100);
            const baseContrast = contrast / 100;
            const finalContrast = baseContrast * sharpenContrast;
            ctx.filter = `blur(${blur}px) brightness(${brightness}%) contrast(${finalContrast * 100}%) saturate(${saturation}%) hue-rotate(${hue}deg)`;
        }
        
        ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
        ctx.filter = 'none';

        if (editorMode === 'adjustments') {
            applyColorBalance(ctx);
        }

        const isMaskingMode = ['edit', 'remove', 'replace_bg'].includes(editorMode);
        if (isMaskingMode) {
            ctx.globalAlpha = 0.5;
            ctx.drawImage(maskCanvas, 0, 0);
            ctx.globalAlpha = 1.0;
        }
    }, [originalImage, editorMode, adjustments, applyColorBalance]);

    const handleClearMask = useCallback(() => {
        const maskCanvas = maskCanvasRef.current;
        const maskCtx = maskCanvas?.getContext('2d');
        if (maskCtx) {
            maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
            redrawCanvas();
        }
    }, [redrawCanvas]);
    
    useEffect(() => {
        if (initialImageDataUrl) {
            loadImageFromDataUrl(initialImageDataUrl, (img) => {
                resetHistory(initialImageDataUrl);
                setTimeout(() => {
                    fitScreenView();
                }, 100);
            });
        } else {
            onGoHome();
        }
    }, [initialImageDataUrl]);

    useEffect(() => {
        if (originalImage) {
            setTimeout(() => {
                fitScreenView();
            }, 50);
        }
    }, [originalImage, fitScreenView]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const resizeObserver = new ResizeObserver(() => {
            setTimeout(() => {
                fitScreenView();
            }, 100);
        });
        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, [fitScreenView]);

    useEffect(() => {
        if (originalImage) redrawCanvas();
    }, [originalImage, redrawCanvas, resizeBox, adjustments]);

    const handleCancelResize = useCallback(() => {
        setEditorMode('edit');
    }, []);

    const effectiveResetAdjustments = useCallback(() => {
        handleResetAdjustments();
        setEditorMode('edit');
    }, [handleResetAdjustments]);
    
    const effectiveApplyAdjustments = useCallback(() => {
        handleApplyAdjustments();
        setEditorMode('edit');
    }, [handleApplyAdjustments]);

    const handleCancelTransform = useCallback(() => {
        setRotation(0);
        setSkewX(0);
        setSkewY(0);
        setEditorMode('edit');
    }, []);
    
    const handleCancelAspectRatio = useCallback(() => {
        setSelectedAspectRatio(null);
        setAspectRatioBox(null);
        setAspectRatioValue(null);
        setEditorMode('edit');
    }, []);

    const handleConfirmResize = useCallback(() => {
        if (!originalImage || !resizeBox) return;

        const wasExpanded = resizeBox.width > originalImage.width || resizeBox.height > originalImage.height;
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = Math.round(resizeBox.width);
        tempCanvas.height = Math.round(resizeBox.height);
        const tempCtx = tempCanvas.getContext('2d')!;
        
        tempCtx.fillStyle = 'white';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        tempCtx.drawImage(
            originalImage, 
            Math.round(-resizeBox.x), 
            Math.round(-resizeBox.y), 
            originalImage.width, 
            originalImage.height
        );

        const newImageSrc = tempCanvas.toDataURL('image/png');
        
        loadImageFromDataUrl(newImageSrc, () => {
            updateHistory(newImageSrc);
            if (wasExpanded) {
                setShowFillButton(true);
                setFillPrompt(RESIZE_FILL_PROMPT);
            }
            setEditorMode('edit');
        });
    }, [originalImage, resizeBox, loadImageFromDataUrl, updateHistory]);
    
    const handleApplyTransform = useCallback(() => {
        if (!originalImage || (rotation === 0 && skewX === 0 && skewY === 0)) {
            setEditorMode('edit');
            return;
        }

        const w = originalImage.width;
        const h = originalImage.height;
        const rotRad = rotation * Math.PI / 180;
        const skewXRad = skewX * Math.PI / 180;
        const skewYRad = skewY * Math.PI / 180;

        const transformPoint = (px: number, py: number) => {
            const centeredX = px - w / 2;
            const centeredY = py - h / 2;
            const tanSkewX = Math.tan(skewXRad);
            const tanSkewY = Math.tan(skewYRad);
            const skewedX = centeredX + centeredY * tanSkewX;
            const skewedY = centeredX * tanSkewY + centeredY;
            const cosRot = Math.cos(rotRad);
            const sinRot = Math.sin(rotRad);
            const rotatedX = skewedX * cosRot - skewedY * sinRot;
            const rotatedY = skewedX * sinRot + skewedY * cosRot;
            return { x: rotatedX, y: rotatedY };
        };

        const corners = [
            transformPoint(0, 0),
            transformPoint(w, 0),
            transformPoint(w, h),
            transformPoint(0, h),
        ];

        const minX = Math.min(...corners.map(p => p.x));
        const maxX = Math.max(...corners.map(p => p.x));
        const minY = Math.min(...corners.map(p => p.y));
        const maxY = Math.max(...corners.map(p => p.y));
        const newWidth = Math.ceil(maxX - minX);
        const newHeight = Math.ceil(maxY - minY);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = newWidth;
        tempCanvas.height = newHeight;
        const ctx = tempCanvas.getContext('2d')!;

        ctx.translate(newWidth / 2, newHeight / 2);
        ctx.rotate(rotRad);
        ctx.transform(1, Math.tan(skewYRad), Math.tan(skewXRad), 1, 0, 0);
        ctx.drawImage(originalImage, -w / 2, -h / 2);

        const newImageSrc = tempCanvas.toDataURL('image/png');
        loadImageFromDataUrl(newImageSrc, () => {
            updateHistory(newImageSrc);
            setRotation(0);
            setSkewX(0);
            setSkewY(0);
            setEditorMode('edit');
        });
    }, [originalImage, rotation, skewX, skewY, loadImageFromDataUrl, updateHistory]);
    
    const handleSelectAspectRatio = useCallback((ratio: { width: number; height: number; name: string } | null) => {
        if (!originalImage) return;

        if (!ratio) {
            setSelectedAspectRatio(null);
            setAspectRatioBox(null);
            setAspectRatioValue(null);
            return;
        }

        setSelectedAspectRatio(ratio.name);
        const targetRatio = ratio.width / ratio.height;
        setAspectRatioValue(targetRatio);
        
        const imgW = originalImage.width;
        const imgH = originalImage.height;
        const imgRatio = imgW / imgH;

        let boxW, boxH, boxX, boxY;

        if (imgRatio > targetRatio) { // Image is wider than target ratio
            boxH = imgH;
            boxW = imgH * targetRatio;
            boxX = (imgW - boxW) / 2;
            boxY = 0;
        } else { // Image is taller or same ratio
            boxW = imgW;
            boxH = imgW / targetRatio;
            boxX = 0;
            boxY = (imgH - boxH) / 2;
        }
        setAspectRatioBox({ x: boxX, y: boxY, width: boxW, height: boxH });
    }, [originalImage]);

    const handleApplyAspectRatioCanvas = useCallback(() => {
        if (!originalImage || !aspectRatioBox) return;

        const newCanvas = document.createElement('canvas');
        newCanvas.width = Math.round(aspectRatioBox.width);
        newCanvas.height = Math.round(aspectRatioBox.height);
        const ctx = newCanvas.getContext('2d')!;
        
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);
        
        ctx.drawImage(
            originalImage,
            Math.round(-aspectRatioBox.x),
            Math.round(-aspectRatioBox.y),
            originalImage.width,
            originalImage.height
        );
        
        const wasExpanded = newCanvas.width > originalImage.width || newCanvas.height > originalImage.height;
        
        const newDataUrl = newCanvas.toDataURL('image/png');
        loadImageFromDataUrl(newDataUrl, () => {
            updateHistory(newDataUrl);
            handleCancelAspectRatio(); // Resets state and changes mode
            if (wasExpanded) {
                setShowFillButton(true);
                setFillPrompt(ASPECT_RATIO_FILL_PROMPT);
            }
        });
    }, [originalImage, aspectRatioBox, loadImageFromDataUrl, updateHistory, handleCancelAspectRatio]);


    useEffect(() => {
        // Setup/Teardown for resize mode
        if (editorMode === 'resize' && originalImage) {
            setResizeBox({x: 0, y: 0, width: originalImage.width, height: originalImage.height});
        } else {
            // Cleanup if we were in resize mode and now we are not
            if (resizeBox) {
                setResizeBox(null);
                setActiveHandle(null);
                setHoveredHandle(null);
                setResizeStart(null);
            }
        }
        if (editorMode !== 'change_ratio') {
            if (aspectRatioBox) handleCancelAspectRatio();
        }
    }, [editorMode, originalImage]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Control' && !e.repeat) {
                const target = e.target as HTMLElement;
                if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    setIsCtrlPressed(true);
                }
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); handleRedo(); }
            if (e.key === 'Escape') {
                if(editorMode === 'resize') handleCancelResize();
                if(editorMode === 'transform') handleCancelTransform();
                if(editorMode === 'change_ratio') handleCancelAspectRatio();
               if(editorMode === 'adjustments') effectiveResetAdjustments();
            }
            if (e.key === 'Enter') {
                if(editorMode === 'resize') handleConfirmResize();
                if(editorMode === 'change_ratio') handleApplyAspectRatioCanvas();
               if(editorMode === 'adjustments') effectiveApplyAdjustments();
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => { if (e.key === 'Control') setIsCtrlPressed(false); };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [handleUndo, handleRedo, editorMode, handleCancelResize, handleConfirmResize, handleCancelTransform, handleCancelAspectRatio, handleApplyAspectRatioCanvas, effectiveResetAdjustments, effectiveApplyAdjustments]);

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target?.result as string;
                setEditorMode('edit');
                loadImageFromDataUrl(dataUrl, () => {
                    resetHistory(dataUrl);
                    setError(null);
                    setPromptText('');
                    setEditSuggestions([]);
                    setSnapshots([]);
                    setShowFillButton(false);
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleStyleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target?.result as string;
                setStyleImage({ file, dataUrl });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGetAiSuggestions = async () => {
        if (!originalImage) return;
        setIsAnalyzing(true);
        setEditSuggestions([]);
        setError(null);
        try {
            const imageB64 = originalImage.src.split(',')[1];
            const suggestions = await analyzeImageForSuggestions(imageB64);
            setEditSuggestions(suggestions);
        } catch(err) { setError(err instanceof Error ? err.message : "Failed to get AI suggestions."); }
        finally { setIsAnalyzing(false); }
    };

    const handleImprovePrompt = async () => {
        if (!promptText.trim()) return;
        setIsImprovingPrompt(true);
        setError(null);
        try {
            const improved = await improvePrompt(promptText);
            setPromptText(improved);
        } catch (err) { setError(err instanceof Error ? err.message : "Failed to improve prompt."); }
        finally { setIsImprovingPrompt(false); }
    };

    const handleMaskByText = async () => {
        if (!originalImage || !maskPrompt.trim()) return;
        setIsMaskingByText(true);
        setError(null);
        try {
            const imageB64 = originalImage.src.split(',')[1];
            const maskB64 = await generateMask(imageB64, maskPrompt);
            const maskImg = new Image();
            maskImg.onload = () => {
                const maskCanvas = maskCanvasRef.current;
                const maskCtx = maskCanvas?.getContext('2d');
                if (maskCanvas && maskCtx) {
                    maskCtx.clearRect(0,0, maskCanvas.width, maskCanvas.height);
                    maskCtx.drawImage(maskImg, 0, 0, maskCanvas.width, maskCanvas.height);
                    redrawCanvas();
                }
            };
            maskImg.src = `data:image/png;base64,${maskB64}`;
        } catch (err) { setError(err instanceof Error ? err.message : "Failed to auto-mask from text.") }
        finally { setIsMaskingByText(false); }
    };

    const handleAutoMaskBackground = useCallback(async () => {
        if (!originalImage) return;
        setLoadingMessage('Auto-masking background...');
        setIsLoading(true);
        setError(null);
        try {
            const imageB64 = originalImage.src.split(',')[1];
            const maskB64 = await generateMask(imageB64, 'the background');
            const maskImg = new Image();
            maskImg.onload = () => {
                const maskCanvas = maskCanvasRef.current;
                const maskCtx = maskCanvas?.getContext('2d');
                if (maskCanvas && maskCtx) {
                    maskCtx.clearRect(0,0, maskCanvas.width, maskCanvas.height);
                    maskCtx.drawImage(maskImg, 0, 0, maskCanvas.width, maskCanvas.height);
                    redrawCanvas();
                }
            };
            maskImg.src = `data:image/png;base64,${maskB64}`;
        } catch(err) { setError(err instanceof Error ? err.message : "Failed to auto-mask background."); }
        finally { setIsLoading(false); }
    }, [originalImage, redrawCanvas]);

    useEffect(() => {
        if (editorMode === 'replace_bg' && originalImage) {
            const maskCtx = maskCanvasRef.current?.getContext('2d');
            if (!maskCtx) return;
            const pixelData = maskCtx.getImageData(0, 0, 1, 1).data;
            if(pixelData[3] === 0) handleAutoMaskBackground();
        }
    }, [editorMode, originalImage, handleAutoMaskBackground]);

    const getCanvasPointFromEvent = (e: React.MouseEvent | { clientX: number, clientY: number }): { x: number; y: number } => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const containerRect = containerRef.current!.getBoundingClientRect();
        return {
            x: (e.clientX - containerRect.left - transform.offsetX) / transform.scale,
            y: (e.clientY - containerRect.top - transform.offsetY) / transform.scale,
        };
    };

    const getHandleUnderCursor = useCallback((point: { x: number; y: number }, box: BoundingBox | null): string | null => {
        if (!box) return null;
        const handles = getHandles(box);
        const handleSizeOnCanvas = HANDLE_SIZE_PX / transform.scale;
        for (const [name, pos] of Object.entries(handles)) {
            if (
                point.x >= pos.x - handleSizeOnCanvas / 2 && point.x <= pos.x + handleSizeOnCanvas / 2 &&
                point.y >= pos.y - handleSizeOnCanvas / 2 && point.y <= pos.y + handleSizeOnCanvas / 2
            ) {
                return name;
            }
        }
        return null;
    }, [transform.scale, getHandles]);

    const isPointInBox = (point: {x:number, y:number}, box: BoundingBox) => {
        return point.x >= box.x && point.x <= box.x + box.width &&
                point.y >= box.y && point.y <= box.y + box.height;
    }

    const drawOnMask = useCallback((point: { x: number; y: number }, tool: Tool) => {
        const maskCtx = maskCanvasRef.current?.getContext('2d');
        if (!maskCtx) return;

        maskCtx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
        
        const dynamicBrushSize = brushSize * (0.95 + Math.random() * 0.1);
        const gradient = maskCtx.createRadialGradient(point.x, point.y, 0, point.x, point.y, dynamicBrushSize / 2);
        
        if(tool === 'brush') {
            gradient.addColorStop(0, `rgba(139, 92, 246, 0.8)`);
            gradient.addColorStop(1, 'rgba(139, 92, 246, 0)');
        } else {
            gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        }
        
        maskCtx.fillStyle = gradient;
        maskCtx.beginPath();
        maskCtx.arc(point.x, point.y, dynamicBrushSize / 2, 0, Math.PI * 2);
        maskCtx.fill();
    }, [brushSize]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        const pos = getCanvasPointFromEvent(e);

        if (e.ctrlKey) {
            startPan(e);
            return;
        }

        if (editorMode === 'resize' && resizeBox) {
            const handle = getHandleUnderCursor(pos, resizeBox);
            if (handle) {
                setActiveHandle(handle);
                setResizeStart({ x: pos.x, y: pos.y, box: resizeBox });
            }
            return;
        }

        if (editorMode === 'change_ratio' && aspectRatioBox) {
            const handle = getHandleUnderCursor(pos, aspectRatioBox);
            if (handle) {
                setActiveHandle(handle);
                setResizeStart({ x: pos.x, y: pos.y, box: aspectRatioBox });
            } else if (isPointInBox(pos, aspectRatioBox)) {
                setIsMovingAspectRatioBox(true);
                setResizeStart({ x: pos.x, y: pos.y, box: aspectRatioBox });
            }
            return;
        }
        
        const isMaskingMode = ['edit', 'remove', 'replace_bg'].includes(editorMode);
        if (!originalImage || !isMaskingMode) return;
        
        setIsDrawing(true);
        lastPointRef.current = pos;
        drawOnMask(pos, currentTool);
        redrawCanvas();
    }, [originalImage, currentTool, drawOnMask, redrawCanvas, editorMode, startPan, resizeBox, getHandleUnderCursor, aspectRatioBox]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        const currentPoint = getCanvasPointFromEvent(e);

        if (activeHandle && resizeStart) {
            if (editorMode === 'resize' && resizeBox) {
                const deltaX = currentPoint.x - resizeStart.x;
                const deltaY = currentPoint.y - resizeStart.y;
                let { x, y, width, height } = resizeStart.box;
                if (activeHandle.includes('right')) width += deltaX;
                else if (activeHandle.includes('left')) { width -= deltaX; x += deltaX; }
                if (activeHandle.includes('bottom')) height += deltaY;
                else if (activeHandle.includes('top')) { height -= deltaY; y += deltaY; }
                setResizeBox({ x, y, width: Math.max(width, MIN_RESIZE_DIMENSION), height: Math.max(height, MIN_RESIZE_DIMENSION) });
                return;
            }
            if (editorMode === 'change_ratio' && aspectRatioBox && aspectRatioValue) {
                let { x, y, width, height } = resizeStart.box;
                const ratio = aspectRatioValue;
                const anchor = {
                    x: activeHandle.includes('left') ? x + width : x,
                    y: activeHandle.includes('top') ? y + height : y,
                };

                let newWidth = activeHandle.includes('left') ? anchor.x - currentPoint.x : currentPoint.x - anchor.x;
                let newHeight = activeHandle.includes('top') ? anchor.y - currentPoint.y : currentPoint.y - anchor.y;

                if (activeHandle === 'top' || activeHandle === 'bottom') {
                    newWidth = newHeight * ratio;
                } else if (activeHandle === 'left' || activeHandle === 'right') {
                    newHeight = newWidth / ratio;
                } else { // Corner handles
                    if (newWidth / newHeight > ratio) newWidth = newHeight * ratio;
                    else newHeight = newWidth / ratio;
                }

                x = activeHandle.includes('left') ? anchor.x - newWidth : anchor.x;
                y = activeHandle.includes('top') ? anchor.y - newHeight : anchor.y;
                
                if (activeHandle === 'top' || activeHandle === 'bottom') x = resizeStart.box.x - (newWidth - resizeStart.box.width) / 2;
                if (activeHandle === 'left' || activeHandle === 'right') y = resizeStart.box.y - (newHeight - resizeStart.box.height) / 2;

                setAspectRatioBox({ x, y, width: Math.max(newWidth, MIN_RESIZE_DIMENSION), height: Math.max(newHeight, MIN_RESIZE_DIMENSION / ratio) });
                return;
            }
        }
        if (isMovingAspectRatioBox && resizeStart && aspectRatioBox) {
            const deltaX = currentPoint.x - resizeStart.x;
            const deltaY = currentPoint.y - resizeStart.y;
            setAspectRatioBox({ ...aspectRatioBox, x: resizeStart.box.x + deltaX, y: resizeStart.box.y + deltaY });
            return;
        }

        if (editorMode === 'resize') setHoveredHandle(getHandleUnderCursor(currentPoint, resizeBox));
        if (editorMode === 'change_ratio') {
            setHoveredHandle(getHandleUnderCursor(currentPoint, aspectRatioBox));
            if(aspectRatioBox) setIsCursorInAspectRatioBox(isPointInBox(currentPoint, aspectRatioBox));
        }

        if (isPanning) {
            pan(e);
            return;
        }
        if (!isDrawing) return;
        
        const lastPoint = lastPointRef.current;
        if (!lastPoint) return;

        const dist = Math.hypot(currentPoint.x - lastPoint.x, currentPoint.y - lastPoint.y);
        const angle = Math.atan2(currentPoint.y - lastPoint.y, currentPoint.x - lastPoint.x);

        for (let i = 0; i < dist; i += 2) {
            const x = lastPoint.x + (Math.cos(angle) * i);
            const y = lastPoint.y + (Math.sin(angle) * i);
            drawOnMask({ x, y }, currentTool);
        }

        lastPointRef.current = currentPoint;
        redrawCanvas();
    }, [isPanning, isDrawing, currentTool, drawOnMask, redrawCanvas, pan, activeHandle, resizeStart, resizeBox, editorMode, getHandleUnderCursor, aspectRatioBox, isMovingAspectRatioBox, aspectRatioValue]);

    const handleMouseUp = useCallback(() => {
        if (activeHandle) {
            setActiveHandle(null);
            setResizeStart(null);
        }
        if (isMovingAspectRatioBox) {
            setIsMovingAspectRatioBox(false);
            setResizeStart(null);
        }
        setIsDrawing(false);
        endPan();
        lastPointRef.current = null;
    }, [endPan, activeHandle, isMovingAspectRatioBox]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2) { // Pan with two fingers
            e.preventDefault();
            setIsDrawing(false); // Ensure drawing stops if it was active
            const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            startPan({ clientX: midX, clientY: midY } as React.MouseEvent);
        } else if (e.touches.length === 1) { // Draw with one finger
            const touch = e.touches[0];
            const fakeMouseEvent = {
                preventDefault: () => e.preventDefault(),
                clientX: touch.clientX,
                clientY: touch.clientY,
                ctrlKey: false, // Ensure one finger does not trigger panning
            };
            handleMouseDown(fakeMouseEvent as React.MouseEvent);
        }
    }, [handleMouseDown, startPan]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (isPanning && e.touches.length === 2) { // Panning
            e.preventDefault();
            const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            pan({ clientX: midX, clientY: midY } as React.MouseEvent);
        } else if ((isDrawing || activeHandle || isMovingAspectRatioBox) && e.touches.length === 1) { // Drawing or Resizing
            e.preventDefault();
            const touch = e.touches[0];
            const fakeMouseEvent = {
                preventDefault: () => e.preventDefault(),
                clientX: touch.clientX,
                clientY: touch.clientY,
            };
            handleMouseMove(fakeMouseEvent as React.MouseEvent);
        }
    }, [isPanning, isDrawing, pan, handleMouseMove, activeHandle, isMovingAspectRatioBox]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        endPan();
        handleMouseUp();
    }, [endPan, handleMouseUp]);

    const handleVary = async () => {
        if (!lastGenerationParams) return;
        setLoadingMessage('Creating a variation...');
        setIsLoading(true);
        setError(null);
        try {
            const resultB64 = await generateImageFromImageAndPrompt(lastGenerationParams.prompt, lastGenerationParams.imageB64);
            const newBaseImageSrc = `data:image/png;base64,${resultB64}`;
            loadImageFromDataUrl(newBaseImageSrc);
            updateHistory(newBaseImageSrc);
        } catch (err) { setError(err instanceof Error ? err.message : 'An unknown error occurred while creating a variation.'); }
        finally { setIsLoading(false); }
    };

    const handleApplyFilter = async (filterPrompt: string) => {
        if (!originalImage) return;
        setLoadingMessage('Applying AI Filter...');
        setIsLoading(true);
        setError(null);
        try {
            const imageB64 = originalImage.src.split(',')[1];
            const resultB64 = await generateImageFromImageAndPrompt(filterPrompt, imageB64);
            const newBaseImageSrc = `data:image/png;base64,${resultB64}`;
            loadImageFromDataUrl(newBaseImageSrc);
            updateHistory(newBaseImageSrc);
        } catch(err) { setError(err instanceof Error ? err.message : 'Failed to apply filter.'); }
        finally { setIsLoading(false); }
    };

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);
        setShowFillButton(false);
        try {
            switch(editorMode) {
                case 'edit': case 'remove': case 'replace_bg': await handleInpainting(); break;
                case 'enhance': await handleEnhance(); break;
                case 'style_transfer': await handleStyleTransfer(); break;
                case 'resize': 
                case 'transform': 
                case 'change_ratio':
               case 'adjustments': 
                    break;
                default: throw new Error("Invalid editor mode selected.");
            }
        } catch (err) { setError(err instanceof Error ? err.message : 'An unknown error occurred.'); }
        finally { setIsLoading(false); }
    };

    const handleInpainting = async () => {
        if (!originalImage) {
            throw new Error('Please upload an image.');
        }

        setLoadingMessage('AI is editing your image...');

        let finalPrompt = promptText;
        if (editorMode === 'edit' && styleKeywords) {
            finalPrompt = promptText.trim() ? `${promptText.trim()}, ${styleKeywords}` : styleKeywords;
        } else if (editorMode === 'remove') {
            finalPrompt = REMOVE_OBJECT_PROMPT(promptText);
        }

        const imageB64 = originalImage.src.split(',')[1];

        if (editorMode === 'edit') {
            setLastGenerationParams({ prompt: finalPrompt, imageB64 });
        } else {
            setLastGenerationParams(null);
        }

        const maskCanvas = maskCanvasRef.current;
        let resultB64: string;

        if (editorMode === 'edit' && isMaskEmpty(maskCanvas)) {
            resultB64 = await generateImageFromImageAndPrompt(finalPrompt, imageB64);
        } else {
            const maskB64 = maskCanvas!.toDataURL('image/png').split(',')[1];
            resultB64 = await generateInpaintedImage(finalPrompt, imageB64, maskB64);
        }

        const newBaseImageSrc = `data:image/png;base64,${resultB64}`;
        loadImageFromDataUrl(newBaseImageSrc);
        updateHistory(newBaseImageSrc);
    };

    const handleEnhance = async () => {
        if (!originalImage) throw new Error("Please upload an image first.");
        setLoadingMessage('Enhancing image quality...');
        const imageB64 = originalImage.src.split(',')[1];
        const resultB64 = await generateImageFromImageAndPrompt(ENHANCE_IMAGE_PROMPT, imageB64);
        const newBaseImageSrc = `data:image/png;base64,${resultB64}`;
        loadImageFromDataUrl(newBaseImageSrc);
        updateHistory(newBaseImageSrc);
    };

    const handleFillEmptyAreas = async () => {
        if (!originalImage || !fillPrompt) return;
        setLoadingMessage('Filling expanded area...');
        setIsLoading(true);
        setError(null);
        setShowFillButton(false);
        try {
            const imageB64 = originalImage.src.split(',')[1];

            // Create a mask of the white areas
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = originalImage.width;
            maskCanvas.height = originalImage.height;
            const maskCtx = maskCanvas.getContext('2d')!;

            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = originalImage.width;
            tempCanvas.height = originalImage.height;
            const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true })!;
            tempCtx.drawImage(originalImage, 0, 0);

            const imageData = tempCtx.getImageData(0, 0, originalImage.width, originalImage.height);
            const data = imageData.data;
            const maskImageData = maskCtx.createImageData(originalImage.width, originalImage.height);
            const maskData = maskImageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                // Check for pure white
                if (r === 255 && g === 255 && b === 255) {
                    maskData[i] = 255;
                    maskData[i + 1] = 255;
                    maskData[i + 2] = 255;
                    maskData[i + 3] = 255;
                } else {
                    maskData[i] = 0;
                    maskData[i + 1] = 0;
                    maskData[i + 2] = 0;
                    maskData[i + 3] = 255;
                }
            }
            maskCtx.putImageData(maskImageData, 0, 0);
            
            const maskB64 = maskCanvas.toDataURL('image/png').split(',')[1];

            const resultB64 = await generateInpaintedImage(fillPrompt, imageB64, maskB64);
            const newImageSrc = `data:image/png;base64,${resultB64}`;
            loadImageFromDataUrl(newImageSrc);
            updateHistory(newImageSrc);
        } catch (err) { setError(err instanceof Error ? err.message : 'An unknown error occurred while filling the image.'); }
        finally { setIsLoading(false); }
    };

    const handleStyleTransfer = async () => {
        if (!originalImage || !styleImage) throw new Error("Please provide a main image and a style image.");
        setLoadingMessage('Applying artistic style...');
        const contentImageB64 = originalImage.src.split(',')[1];
        const styleImageB64 = styleImage.dataUrl.split(',')[1];
        const resultB64 = await applyStyleTransfer(contentImageB64, styleImageB64);
        const newImageSrc = `data:image/png;base64,${resultB64}`;
        loadImageFromDataUrl(newImageSrc);
        updateHistory(newImageSrc);
    };

    const handleDescribeImage = async () => {
        if (!canvasRef.current || !originalImage) return;
        setIsDescribing(true); setError(null);
        try {
            const imageB64 = canvasRef.current.toDataURL('image/png').split(',')[1];
            const jsonResponse = await describeImage(imageB64);
            setJsonPrompt(JSON.stringify(JSON.parse(jsonResponse), null, 2));
            setIsJsonModalOpen(true);
        } catch (err) { setError(err instanceof Error ? err.message : 'An unknown error occurred while describing the image.'); }
        finally { setIsDescribing(false); }
    };

    const handleRecreateImage = async () => {
        setIsLoading(true); setIsJsonModalOpen(false); setError(null);
        try {
            const resultB64 = await generateImageFromJsonPrompt(jsonPrompt);
            const newImageSrc = `data:image/png;base64,${resultB64}`;
            loadImageFromDataUrl(newImageSrc, () => {
                resetHistory(newImageSrc);
                setPromptText('');
                setEditSuggestions([]);
            });
        } catch (err) { setError(err instanceof Error ? err.message : 'An unknown error occurred while recreating the image.'); }
        finally { setIsLoading(false); }
    };

    const handleDownloadImage = () => {
        if (!canvasRef.current) return;
        const link = document.createElement('a');
        link.download = 'edited-image.png';
        link.href = canvasRef.current.toDataURL('image/png');
        link.click();
    };

    const handleSaveSnapshot = () => {
        const name = prompt("Enter a name for this snapshot:", `Edit #${snapshots.length + 1}`);
        if (name && canvasRef.current) {
            const dataUrl = canvasRef.current.toDataURL('image/png');
            
            const thumbCanvas = document.createElement('canvas');
            thumbCanvas.width = 80; thumbCanvas.height = 80;
            const thumbCtx = thumbCanvas.getContext('2d')!;
            thumbCtx.drawImage(canvasRef.current, 0, 0, 80, 80);
            const thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.8);

            setSnapshots(prev => [...prev, { name, dataUrl, thumbnail }]);
        }
    };

    const handleLoadSnapshot = (dataUrl: string) => {
        loadImageFromDataUrl(dataUrl);
        updateHistory(dataUrl);
        setIsSnapshotsModalOpen(false);
    };

    const handleDeleteSnapshot = (index: number) => {
        setSnapshots(prev => prev.filter((_, i) => i !== index));
    };

    const getCursorStyle = () => {
        if (isPanning) return 'grabbing';
        if (isCtrlPressed) return 'grab';
        
        const isMaskingMode = ['edit', 'remove', 'replace_bg'].includes(editorMode);
        if (originalImage && isMaskingMode) {
            return 'none';
        }

        if (editorMode === 'resize') return hoveredHandle ? handleToCursorMap[hoveredHandle] : 'default';
        if (editorMode === 'change_ratio') {
            if (hoveredHandle) return handleToCursorMap[hoveredHandle];
            if (isCursorInAspectRatioBox) return 'move';
            return 'default';
        }
        if (editorMode === 'transform' || editorMode === 'adjustments') return 'default';
        
        return 'default';
    };

    return (
        <div className="p-4 sm:px-8 h-full">
            <div className="max-w-screen-2xl mx-auto grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-8 h-full">
                <div className="lg:col-span-1 xl:col-span-1 h-full">
                    <ControlsPanel
                        onGoHome={onGoHome}
                        onImageUpload={handleImageUpload}
                        onStyleImageUpload={handleStyleImageUpload}
                        styleImageName={styleImage?.file.name ?? null}
                        brushSize={brushSize}
                        onBrushSizeChange={setBrushSize}
                        onClearMask={handleClearMask}
                        isLoading={isLoading}
                        editorMode={editorMode}
                        setEditorMode={setEditorMode}
                        currentTool={currentTool}
                        setCurrentTool={setCurrentTool}
                        maskPrompt={maskPrompt}
                        onMaskPromptChange={setMaskPrompt}
                        onMaskByText={handleMaskByText}
                        isMaskingByText={isMaskingByText}
                        onApplyFilter={handleApplyFilter}
                        onConfirmResize={handleConfirmResize}
                        onCancelResize={handleCancelResize}
                        rotation={rotation}
                        onRotationChange={setRotation}
                        skewX={skewX}
                        onSkewXChange={setSkewX}
                        skewY={skewY}
                        onSkewYChange={setSkewY}
                        onApplyTransform={handleApplyTransform}
                        onCancelTransform={handleCancelTransform}
                        adjustments={adjustments}
                        onAdjustmentChange={handleAdjustmentChange}
                        onColorBalanceChange={handleColorBalanceChange}
                        onApplyAdjustments={effectiveApplyAdjustments}
                        onResetAdjustments={effectiveResetAdjustments}
                    />
                </div>
                <div className="lg:col-span-3 xl:col-span-4 flex flex-col h-full gap-4">
                    <div className="relative flex-grow min-h-0">
                        <CanvasView
                            containerRef={containerRef}
                            canvasRef={canvasRef}
                            maskCanvasRef={maskCanvasRef}
                            originalImage={originalImage}
                            transform={transform}
                            cursorStyle={getCursorStyle()}
                            isLoading={isLoading}
                            loadingMessage={loadingMessage}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            onWheel={handleWheelZoom}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            onZoomIn={() => handleZoom('in')}
                            onZoomOut={() => handleZoom('out')}
                            onFitScreen={fitScreenView}
                            onFillScreen={fillScreenView}
                            onZoomToPercentage={zoomToPercentage}
                            editorMode={editorMode}
                            resizeBox={resizeBox}
                            aspectRatioBox={aspectRatioBox}
                            rotation={rotation}
                            skewX={skewX}
                            skewY={skewY}
                            brushSize={brushSize}
                            currentTool={currentTool}
                            // Aspect Ratio Dock props
                            onSelectAspectRatio={handleSelectAspectRatio}
                            selectedAspectRatio={selectedAspectRatio}
                            onApplyAspectRatioCanvas={handleApplyAspectRatioCanvas}
                            onCancelAspectRatio={handleCancelAspectRatio}
                            onFreeSize={() => setEditorMode('resize')}
                        />
                    </div>
                    <EditorActions
                        promptText={promptText}
                        onPromptChange={setPromptText}
                        onImprovePrompt={handleImprovePrompt}
                        isImprovingPrompt={isImprovingPrompt}
                        onGetAiSuggestions={handleGetAiSuggestions}
                        isAnalyzing={isAnalyzing}
                        editSuggestions={editSuggestions}
                        onStyleSelect={setStyleKeywords}
                        onGenerate={handleGenerate}
                        isLoading={isLoading}
                        error={error}
                        editorMode={editorMode}
                        styleImageName={styleImage?.file.name ?? null}
                        showFillButton={showFillButton}
                        onFillExpanded={handleFillEmptyAreas}
                        onDescribeImage={handleDescribeImage}
                        isDescribing={isDescribing}
                        onDownloadImage={handleDownloadImage}
                        onUndo={handleUndo}
                        canUndo={canUndo}
                        onRedo={handleRedo}
                        canRedo={canRedo}
                        onVary={() => handleVary()}
                        canVary={!!lastGenerationParams}
                        onSaveSnapshot={handleSaveSnapshot}
                        onViewSnapshots={() => setIsSnapshotsModalOpen(true)}
                    />
                </div>
            </div>
            <JsonModal 
                isOpen={isJsonModalOpen} 
                onClose={() => setIsJsonModalOpen(false)} 
                jsonPrompt={jsonPrompt} 
                onJsonPromptChange={setJsonPrompt} 
                onRecreate={handleRecreateImage} 
            />
            <SnapshotsModal
                isOpen={isSnapshotsModalOpen}
                onClose={() => setIsSnapshotsModalOpen(false)}
                snapshots={snapshots}
                onLoad={handleLoadSnapshot}
                onDelete={handleDeleteSnapshot}
            />
        </div>
    );
};
export default EditorPage;