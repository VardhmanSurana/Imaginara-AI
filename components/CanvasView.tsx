import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomInIcon, ZoomOutIcon, FitScreenIcon, FillScreenIcon } from './Icon';
import Spinner from './Spinner';
import { BoundingBox } from '../types';
import AspectRatioDock from './AspectRatioDock';

type EditorMode = 'edit' | 'remove' | 'replace_bg' | 'enhance' | 'style_transfer' | 'resize' | 'transform' | 'change_ratio';
type Tool = 'brush' | 'eraser';

interface ViewControlsProps {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onFitScreen: () => void;
    onFillScreen: () => void;
    onZoomToPercentage: (percentage: number) => void;
    zoomLevel: number;
}

const handleToCursorMap: { [key: string]: string } = {
    topLeft: 'nwse-resize', top: 'ns-resize', topRight: 'nesw-resize',
    left: 'ew-resize', right: 'ew-resize',
    bottomLeft: 'nesw-resize', bottom: 'ns-resize', bottomRight: 'nwse-resize',
};

const getHandles = (box: BoundingBox) => {
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
};


const ViewControls: React.FC<ViewControlsProps> = ({ onZoomIn, onZoomOut, onFitScreen, onFillScreen, onZoomToPercentage, zoomLevel }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const zoomPresets = [25, 50, 100, 200, 400];

    return (
        <div className="absolute bottom-4 left-4 bg-surface-translucent p-1 rounded-lg shadow-md backdrop-blur-sm flex items-center gap-1 z-10" role="toolbar" aria-label="View Controls">
            <button onClick={onZoomOut} title="Zoom Out" className="p-2 hover:bg-surface-muted/50 text-text-tertiary rounded-md"><ZoomOutIcon/></button>
            
            <div className="relative" ref={dropdownRef}>
                <button onClick={() => setIsDropdownOpen(prev => !prev)} className="text-sm font-semibold text-text-tertiary bg-surface/70 hover:bg-surface-muted/50 px-3 py-2 rounded-md w-24 text-center">
                    {Math.round(zoomLevel * 100)}%
                </button>
                {isDropdownOpen && (
                    <div className="absolute bottom-full mb-2 w-48 bg-surface rounded-md shadow-lg border border-border-base p-2">
                        <button onClick={() => { onFitScreen(); setIsDropdownOpen(false); }} className="w-full text-left px-3 py-2 rounded-md hover:bg-surface-muted text-text-primary flex items-center gap-2">
                           <FitScreenIcon /> Fit to Screen
                        </button>
                        <button onClick={() => { onFillScreen(); setIsDropdownOpen(false); }} className="w-full text-left px-3 py-2 rounded-md hover:bg-surface-muted text-text-primary flex items-center gap-2">
                           <FillScreenIcon /> Fill Screen
                        </button>
                        <div className="my-1 border-t border-border-base"></div>
                        {zoomPresets.map(p => (
                            <button key={p} onClick={() => { onZoomToPercentage(p); setIsDropdownOpen(false); }} className="w-full text-left px-3 py-2 rounded-md hover:bg-surface-muted text-text-primary">
                                Zoom to {p}%
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <button onClick={onZoomIn} title="Zoom In" className="p-2 hover:bg-surface-muted/50 text-text-tertiary rounded-md"><ZoomInIcon/></button>
        </div>
    );
};


interface CanvasViewProps {
    containerRef: React.RefObject<HTMLDivElement>;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    maskCanvasRef: React.RefObject<HTMLCanvasElement>;
    originalImage: HTMLImageElement | null;
    transform: { scale: number; offsetX: number; offsetY: number; };
    cursorStyle: string;
    isLoading: boolean;
    loadingMessage: string;
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseUp: (e: React.MouseEvent) => void;
    onMouseLeave: (e: React.MouseEvent) => void;
    onWheel: (e: React.WheelEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onFitScreen: () => void;
    onFillScreen: () => void;
    onZoomToPercentage: (percentage: number) => void;
    editorMode: EditorMode;
    resizeBox: BoundingBox | null;
    aspectRatioBox: BoundingBox | null;
    rotation: number;
    skewX: number;
    skewY: number;
    brushSize: number;
    currentTool: Tool;
    // Aspect Ratio Dock props
    onSelectAspectRatio: (ratio: { name: string, width: number, height: number } | null) => void;
    selectedAspectRatio: string | null;
    onApplyAspectRatioCanvas: () => void;
    onCancelAspectRatio: () => void;
    onFreeSize: () => void;
}

const CanvasView: React.FC<CanvasViewProps> = (props) => {
    const {
        containerRef, canvasRef, maskCanvasRef,
        originalImage, transform, cursorStyle, isLoading, loadingMessage,
        onMouseDown, onMouseMove, onMouseUp, onMouseLeave, onWheel,
        onTouchStart, onTouchMove, onTouchEnd,
        onZoomIn, onZoomOut, onFitScreen, onFillScreen, onZoomToPercentage,
        editorMode, resizeBox, aspectRatioBox, rotation, skewX, skewY,
        brushSize, currentTool,
        onSelectAspectRatio, selectedAspectRatio,
        onApplyAspectRatioCanvas, onCancelAspectRatio, onFreeSize
    } = props;

    const [brushPreview, setBrushPreview] = useState<{ x: number, y: number, visible: boolean } | null>(null);

    const showPlaceholder = !originalImage;
    const isMaskingMode = ['edit', 'remove', 'replace_bg'].includes(editorMode);

    const handleLocalMouseMove = (e: React.MouseEvent) => {
        if (isMaskingMode) {
            const rect = containerRef.current!.getBoundingClientRect();
            setBrushPreview({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                visible: true,
            });
        }
        onMouseMove(e);
    };
    
    const handleLocalMouseLeave = (e: React.MouseEvent) => {
        if (isMaskingMode) {
            setBrushPreview(prev => prev ? { ...prev, visible: false } : { x: 0, y: 0, visible: false });
        }
        onMouseLeave(e);
    };

    return (
        <div 
            ref={containerRef}
            className={`bg-surface-muted rounded-lg shadow-lg relative ${editorMode === 'resize' ? '' : 'overflow-hidden'} w-full h-full`}
            onMouseDown={onMouseDown} 
            onMouseMove={handleLocalMouseMove} 
            onMouseUp={onMouseUp} 
            onMouseLeave={handleLocalMouseLeave} 
            onWheel={onWheel}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            {showPlaceholder && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center text-text-secondary">
                        <p className="text-lg font-medium">Your image will appear here</p>
                        <p>Start by uploading an image on the editor sidebar.</p>
                    </div>
                </div>
            )}
            <canvas 
                ref={canvasRef}
                style={{ 
                    position: 'absolute',
                    display: originalImage ? 'block' : 'none', 
                    transform: `translate(${transform.offsetX}px, ${transform.offsetY}px) scale(${transform.scale}) rotate(${rotation}deg) skew(${skewX}deg, ${skewY}deg)`, 
                    transformOrigin: 'top left', 
                    touchAction: 'none', 
                    cursor: cursorStyle 
                }}
            />
            <canvas ref={maskCanvasRef} className="hidden" />

            {brushPreview?.visible && isMaskingMode && (
                <div
                    className="absolute pointer-events-none rounded-full"
                    style={{
                        left: brushPreview.x,
                        top: brushPreview.y,
                        width: `${brushSize * transform.scale}px`,
                        height: `${brushSize * transform.scale}px`,
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: currentTool === 'brush' ? 'rgba(139, 92, 246, 0.4)' : 'rgba(255, 255, 255, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.8)',
                    }}
                />
            )}

            {editorMode === 'change_ratio' && aspectRatioBox && (
                 <div
                    style={{
                        position: 'absolute',
                        left: `${transform.offsetX + aspectRatioBox.x * transform.scale}px`,
                        top: `${transform.offsetY + aspectRatioBox.y * transform.scale}px`,
                        width: `${aspectRatioBox.width * transform.scale}px`,
                        height: `${aspectRatioBox.height * transform.scale}px`,
                        boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
                        outline: '2px dashed rgba(255, 255, 255, 0.7)',
                        cursor: cursorStyle,
                        pointerEvents: 'none', // Box itself doesn't capture events
                    }}
                 >
                    {Object.entries(getHandles(aspectRatioBox)).map(([name, pos]) => {
                        const handleSize = 10;
                        return (
                            <div
                                key={name}
                                style={{
                                    position: 'absolute',
                                    left: `${(pos.x - aspectRatioBox.x) * transform.scale - handleSize / 2}px`,
                                    top: `${(pos.y - aspectRatioBox.y) * transform.scale - handleSize / 2}px`,
                                    width: `${handleSize}px`,
                                    height: `${handleSize}px`,
                                    backgroundColor: 'rgba(255, 255, 255, 1)',
                                    border: '1px solid rgba(0, 0, 0, 0.5)',
                                    cursor: handleToCursorMap[name],
                                    pointerEvents: 'auto',
                                }}
                            />
                        );
                    })}
                 </div>
            )}

            {editorMode === 'resize' && resizeBox && (
                <div
                    style={{
                        position: 'absolute',
                        left: `${transform.offsetX + resizeBox.x * transform.scale}px`,
                        top: `${transform.offsetY + resizeBox.y * transform.scale}px`,
                        width: `${resizeBox.width * transform.scale}px`,
                        height: `${resizeBox.height * transform.scale}px`,
                        outline: `2px dashed rgba(0, 150, 255, 0.8)`,
                        outlineOffset: '-2px',
                        pointerEvents: 'none',
                        boxSizing: 'border-box',
                    }}
                >
                    {Object.entries(getHandles(resizeBox)).map(([name, pos]) => {
                        const handleSize = 10;
                        return (
                            <div
                                key={name}
                                style={{
                                    position: 'absolute',
                                    left: `${(pos.x - resizeBox.x) * transform.scale - handleSize / 2}px`,
                                    top: `${(pos.y - aspectRatioBox.y) * transform.scale - handleSize / 2}px`,
                                    width: `${handleSize}px`,
                                    height: `${handleSize}px`,
                                    backgroundColor: 'rgba(0, 150, 255, 1)',
                                    border: '1px solid white',
                                    cursor: handleToCursorMap[name],
                                    pointerEvents: 'auto',
                                }}
                            />
                        );
                    })}
                </div>
            )}
            
            {isLoading && (
                <div className="absolute inset-0 bg-overlay flex flex-col items-center justify-center z-20">
                    <Spinner />
                    <p className="mt-4 text-lg text-gray-300">{loadingMessage}</p>
                </div>
            )}
            
            {originalImage && (
                <ViewControls 
                    onZoomIn={onZoomIn}
                    onZoomOut={onZoomOut}
                    onFitScreen={onFitScreen}
                    onFillScreen={onFillScreen}
                    onZoomToPercentage={onZoomToPercentage}
                    zoomLevel={transform.scale}
                />
            )}

            {editorMode === 'change_ratio' && originalImage && (
                <AspectRatioDock
                    onSelectAspectRatio={onSelectAspectRatio}
                    selectedAspectRatio={selectedAspectRatio}
                    onApply={onApplyAspectRatioCanvas}
                    onCancel={onCancelAspectRatio}
                    onFreeSize={onFreeSize}
                />
            )}
        </div>
    );
};

export default CanvasView;
