import React, { useState, useRef, useEffect, useCallback } from 'react';
import { generateInpaintedImage, generateImageFromImageAndPrompt, analyzeImageForSuggestions, describeImage, generateImageFromJsonPrompt, generateMask, improvePrompt, applyStyleTransfer } from '../services/geminiService';
import { BoundingBox } from '../types';
import ControlsPanel from './ControlsPanel';
import CanvasView from './CanvasView';
import JsonModal from './JsonModal';
import SnapshotsModal from './SnapshotsModal';
import { useImageHistory } from '../hooks/useImageHistory';
import { useCanvasTransform } from '../hooks/useCanvasTransform';

export type Tool = 'brush' | 'eraser';
export type EditorMode = 'edit' | 'remove' | 'replace_bg' | 'enhance' | 'style_transfer';

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
    // Core State
    const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
    const [promptText, setPromptText] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('AI is creating...');
    const [error, setError] = useState<string | null>(null);

    // UI/Tool State
    const [isDrawing, setIsDrawing] = useState<boolean>(false);
    const [brushSize, setBrushSize] = useState<number>(40);
    const [editSuggestions, setEditSuggestions] = useState<string[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const [isImprovingPrompt, setIsImprovingPrompt] = useState<boolean>(false);
    const [currentTool, setCurrentTool] = useState<Tool>('brush');
    const [isCtrlPressed, setIsCtrlPressed] = useState(false);
    const [isJsonModalOpen, setIsJsonModalOpen] = useState<boolean>(false);
    const [jsonPrompt, setJsonPrompt] = useState<string>('');
    const [isDescribing, setIsDescribing] = useState<boolean>(false);
    const [lastGenerationParams, setLastGenerationParams] = useState<{ prompt: string; imageB64: string; maskB64: string; bbox: BoundingBox } | null>(null);
    const [editorMode, setEditorMode] = useState<EditorMode>('edit');
    const [styleKeywords, setStyleKeywords] = useState<string | null>(null);
    const [styleImage, setStyleImage] = useState<{file: File, dataUrl: string} | null>(null);
    const [maskPrompt, setMaskPrompt] = useState('');
    const [isMaskingByText, setIsMaskingByText] = useState(false);
    const [snapshots, setSnapshots] = useState<{name: string; dataUrl: string; thumbnail: string}[]>([]);
    const [isSnapshotsModalOpen, setIsSnapshotsModalOpen] = useState(false);
    const [showFillButton, setShowFillButton] = useState(false);
    
    // Resize state
    const [isResizing, setIsResizing] = useState(false);
    const [resizeBox, setResizeBox] = useState<BoundingBox | null>(null);
    const [activeHandle, setActiveHandle] = useState<string | null>(null);
    const [hoveredHandle, setHoveredHandle] = useState<string | null>(null);
    const [resizeStart, setResizeStart] = useState<{x: number; y: number; box: BoundingBox} | null>(null);
    
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

    const redrawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const maskCanvas = maskCanvasRef.current;
        if (!canvas || !maskCanvas || !originalImage) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);

        const modeConfig = {
            edit: { hasMasking: true }, remove: { hasMasking: true },
            replace_bg: { hasMasking: true }, enhance: { hasMasking: false },
            style_transfer: { hasMasking: false },
        };

        if (modeConfig[editorMode]?.hasMasking && !isResizing) {
            ctx.globalAlpha = 0.5;
            ctx.drawImage(maskCanvas, 0, 0);
            ctx.globalAlpha = 1.0;
        }

        if (isResizing && resizeBox) {
            ctx.strokeStyle = 'rgba(0, 150, 255, 0.8)';
            ctx.lineWidth = 2 / transform.scale;
            ctx.setLineDash([6 / transform.scale, 4 / transform.scale]);
            ctx.strokeRect(resizeBox.x, resizeBox.y, resizeBox.width, resizeBox.height);
            ctx.setLineDash([]);
            
            ctx.fillStyle = 'rgba(0, 150, 255, 0.8)';
            const handleSize = HANDLE_SIZE_PX / transform.scale;
            const handles = getHandles(resizeBox);
            Object.values(handles).forEach(handle => {
                ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
            });
        }
    }, [originalImage, editorMode, resizeBox, transform.scale, getHandles, isResizing]);

    const handleClearMask = useCallback(() => {
        const maskCanvas = maskCanvasRef.current;
        const maskCtx = maskCanvas?.getContext('2d');
        if (maskCtx) {
            maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
            redrawCanvas();
        }
    }, [redrawCanvas]);

    const loadImageFromDataUrl = useCallback((dataUrl: string, callback?: (img: HTMLImageElement) => void) => {
        const img = new Image();
        img.onload = () => {
            const canvas = canvasRef.current;
            const maskCanvas = maskCanvasRef.current;
            const container = containerRef.current;
            if (!canvas || !maskCanvas || !container) return;
            
            // Get the original image dimensions
            let { width: imgWidth, height: imgHeight } = img;
            const originalWidth = imgWidth;
            const originalHeight = imgHeight;
            
            // Only scale down if the image exceeds MAX_CANVAS_DIMENSION
            // But preserve aspect ratio and don't make it unnecessarily small
            const maxDim = Math.max(imgWidth, imgHeight);
            let scaleRatio = 1;
            
            if (maxDim > MAX_CANVAS_DIMENSION) {
                scaleRatio = MAX_CANVAS_DIMENSION / maxDim;
                imgWidth = Math.round(imgWidth * scaleRatio);
                imgHeight = Math.round(imgHeight * scaleRatio);
            }
            
            // Set canvas dimensions to the scaled image size
            canvas.width = imgWidth;
            canvas.height = imgHeight;
            maskCanvas.width = imgWidth;
            maskCanvas.height = imgHeight;
            
            // Remove any CSS sizing that might interfere with proper display
            canvas.style.width = '';
            canvas.style.height = '';
            maskCanvas.style.width = '';
            maskCanvas.style.height = '';
            
            // Create a new image object with the correct src for drawing
            const scaledImg = new Image();
            scaledImg.onload = () => {
                setOriginalImage(scaledImg);
                if(callback) callback(scaledImg);
            };
            
            // If we scaled the image, create a properly sized version
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
    
    const { handleUndo, handleRedo, updateHistory, resetHistory, canUndo, canRedo } = useImageHistory(loadImageFromDataUrl, handleClearMask);
    
    useEffect(() => {
        if (initialImageDataUrl) {
            loadImageFromDataUrl(initialImageDataUrl, (img) => {
                resetHistory(initialImageDataUrl);
                // Use setTimeout to ensure the image and canvas are fully loaded before fitting
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
            // Use setTimeout to ensure the canvas is rendered before fitting
            setTimeout(() => {
                fitScreenView();
            }, 50);
        }
    }, [originalImage, fitScreenView]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const resizeObserver = new ResizeObserver(() => {
            // Debounce the fitScreenView call
            setTimeout(() => {
                fitScreenView();
            }, 100);
        });
        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, [fitScreenView]);

    useEffect(() => {
        if (originalImage) redrawCanvas();
    }, [originalImage, redrawCanvas, resizeBox, isResizing]);
    
    const handleCancelResize = useCallback(() => {
        setIsResizing(false);
        setResizeBox(null);
        setActiveHandle(null);
        setHoveredHandle(null);
        setResizeStart(null);
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
        tempCtx.drawImage(originalImage, Math.round(-resizeBox.x), Math.round(-resizeBox.y));
        const newImageSrc = tempCanvas.toDataURL('image/png');
        loadImageFromDataUrl(newImageSrc, () => {
            updateHistory(newImageSrc);
            setShowFillButton(wasExpanded);
            handleCancelResize();
        });
    }, [originalImage, resizeBox, loadImageFromDataUrl, updateHistory, handleCancelResize]);

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
            if (e.key === 'Escape' && isResizing) handleCancelResize();
            if (e.key === 'Enter' && isResizing) handleConfirmResize();
        };
        const handleKeyUp = (e: KeyboardEvent) => { if (e.key === 'Control') setIsCtrlPressed(false); };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [handleUndo, handleRedo, isResizing, handleCancelResize, handleConfirmResize]);

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
    
    const handleToggleResizeMode = () => {
        if (!originalImage) return;
        if (isResizing) {
            handleCancelResize();
        } else {
            setIsResizing(true);
            setResizeBox({x: 0, y: 0, width: originalImage.width, height: originalImage.height});
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

    const getHandleUnderCursor = useCallback((point: { x: number; y: number }): string | null => {
        if (!resizeBox) return null;
        const handles = getHandles(resizeBox);
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
    }, [resizeBox, transform.scale, getHandles]);

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

        if (isResizing && resizeBox) {
            const handle = getHandleUnderCursor(pos);
            if (handle) {
                setActiveHandle(handle);
                setResizeStart({ x: pos.x, y: pos.y, box: resizeBox });
            }
            return;
        }
        
        const modeConfig = {
            edit: { hasMasking: true }, remove: { hasMasking: true },
            replace_bg: { hasMasking: true }, enhance: { hasMasking: false },
            style_transfer: { hasMasking: false },
        };
        if (!originalImage || !modeConfig[editorMode]?.hasMasking) return;
        
        setIsDrawing(true);
        lastPointRef.current = pos;
        drawOnMask(pos, currentTool);
        redrawCanvas();
    }, [originalImage, currentTool, drawOnMask, redrawCanvas, editorMode, startPan, isResizing, resizeBox, getHandleUnderCursor]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (activeHandle && resizeStart && resizeBox) {
            const currentPoint = getCanvasPointFromEvent(e);
            const deltaX = currentPoint.x - resizeStart.x;
            const deltaY = currentPoint.y - resizeStart.y;
            let { x, y, width, height } = resizeStart.box;

            if (activeHandle.includes('right')) width += deltaX;
            else if (activeHandle.includes('left')) { width -= deltaX; x += deltaX; }

            if (activeHandle.includes('bottom')) height += deltaY;
            else if (activeHandle.includes('top')) { height -= deltaY; y += deltaY; }
            
            setResizeBox({ 
                x, y, 
                width: Math.max(width, MIN_RESIZE_DIMENSION), 
                height: Math.max(height, MIN_RESIZE_DIMENSION) 
            });
            return;
        }
        
        const pos = getCanvasPointFromEvent(e);
        if (isResizing) {
            setHoveredHandle(getHandleUnderCursor(pos));
        }

        if (isPanning) {
            pan(e);
            return;
        }
        if (!isDrawing) return;

        const currentPoint = getCanvasPointFromEvent(e);
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
    }, [isPanning, isDrawing, currentTool, drawOnMask, redrawCanvas, pan, activeHandle, resizeStart, isResizing, getHandleUnderCursor]);

    const handleMouseUp = useCallback(() => {
        if (activeHandle) {
            setActiveHandle(null);
            setResizeStart(null);
        }
        setIsDrawing(false);
        endPan();
        lastPointRef.current = null;
    }, [endPan, activeHandle]);

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
        } else if (isDrawing && e.touches.length === 1) { // Drawing
            e.preventDefault();
            const touch = e.touches[0];
            const fakeMouseEvent = {
                preventDefault: () => e.preventDefault(),
                clientX: touch.clientX,
                clientY: touch.clientY,
            };
            handleMouseMove(fakeMouseEvent as React.MouseEvent);
        }
    }, [isPanning, isDrawing, pan, handleMouseMove]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        // End any ongoing action (pan or draw) when a touch is lifted
        endPan();
        handleMouseUp();
    }, [endPan, handleMouseUp]);

    const getBoundingBox = (): BoundingBox | null => {
        const maskCanvas = maskCanvasRef.current;
        if (!maskCanvas) return null;
        const maskCtx = maskCanvas.getContext('2d');
        if (!maskCtx) return null;
        const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        const data = imageData.data;
        let minX = maskCanvas.width, minY = maskCanvas.height, maxX = -1, maxY = -1;
        for (let y = 0; y < maskCanvas.height; y++) {
            for (let x = 0; x < maskCanvas.width; x++) {
                if (data[(y * maskCanvas.width + x) * 4 + 3] > 0) {
                    minX = Math.min(minX, x); minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
                }
            }
        }
        if (maxX === -1) return null;
        const PADDING = 30;
        const x = Math.max(0, minX - PADDING);
        const y = Math.max(0, minY - PADDING);
        const width = Math.min(maskCanvas.width, maxX + PADDING) - x;
        const height = Math.min(maskCanvas.height, maxY + PADDING) - y;
        return (width > 0 && height > 0) ? { x, y, width, height } : null;
    };
    
    const processAndStitchResult = (resultB64: string, bbox: BoundingBox) => {
        const resultImg = new Image();
        resultImg.onload = () => {
            const mainCanvas = canvasRef.current;
            const mainCtx = mainCanvas?.getContext('2d');
            if (mainCanvas && mainCtx && originalImage) {
                mainCtx.drawImage(originalImage, 0, 0, mainCanvas.width, mainCanvas.height);
                mainCtx.drawImage(resultImg, bbox.x, bbox.y, bbox.width, bbox.height);
                const newBaseImageSrc = mainCanvas.toDataURL('image/png');
                loadImageFromDataUrl(newBaseImageSrc);
                updateHistory(newBaseImageSrc);
            }
        };
        resultImg.src = `data:image/png;base64,${resultB64}`;
    };

    const handleVary = async () => {
        if (!lastGenerationParams) return;
        setLoadingMessage('Creating a variation...');
        setIsLoading(true);
        setError(null);
        try {
            const resultB64 = await generateInpaintedImage(lastGenerationParams.prompt, lastGenerationParams.imageB64, lastGenerationParams.maskB64);
            processAndStitchResult(resultB64, lastGenerationParams.bbox);
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
                default: throw new Error("Invalid editor mode selected.");
            }
        } catch (err) { setError(err instanceof Error ? err.message : 'An unknown error occurred.'); }
        finally { setIsLoading(false); }
    };
    
    const handleInpainting = async () => {
        const modeConfig = { edit: { hasPrompt: true }, remove: { hasPrompt: false }, replace_bg: { hasPrompt: true } };
        if (!originalImage || (modeConfig[editorMode as 'edit' | 'remove' | 'replace_bg'].hasPrompt && !promptText)) {
            throw new Error('Please upload an image and provide a prompt.');
        }
        setLoadingMessage('AI is editing your image...');
        let finalPrompt = promptText;
        if (editorMode === 'edit' && styleKeywords) {
            finalPrompt = promptText.trim() ? `${promptText.trim()}, ${styleKeywords}` : styleKeywords;
        } else if (editorMode === 'remove') {
            finalPrompt = "Completely remove the object, person, or element indicated by the mask. Fill the masked area by realistically reconstructing the background that should be behind it.";
        }
        const finalBbox = getBoundingBox() ?? { x: 0, y: 0, width: originalImage.width, height: originalImage.height };
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = finalBbox.width; tempCanvas.height = finalBbox.height;
        tempCanvas.getContext('2d')!.drawImage(originalImage, finalBbox.x, finalBbox.y, finalBbox.width, finalBbox.height, 0, 0, finalBbox.width, finalBbox.height);
        const imageB64 = tempCanvas.toDataURL('image/png').split(',')[1];
        const maskBwCanvas = document.createElement('canvas');
        maskBwCanvas.width = finalBbox.width; maskBwCanvas.height = finalBbox.height;
        const maskBwCtx = maskBwCanvas.getContext('2d')!;
        maskBwCtx.drawImage(maskCanvasRef.current!, finalBbox.x, finalBbox.y, finalBbox.width, finalBbox.height, 0, 0, finalBbox.width, finalBbox.height);
        const maskBwImageData = maskBwCtx.getImageData(0,0, finalBbox.width, finalBbox.height);
        for (let i = 0; i < maskBwImageData.data.length; i += 4) {
             maskBwImageData.data[i] = maskBwImageData.data[i+1] = maskBwImageData.data[i+2] = maskBwImageData.data[i + 3] > 0 ? 255 : 0;
        }
        maskBwCtx.putImageData(maskBwImageData, 0, 0);
        const maskB64 = maskBwCanvas.toDataURL('image/png').split(',')[1];
        if (editorMode === 'edit') setLastGenerationParams({ prompt: finalPrompt, imageB64, maskB64, bbox: finalBbox });
        const resultB64 = await generateInpaintedImage(finalPrompt, imageB64, maskB64);
        processAndStitchResult(resultB64, finalBbox);
    };

    const handleEnhance = async () => {
        if (!originalImage) throw new Error("Please upload an image first.");
        setLoadingMessage('Enhancing image quality...');
        const enhancePrompt = "Upscale this image to double its resolution. Intelligently enhance details, remove noise and compression artifacts, and improve overall clarity while preserving the original content and photorealism.";
        const imageB64 = originalImage.src.split(',')[1];
        const resultB64 = await generateImageFromImageAndPrompt(enhancePrompt, imageB64);
        const newBaseImageSrc = `data:image/png;base64,${resultB64}`;
        loadImageFromDataUrl(newBaseImageSrc);
        updateHistory(newBaseImageSrc);
    };

    const handleFillExpanded = async () => {
        if (!originalImage) return;
        setLoadingMessage('Filling expanded area...');
        setIsLoading(true);
        setError(null);
        setShowFillButton(false);
        try {
            const imageB64 = originalImage.src.split(',')[1];
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = originalImage.width; maskCanvas.height = originalImage.height;
            const maskCtx = maskCanvas.getContext('2d')!;
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = originalImage.width; tempCanvas.height = originalImage.height;
            const tempCtx = tempCanvas.getContext('2d')!;
            tempCtx.drawImage(originalImage, 0, 0);
            const imageData = tempCtx.getImageData(0, 0, originalImage.width, originalImage.height);
            const data = imageData.data;
            maskCtx.fillStyle = 'white'; maskCtx.fillRect(0, 0, originalImage.width, originalImage.height);
            maskCtx.globalCompositeOperation = 'destination-out';
            for (let y = 0; y < originalImage.height; y++) {
                for (let x = 0; x < originalImage.width; x++) {
                    const i = (y * originalImage.width + x) * 4;
                    if (data[i] < 255 || data[i+1] < 255 || data[i+2] < 255) maskCtx.fillRect(x,y,1,1);
                }
            }
            maskCtx.globalCompositeOperation = 'source-over';
            const maskB64 = maskCanvas.toDataURL('image/png').split(',')[1];
            const expandPrompt = "This is an outpainting request. The user has provided an image with transparent areas indicated by the mask. Your task is to seamlessly and realistically fill in these transparent areas, extending the original image in a way that is coherent and contextually appropriate. Maintain the style, lighting, and subject matter of the original image.";
            const resultB64 = await generateInpaintedImage(expandPrompt, imageB64, maskB64);
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
            const resultB64 = await generateInpaintedImage(jsonPrompt, "", ""); // This is incorrect, should use text to image
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
        if (isResizing) return hoveredHandle ? handleToCursorMap[hoveredHandle] : 'default';
        const modeConfig = {
            edit: { hasMasking: true }, remove: { hasMasking: true },
            replace_bg: { hasMasking: true }, enhance: { hasMasking: false },
            style_transfer: { hasMasking: false },
        };
        if (originalImage && modeConfig[editorMode]?.hasMasking) {
            return currentTool === 'brush' ? 'crosshair' : 'cell';
        }
        return 'default';
    };

    return (
        <div className="p-4 sm:px-8 sm:py-0 h-full">
            <div className="max-w-screen-2xl mx-auto grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-8 h-full">
                <div className="lg:col-span-1 xl:col-span-1">
                    <ControlsPanel
                        onGoHome={onGoHome}
                        onImageUpload={handleImageUpload}
                        onStyleImageUpload={handleStyleImageUpload}
                        styleImageName={styleImage?.file.name ?? null}
                        promptText={promptText}
                        onPromptChange={setPromptText}
                        onImprovePrompt={handleImprovePrompt}
                        isImprovingPrompt={isImprovingPrompt}
                        onGetAiSuggestions={handleGetAiSuggestions}
                        isAnalyzing={isAnalyzing}
                        editSuggestions={editSuggestions}
                        onStyleSelect={setStyleKeywords}
                        brushSize={brushSize}
                        onBrushSizeChange={setBrushSize}
                        onClearMask={handleClearMask}
                        onGenerate={handleGenerate}
                        isLoading={isLoading}
                        error={error}
                        isImageLoaded={!!originalImage}
                        editorMode={editorMode}
                        setEditorMode={setEditorMode}
                        currentTool={currentTool}
                        setCurrentTool={setCurrentTool}
                        maskPrompt={maskPrompt}
                        onMaskPromptChange={setMaskPrompt}
                        onMaskByText={handleMaskByText}
                        isMaskingByText={isMaskingByText}
                        onApplyFilter={handleApplyFilter}
                        showFillButton={showFillButton}
                        onFillExpanded={handleFillExpanded}
                        onDescribeImage={handleDescribeImage}
                        isDescribing={isDescribing}
                        onDownloadImage={handleDownloadImage}
                        onUndo={handleUndo}
                        canUndo={canUndo}
                        onRedo={handleRedo}
                        canRedo={canRedo}
                        onVary={handleVary}
                        canVary={!!lastGenerationParams}
                        onSaveSnapshot={handleSaveSnapshot}
                        onViewSnapshots={() => setIsSnapshotsModalOpen(true)}
                        onToggleResize={handleToggleResizeMode}
                        isResizing={isResizing}
                        onConfirmResize={handleConfirmResize}
                        onCancelResize={handleCancelResize}
                    />
                </div>
                <div className="lg:col-span-3 xl:col-span-4 flex flex-col">
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
                    />
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
        </div>
    );
};

export default EditorPage;