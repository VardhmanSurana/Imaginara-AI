import React, { useState, useRef, useEffect, useCallback } from 'react';
import { generateInpaintedImage, generateImageFromImageAndPrompt, analyzeImageForSuggestions, describeImage, generateImageFromJsonPrompt, generateMask, improvePrompt } from '../services/geminiService';
import { BoundingBox } from '../types';

import ControlsPanel from './ControlsPanel';
import Toolbar, { EditorMode, Tool, modeConfig } from './Toolbar';
import CanvasView from './CanvasView';
import JsonModal from './JsonModal';
import { useImageHistory } from '../hooks/useImageHistory';
import { useCanvasTransform } from '../hooks/useCanvasTransform';


const MAX_CANVAS_DIMENSION = 1024;

const ImageEditor: React.FC = () => {
    // Core State
    const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
    const [promptText, setPromptText] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('AI is creating your image...');
    const [error, setError] = useState<string | null>(null);

    // UI/Tool State
    const [isDrawing, setIsDrawing] = useState<boolean>(false);
    const [brushSize, setBrushSize] = useState<number>(40);
    const [editSuggestions, setEditSuggestions] = useState<string[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const [isImprovingPrompt, setIsImprovingPrompt] = useState<boolean>(false);
    const [currentTool, setCurrentTool] = useState<Tool>('brush');
    const [isSpacePressed, setIsSpacePressed] = useState(false);
    const [isJsonModalOpen, setIsJsonModalOpen] = useState<boolean>(false);
    const [jsonPrompt, setJsonPrompt] = useState<string>('');
    const [isDescribing, setIsDescribing] = useState<boolean>(false);
    const [lastGenerationParams, setLastGenerationParams] = useState<{ prompt: string; imageB64: string; maskB64: string; bbox: BoundingBox } | null>(null);
    const [editorMode, setEditorMode] = useState<EditorMode>('edit');
    const [styleKeywords, setStyleKeywords] = useState<string | null>(null);

    // Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement>(null);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Custom Hooks
    const { transform, resetView, handleZoom, startPan, pan, endPan, isPanning } = useCanvasTransform(originalImage, containerRef);

    const redrawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const maskCanvas = maskCanvasRef.current;
        if (!canvas || !maskCanvas || !originalImage) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);

        if (modeConfig[editorMode].hasMasking) {
            ctx.globalAlpha = 0.5;
            ctx.drawImage(maskCanvas, 0, 0);
            ctx.globalAlpha = 1.0;
        }
    }, [originalImage, editorMode]);

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
            if (!canvas || !maskCanvas) return;

            let { width, height } = img;
            if (width > MAX_CANVAS_DIMENSION || height > MAX_CANVAS_DIMENSION) {
                if (width > height) {
                    height = Math.round(height * (MAX_CANVAS_DIMENSION / width));
                    width = MAX_CANVAS_DIMENSION;
                } else {
                    width = Math.round(width * (MAX_CANVAS_DIMENSION / height));
                    height = MAX_CANVAS_DIMENSION;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            maskCanvas.width = canvas.width;
            maskCanvas.height = canvas.height;
            
            setOriginalImage(img);
            if(callback) callback(img);
        };
        img.src = dataUrl;
    }, []);

    const { handleUndo, handleRedo, updateHistory, resetHistory, canUndo, canRedo } = useImageHistory(loadImageFromDataUrl, handleClearMask);

    useEffect(() => {
        if (originalImage) resetView();
    }, [originalImage, resetView, editorMode]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const resizeObserver = new ResizeObserver(resetView);
        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, [resetView]);

    useEffect(() => {
        if (originalImage) redrawCanvas();
    }, [originalImage, redrawCanvas]);
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !e.repeat) {
                 const target = e.target as HTMLElement;
                 if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    setIsSpacePressed(true);
                 }
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); handleRedo(); }
        };
        const handleKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') setIsSpacePressed(false); };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [handleUndo, handleRedo]);

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target?.result as string;
                loadImageFromDataUrl(dataUrl, () => {
                    resetHistory(dataUrl);
                    setError(null);
                    setPromptText('');
                    setEditSuggestions([]);
                });
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

    const getCanvasPointFromEvent = (e: React.MouseEvent): { x: number; y: number } => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const containerRect = containerRef.current!.getBoundingClientRect();
        return {
            x: (e.clientX - containerRect.left - transform.offsetX) / transform.scale,
            y: (e.clientY - containerRect.top - transform.offsetY) / transform.scale,
        };
    };

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
        if (!originalImage || !modeConfig[editorMode].hasMasking) return;
        e.preventDefault();
        if (isSpacePressed) {
            startPan(e);
            return;
        }
        setIsDrawing(true);
        const pos = getCanvasPointFromEvent(e);
        lastPointRef.current = pos;
        drawOnMask(pos, currentTool);
        redrawCanvas();
    }, [originalImage, isSpacePressed, currentTool, drawOnMask, redrawCanvas, editorMode, startPan]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
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
    }, [isPanning, isDrawing, currentTool, drawOnMask, redrawCanvas, pan]);

    const handleMouseUp = useCallback(() => {
        setIsDrawing(false);
        endPan();
        lastPointRef.current = null;
    }, [endPan]);

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
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }
        if (maxX === -1) return null;

        const MIN_BBOX_SIZE = 20;
        const PADDING = 30;
        if ((maxX - minX) < MIN_BBOX_SIZE && (maxY - minY) < MIN_BBOX_SIZE) return null;

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
            const resultB64 = await generateInpaintedImage(
                lastGenerationParams.prompt, lastGenerationParams.imageB64, lastGenerationParams.maskB64
            );
            processAndStitchResult(resultB64, lastGenerationParams.bbox);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred while creating a variation.');
        } finally { setIsLoading(false); }
    };

    const handleGenerate = async () => {
        if (!originalImage || (modeConfig[editorMode].hasPrompt && !promptText)) {
            setError('Please upload an image and provide a prompt.');
            return;
        }
        setLoadingMessage('AI is creating your image...');
        setIsLoading(true);
        setError(null);
        try {
            let finalPrompt = promptText;
            if (editorMode === 'edit' && styleKeywords) {
                finalPrompt = promptText.trim() ? `${promptText.trim()}, ${styleKeywords}` : styleKeywords;
            }

            if (editorMode === 'edit' || editorMode === 'remove' || editorMode === 'replace_bg') {
                const finalBbox = getBoundingBox() ?? { x: 0, y: 0, width: originalImage.width, height: originalImage.height };

                if (editorMode === 'remove') finalPrompt = "Completely remove the object, person, or element indicated by the mask. Fill the masked area by realistically reconstructing the background that should be behind it.";
                
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = finalBbox.width;
                tempCanvas.height = finalBbox.height;
                tempCanvas.getContext('2d')!.drawImage(originalImage, finalBbox.x, finalBbox.y, finalBbox.width, finalBbox.height, 0, 0, finalBbox.width, finalBbox.height);
                const imageB64 = tempCanvas.toDataURL('image/png').split(',')[1];
                
                const maskBwCanvas = document.createElement('canvas');
                maskBwCanvas.width = finalBbox.width;
                maskBwCanvas.height = finalBbox.height;
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

            } else if (editorMode === 'enhance') {
                finalPrompt = "Upscale this image to double its resolution. Intelligently enhance details, remove noise and compression artifacts, and improve overall clarity while preserving the original content and photorealism.";
                const imageB64 = originalImage.src.split(',')[1];
                const resultB64 = await generateImageFromImageAndPrompt(finalPrompt, imageB64);
                const newBaseImageSrc = `data:image/png;base64,${resultB64}`;
                loadImageFromDataUrl(newBaseImageSrc);
                updateHistory(newBaseImageSrc);
            }

        } catch (err) { setError(err instanceof Error ? err.message : 'An unknown error occurred.'); } 
        finally { setIsLoading(false); }
    };
    
    const handleDescribeImage = async () => {
        if (!canvasRef.current || !originalImage) return;
        setIsDescribing(true);
        setError(null);
        try {
            const imageB64 = canvasRef.current.toDataURL('image/png').split(',')[1];
            const jsonResponse = await describeImage(imageB64);
            const parsedJson = JSON.parse(jsonResponse);
            setJsonPrompt(JSON.stringify(parsedJson, null, 2));
            setIsJsonModalOpen(true);
        } catch (err) { setError(err instanceof Error ? err.message : 'An unknown error occurred while describing the image.'); } 
        finally { setIsDescribing(false); }
    };

    const handleRecreateImage = async () => {
        setIsLoading(true);
        setIsJsonModalOpen(false);
        setError(null);
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
        const link = document.createElement('a');
        link.download = 'edited-image.png';
        link.href = canvasRef.current!.toDataURL('image/png');
        link.click();
    };
    
    const cursorStyle = isSpacePressed ? 'grabbing' : (originalImage && modeConfig[editorMode].hasMasking ? (currentTool === 'brush' ? 'crosshair' : 'cell') : 'default');
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <ControlsPanel
                onImageUpload={handleImageUpload}
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
                modeHasPrompt={modeConfig[editorMode].hasPrompt}
                modeHasMasking={modeConfig[editorMode].hasMasking}
            />

            <div className="lg:col-span-2 flex flex-col gap-2">
                <Toolbar
                    editorMode={editorMode}
                    setEditorMode={setEditorMode}
                    currentTool={currentTool}
                    setCurrentTool={setCurrentTool}
                    handleDescribeImage={handleDescribeImage}
                    handleDownloadImage={handleDownloadImage}
                    handleUndo={handleUndo}
                    handleRedo={handleRedo}
                    handleVary={handleVary}
                    isImageLoaded={!!originalImage}
                    isLoading={isLoading}
                    isDescribing={isDescribing}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    canVary={!!lastGenerationParams}
                />
                <CanvasView
                    containerRef={containerRef}
                    canvasRef={canvasRef}
                    maskCanvasRef={maskCanvasRef}
                    originalImage={originalImage}
                    transform={transform}
                    cursorStyle={cursorStyle}
                    isLoading={isLoading}
                    loadingMessage={loadingMessage}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onZoomIn={() => handleZoom('in')}
                    onZoomOut={() => handleZoom('out')}
                    onResetView={resetView}
                />
            </div>
            <JsonModal
                isOpen={isJsonModalOpen}
                onClose={() => setIsJsonModalOpen(false)}
                jsonPrompt={jsonPrompt}
                onJsonPromptChange={setJsonPrompt}
                onRecreate={handleRecreateImage}
            />
        </div>
    );
};

export default ImageEditor;