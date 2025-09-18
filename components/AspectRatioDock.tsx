import React, { useState, useEffect } from 'react';

const ASPECT_RATIOS = [
    { name: "Square", ratio: "1:1", width: 1, height: 1 },
    { name: "Portrait", ratio: "2:3", width: 2, height: 3 },
    { name: "Standard", ratio: "4:3", width: 4, height: 3 },
    { name: "Photography", ratio: "3:2", width: 3, height: 2 },
    { name: "Widescreen", ratio: "16:9", width: 16, height: 9 },
    { name: "Vertical", ratio: "9:16", width: 9, height: 16 },
];

interface AspectRatioDockProps {
    onSelectAspectRatio: (ratio: { name: string, width: number, height: number } | null) => void;
    selectedAspectRatio: string | null;
    onApply: () => void;
    onCancel: () => void;
    onFreeSize: () => void;
}

const AspectRatioDock: React.FC<AspectRatioDockProps> = ({ 
    onSelectAspectRatio, 
    selectedAspectRatio, 
    onApply, 
    onCancel, 
    onFreeSize,
}) => {
    const [customRatioInput, setCustomRatioInput] = useState('');

    useEffect(() => {
        if (selectedAspectRatio) {
            if (selectedAspectRatio.startsWith('Custom: ')) {
                setCustomRatioInput(selectedAspectRatio.replace('Custom: ', ''));
            } else {
                setCustomRatioInput('');
            }
        } else {
            setCustomRatioInput('');
        }
    }, [selectedAspectRatio]);

    const applyCustomRatio = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) {
            onSelectAspectRatio(null);
            return;
        }

        let parsedRatio: number | null = null;
        if (trimmed.includes(':')) {
            const parts = trimmed.split(':').map(Number);
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] > 0 && parts[1] > 0) {
                parsedRatio = parts[0] / parts[1];
            }
        } else {
            const num = Number(trimmed);
            if (!isNaN(num) && num > 0) {
                parsedRatio = num;
            }
        }

        if (parsedRatio !== null) {
            onSelectAspectRatio({ name: `Custom: ${trimmed}`, width: parsedRatio, height: 1 });
        }
    };
    
    const handleCustomRatioKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            applyCustomRatio(e.currentTarget.value);
            e.currentTarget.blur();
        }
    };
    
    const handleCustomRatioBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        applyCustomRatio(e.currentTarget.value);
    };

    const handlePresetClick = (ratio: { name: string, width: number, height: number }) => {
        setCustomRatioInput('');
        onSelectAspectRatio(ratio);
    };

    const getPreviewSize = (width: number, height: number) => {
        const MAX_SIZE = 28; // in pixels
        if (width > height) {
            return { width: MAX_SIZE, height: MAX_SIZE * (height / width) };
        }
        return { width: MAX_SIZE * (width / height), height: MAX_SIZE };
    };

    return (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-surface-translucent p-3 rounded-lg shadow-xl backdrop-blur-sm flex flex-col items-center gap-3 z-20 w-auto max-w-lg animate-fade-in-up">
            <div className="flex flex-wrap justify-center items-center gap-3">
                {ASPECT_RATIOS.map((ratio) => {
                    const previewSize = getPreviewSize(ratio.width, ratio.height);
                    return (
                        <button
                            key={ratio.name}
                            onClick={() => handlePresetClick(ratio)}
                            title={ratio.name}
                            className={`p-2 rounded-md transition-colors flex items-center justify-center h-12 w-12 ${selectedAspectRatio === ratio.name ? 'bg-brand' : 'bg-surface-muted/60 hover:bg-surface-muted'}`}
                        >
                            <div style={{
                                width: `${previewSize.width}px`,
                                height: `${previewSize.height}px`
                            }} className={`border-2 ${selectedAspectRatio === ratio.name ? 'border-brand-text' : 'border-text-tertiary'}`} />
                        </button>
                    )
                })}
            </div>

            <div className="w-full px-2">
                <label htmlFor="custom-ratio-input" className="text-xs text-text-tertiary mb-1 block text-center">Custom Ratio</label>
                <input
                    id="custom-ratio-input"
                    type="text"
                    placeholder="e.g., 5:4 or 1.25"
                    value={customRatioInput}
                    onChange={(e) => setCustomRatioInput(e.target.value)}
                    onKeyDown={handleCustomRatioKeyDown}
                    onBlur={handleCustomRatioBlur}
                    className="w-full bg-surface/80 border border-border-muted rounded-md p-2 text-sm text-center text-text-primary focus:ring-2 focus:ring-brand focus:border-brand"
                />
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-border-muted/50 w-full justify-center">
                <button onClick={onFreeSize} className="flex-1 bg-surface-muted hover:bg-surface-muted-hover text-text-primary font-bold py-2 px-4 rounded-md text-sm max-w-[120px]">Free Size</button>
                <button onClick={onCancel} className="flex-1 bg-surface-muted hover:bg-surface-muted-hover text-text-primary font-bold py-2 px-4 rounded-md text-sm max-w-[120px]">Cancel</button>
                <button onClick={onApply} disabled={!selectedAspectRatio} className="flex-1 bg-brand hover:bg-brand-hover text-brand-text font-bold py-2 px-4 rounded-md text-sm disabled:opacity-50 max-w-[120px]">Apply</button>
            </div>
        </div>
    );
};

export default AspectRatioDock;