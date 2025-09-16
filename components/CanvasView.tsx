import React, { useState, useRef, useEffect } from 'react';
import { ZoomInIcon, ZoomOutIcon, FitScreenIcon, FillScreenIcon } from './Icon';
import Spinner from './Spinner';

interface ViewControlsProps {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onFitScreen: () => void;
    onFillScreen: () => void;
    onZoomToPercentage: (percentage: number) => void;
    zoomLevel: number;
}

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
}

const CanvasView: React.FC<CanvasViewProps> = (props) => {
    const {
        containerRef, canvasRef, maskCanvasRef,
        originalImage, transform, cursorStyle, isLoading, loadingMessage,
        onMouseDown, onMouseMove, onMouseUp, onMouseLeave, onWheel,
        onTouchStart, onTouchMove, onTouchEnd,
        onZoomIn, onZoomOut, onFitScreen, onFillScreen, onZoomToPercentage
    } = props;

    const showPlaceholder = !originalImage;

    return (
        <div 
            ref={containerRef}
            className="bg-surface-muted rounded-lg shadow-lg aspect-square relative overflow-hidden" 
            onMouseDown={onMouseDown} 
            onMouseMove={onMouseMove} 
            onMouseUp={onMouseUp} 
            onMouseLeave={onMouseLeave} 
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
                    display: originalImage ? 'block' : 'none', 
                    transform: `translate(${transform.offsetX}px, ${transform.offsetY}px) scale(${transform.scale})`, 
                    transformOrigin: 'top left', 
                    touchAction: 'none', 
                    cursor: cursorStyle 
                }}
            />
            <canvas ref={maskCanvasRef} className="hidden" />
            
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
        </div>
    );
};

export default CanvasView;