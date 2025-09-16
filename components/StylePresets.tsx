import React, { useState } from 'react';

interface StylePresetsProps {
    onSelect: (styleKeywords: string | null) => void;
}

const presets = [
    { name: 'Photorealistic', keywords: 'photorealistic, 8k, detailed, professional photography, sharp focus' },
    { name: 'Cinematic', keywords: 'cinematic lighting, dramatic, wide-angle lens, moody atmosphere' },
    { name: 'Cartoon', keywords: 'cartoon style, vibrant colors, bold outlines, 2D animation' },
    { name: 'Anime', keywords: 'anime art style, cel shading, dynamic composition' },
    { name: 'Fantasy Art', keywords: 'fantasy art, epic, magical, glowing elements, detailed illustration' },
    { name: 'Sci-Fi', keywords: 'sci-fi, futuristic, cyberpunk, neon lights, high-tech' },
    { name: 'Vintage', keywords: 'vintage photo, sepia tones, film grain, retro aesthetic' },
    { name: 'Watercolor', keywords: 'watercolor painting, soft edges, blended colors, artistic' },
];

const StylePresets: React.FC<StylePresetsProps> = ({ onSelect }) => {
    const [activePreset, setActivePreset] = useState<string | null>(null);

    const handlePresetClick = (preset: { name: string; keywords: string }) => {
        if (activePreset === preset.name) {
            // Deselecting the current preset
            setActivePreset(null);
            onSelect(null);
        } else {
            // Selecting a new preset
            setActivePreset(preset.name);
            onSelect(preset.keywords);
        }
    };

    return (
        <div>
            <h4 className="text-sm font-medium text-text-tertiary mb-2">Style Presets</h4>
            <div className="flex flex-wrap gap-2">
                {presets.map(preset => (
                    <button
                        key={preset.name}
                        onClick={() => handlePresetClick(preset)}
                        className={`text-xs font-medium py-1 px-3 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-brand ${
                            activePreset === preset.name
                                ? 'bg-brand text-brand-text'
                                : 'bg-surface-muted hover:bg-surface-muted-hover text-text-tertiary'
                        }`}
                        title={preset.keywords}
                    >
                        {preset.name}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default StylePresets;