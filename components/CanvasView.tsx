import React from 'react';
import { ZoomInIcon, ZoomOutIcon, ResetViewIcon } from './Icon';
import Spinner from './Spinner';

interface ViewControlsProps {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onResetView: () => void;
    zoomLevel: number;
}

const ViewControls: React.FC<ViewControlsProps> = ({ onZoomIn, onZoomOut, onResetView, zoomLevel }) => (
    <div className="absolute bottom-4 left-4 bg-white/50 dark:bg-black/50 p-2 rounded-lg shadow-md backdrop-blur-sm flex flex-col items-stretch gap-2 z-10">
        <div className="flex items-center gap-2" role="toolbar" aria-label="View Controls">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:inline-block pr-2">View:</span>
            <button onClick={onZoomOut} title="Zoom Out" className="p-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md disabled:opacity-50 flex-1"><ZoomOutIcon/></button>
            <button onClick={onResetView} title="Reset View" className="p-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md disabled:opacity-50 flex-1"><ResetViewIcon/></button>
            <button onClick={onZoomIn} title="Zoom In" className="p-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md disabled:opacity-50 flex-1"><ZoomInIcon/></button>
        </div>
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white/70 dark:bg-gray-900/70 px-2 py-1 rounded-md w-full text-center">
            {Math.round(zoomLevel * 100)}%
        </span>
    </div>
);

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
    onZoomIn: () => void;
    onZoomOut: () => void;
    onResetView: () => void;
}

const CanvasView: React.FC<CanvasViewProps> = (props) => {
    const {
        containerRef, canvasRef, maskCanvasRef,
        originalImage, transform, cursorStyle, isLoading, loadingMessage,
        onMouseDown, onMouseMove, onMouseUp, onMouseLeave,
        onZoomIn, onZoomOut, onResetView
    } = props;

    return (
        <div 
            ref={containerRef}
            className="bg-gray-200 dark:bg-dark-surface rounded-lg shadow-lg aspect-square relative overflow-hidden" 
            onMouseDown={onMouseDown} 
            onMouseMove={onMouseMove} 
            onMouseUp={onMouseUp} 
            onMouseLeave={onMouseLeave} 
        >
            {!originalImage && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center text-gray-500 dark:text-dark-text-secondary">
                        <p className="text-lg font-medium">Image preview will appear here</p>
                        <p>Start by uploading an image.</p>
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
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20">
                    <Spinner />
                    <p className="mt-4 text-lg text-gray-300">{loadingMessage}</p>
                </div>
            )}
            
            {originalImage && (
                <ViewControls 
                    onZoomIn={onZoomIn}
                    onZoomOut={onZoomOut}
                    onResetView={onResetView}
                    zoomLevel={transform.scale}
                />
            )}
        </div>
    );
};

export default CanvasView;