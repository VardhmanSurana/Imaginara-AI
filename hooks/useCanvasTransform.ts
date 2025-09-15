import React, { useState, useCallback, RefObject } from 'react';

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 8;

export const useCanvasTransform = (
    originalImage: HTMLImageElement | null,
    containerRef: RefObject<HTMLDivElement>
) => {
    const [transform, setTransform] = useState({ scale: 1, offsetX: 0, offsetY: 0 });
    const [isPanning, setIsPanning] = useState<boolean>(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });

    const resetView = useCallback(() => {
        if (!originalImage || !containerRef.current) return;
        const container = containerRef.current;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        const imgWidth = originalImage.width;
        const imgHeight = originalImage.height;
        
        const scale = Math.min(containerWidth / imgWidth, containerHeight / imgHeight, 1);
        
        setTransform({
            scale,
            offsetX: (containerWidth - imgWidth * scale) / 2,
            offsetY: (containerHeight - imgHeight * scale) / 2
        });
    }, [originalImage, containerRef]);

    const handleZoom = (direction: 'in' | 'out') => {
        if (!containerRef.current || !originalImage) return;
        const { clientWidth, clientHeight } = containerRef.current;
        const centerX = clientWidth / 2;
        const centerY = clientHeight / 2;
        const imageCenterX = (centerX - transform.offsetX) / transform.scale;
        const imageCenterY = (centerY - transform.offsetY) / transform.scale;
        const factor = direction === 'in' ? 1.2 : 1 / 1.2;
        const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, transform.scale * factor));
        const newOffsetX = centerX - imageCenterX * newScale;
        const newOffsetY = centerY - imageCenterY * newScale;
        setTransform({ scale: newScale, offsetX: newOffsetX, offsetY: newOffsetY });
    };
    
    const startPan = (e: React.MouseEvent) => {
        setIsPanning(true);
        setPanStart({ x: e.clientX - transform.offsetX, y: e.clientY - transform.offsetY });
    };
    
    const pan = (e: React.MouseEvent) => {
        if (isPanning) {
            setTransform(prev => ({ ...prev, offsetX: e.clientX - panStart.x, offsetY: e.clientY - panStart.y }));
        }
    };
    
    const endPan = () => {
        setIsPanning(false);
    };

    return {
        transform,
        isPanning,
        resetView,
        handleZoom,
        startPan,
        pan,
        endPan
    };
};