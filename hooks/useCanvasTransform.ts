import React, { useState, useCallback, RefObject } from 'react';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
const ZOOM_STEP = 1.2;

export const useCanvasTransform = (
    originalImage: HTMLImageElement | null,
    containerRef: RefObject<HTMLDivElement>
) => {
    const [transform, setTransform] = useState({ scale: 1, offsetX: 0, offsetY: 0 });
    const [isPanning, setIsPanning] = useState<boolean>(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });

    const zoomToPoint = useCallback((newScale: number, pointX: number, pointY: number) => {
        if (!containerRef.current) return;
        const clampedScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));
        
        // The point on the image that is under the cursor
        const imagePointX = (pointX - transform.offsetX) / transform.scale;
        const imagePointY = (pointY - transform.offsetY) / transform.scale;
        
        // The new offset that keeps the image point under the cursor
        const newOffsetX = pointX - imagePointX * clampedScale;
        const newOffsetY = pointY - imagePointY * clampedScale;

        setTransform({ scale: clampedScale, offsetX: newOffsetX, offsetY: newOffsetY });
    }, [transform, containerRef]);

    const handleZoom = useCallback((direction: 'in' | 'out') => {
        if (!containerRef.current || !originalImage) return;
        const { clientWidth, clientHeight } = containerRef.current;
        const factor = direction === 'in' ? ZOOM_STEP : 1 / ZOOM_STEP;
        zoomToPoint(transform.scale * factor, clientWidth / 2, clientHeight / 2);
    }, [containerRef, originalImage, transform.scale, zoomToPoint]);

    const zoomToPercentage = useCallback((percentage: number) => {
        if (!containerRef.current || !originalImage) return;
        const { clientWidth, clientHeight } = containerRef.current;
        zoomToPoint(percentage / 100, clientWidth / 2, clientHeight / 2);
    }, [containerRef, originalImage, zoomToPoint]);

    const fitScreenView = useCallback(() => {
        if (!originalImage || !containerRef.current) return;
        const { clientWidth: containerWidth, clientHeight: containerHeight } = containerRef.current;
        const { width: imgWidth, height: imgHeight } = originalImage;
        const scale = Math.min(containerWidth / imgWidth, containerHeight / imgHeight);
        setTransform({
            scale,
            offsetX: (containerWidth - imgWidth * scale) / 2,
            offsetY: (containerHeight - imgHeight * scale) / 2
        });
    }, [originalImage, containerRef]);

    const fillScreenView = useCallback(() => {
        if (!originalImage || !containerRef.current) return;
        const { clientWidth: containerWidth, clientHeight: containerHeight } = containerRef.current;
        const { width: imgWidth, height: imgHeight } = originalImage;
        const scale = Math.max(containerWidth / imgWidth, containerHeight / imgHeight);
        setTransform({
            scale,
            offsetX: (containerWidth - imgWidth * scale) / 2,
            offsetY: (containerHeight - imgHeight * scale) / 2
        });
    }, [originalImage, containerRef]);
    
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

    const handleWheelZoom = useCallback((e: React.WheelEvent) => {
        if (!containerRef.current) return;
        e.preventDefault();
        
        const rect = containerRef.current.getBoundingClientRect();
        const pointX = e.clientX - rect.left;
        const pointY = e.clientY - rect.top;

        const direction = e.deltaY < 0 ? 'in' : 'out';
        const factor = direction === 'in' ? ZOOM_STEP : 1 / ZOOM_STEP;
        const newScale = transform.scale * factor;

        zoomToPoint(newScale, pointX, pointY);
    }, [containerRef, transform.scale, zoomToPoint]);

    return {
        transform,
        isPanning,
        fitScreenView,
        fillScreenView,
        handleZoom,
        zoomToPercentage,
        startPan,
        pan,
        endPan,
        handleWheelZoom,
    };
};
