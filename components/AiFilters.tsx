import React from 'react';

interface AiFiltersProps {
    onApplyFilter: (prompt: string) => void;
}

const filters = [
    { name: 'Cinematic', prompt: 'Apply a cinematic color grade. Enhance shadows, add a slight teal and orange look, and add a widescreen letterbox effect.' },
    { name: 'Vintage', prompt: 'Transform this into a vintage photograph from the 1970s. Add film grain, slight color fading, and a warm, nostalgic tone.' },
    { name: 'Day to Night', prompt: 'Magically transform this daytime photo into a moody night scene. Add a dark blue sky with stars, realistic moonlight, and artificial light sources where appropriate (e.g., windows, streetlights).' },
    { name: 'Dreamy Glow', prompt: 'Add a soft, ethereal, dream-like glow to the image. Make the highlights bloom and soften the overall focus for a magical feel.' },
    { name: 'Charcoal Sketch', prompt: 'Convert this image into a realistic, highly detailed charcoal sketch on textured paper. Capture the forms and shading accurately.' },
    { name: 'Golden Hour', prompt: 'Re-light the image as if it were taken during the golden hour. Add long, soft shadows and a warm, golden light throughout the scene.' },
];


const AiFilters: React.FC<AiFiltersProps> = ({ onApplyFilter }) => {
    return (
        <div>
            <h4 className="text-sm font-medium text-text-tertiary mb-2">AI Filters</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {filters.map(filter => (
                    <button
                        key={filter.name}
                        onClick={() => onApplyFilter(filter.prompt)}
                        className="text-xs font-medium py-2 px-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-brand bg-surface-muted hover:bg-surface-muted-hover text-text-tertiary"
                        title={filter.prompt}
                    >
                        {filter.name}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default AiFilters;