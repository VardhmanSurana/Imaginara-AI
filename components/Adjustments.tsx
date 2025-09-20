
import React, { useState } from 'react';
import { AdjustmentsState } from '../types/editor';
import { RefreshIcon } from './Icon';

interface AdjustmentSliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (value: number) => void;
    onReset: () => void;
    unit?: string;
}

const AdjustmentSlider: React.FC<AdjustmentSliderProps> = ({ label, value, min, max, step = 1, onChange, onReset, unit = '' }) => {
    return (
        <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-xs text-text-tertiary">
                <label htmlFor={`slider-${label}`} className="font-medium">{label}</label>
                <div className="flex items-center gap-2">
                    <span>{value.toFixed(label === 'Blur' ? 1 : 0)}{unit}</span>
                    <button onClick={onReset} title={`Reset ${label}`} className="text-text-secondary hover:text-text-primary">
                        <RefreshIcon className="h-3 w-3" />
                    </button>
                </div>
            </div>
            <input
                id={`slider-${label}`}
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full h-2 bg-surface-muted rounded-lg appearance-none cursor-pointer"
            />
        </div>
    );
};

interface ColorBalanceEditorProps {
    colorBalance: AdjustmentsState['colorBalance'];
    onColorBalanceChange: (tone: 'shadows' | 'midtones' | 'highlights', channel: 'r' | 'g' | 'b', value: number) => void;
    onReset: () => void;
}

const ColorBalanceEditor: React.FC<ColorBalanceEditorProps> = ({ colorBalance, onColorBalanceChange, onReset }) => {
    const [activeTone, setActiveTone] = useState<'shadows' | 'midtones' | 'highlights'>('midtones');

    const handleColorChange = (channel: 'r' | 'g' | 'b', value: number) => {
        onColorBalanceChange(activeTone, channel, value);
    };
    
    const sliderClass = (channel: 'r' | 'g' | 'b') => {
        switch(channel) {
            case 'r': return 'accent-red-500';
            case 'g': return 'accent-green-500';
            case 'b': return 'accent-blue-500';
        }
    }

    return (
        <div className="p-3 bg-bg rounded-lg">
             <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-text-tertiary">Color Balance</h4>
                <button onClick={onReset} title="Reset Color Balance" className="text-text-secondary hover:text-text-primary">
                    <RefreshIcon className="h-4 w-4" />
                </button>
            </div>
            <div className="flex justify-center gap-1 bg-surface-secondary p-1 rounded-md mb-3">
                {(['shadows', 'midtones', 'highlights'] as const).map(tone => (
                    <button
                        key={tone}
                        onClick={() => setActiveTone(tone)}
                        className={`capitalize text-xs font-semibold px-2 py-1 rounded-md transition-colors w-full ${activeTone === tone ? 'bg-brand text-brand-text' : 'hover:bg-surface-muted'}`}
                    >
                        {tone}
                    </button>
                ))}
            </div>
            <div className="space-y-2">
                {(['r', 'g', 'b'] as const).map(channel => (
                    <div key={channel} className="flex items-center gap-2">
                        <span className={`text-sm font-bold w-4 text-center ${sliderClass(channel).replace('accent', 'text')}`}>{channel.toUpperCase()}</span>
                        <input
                            type="range"
                            min="-100"
                            max="100"
                            value={colorBalance[activeTone][channel]}
                            onChange={(e) => handleColorChange(channel, Number(e.target.value))}
                            className={`w-full h-2 bg-surface-muted rounded-lg appearance-none cursor-pointer ${sliderClass(channel)}`}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};


interface AdjustmentsProps {
    adjustments: AdjustmentsState;
    onAdjustmentChange: (key: keyof Omit<AdjustmentsState, 'colorBalance'>, value: number) => void;
    onColorBalanceChange: (tone: 'shadows' | 'midtones' | 'highlights', channel: 'r' | 'g' | 'b', value: number) => void;
    onApply: () => void;
    onReset: () => void;
}

const Adjustments: React.FC<AdjustmentsProps> = ({ adjustments, onAdjustmentChange, onColorBalanceChange, onApply, onReset }) => {

    const resetColorBalance = () => {
        ['shadows', 'midtones', 'highlights'].forEach(tone => {
            ['r', 'g', 'b'].forEach(channel => {
                onColorBalanceChange(tone as any, channel as any, 0);
            })
        })
    }
    
    return (
        <div className="p-3 bg-brand-subtle-bg rounded-lg flex flex-col gap-4">
            <h4 className="text-sm font-bold text-brand-subtle-text">Adjust Image</h4>

            <AdjustmentSlider label="Brightness" value={adjustments.brightness} min={0} max={200} onChange={(v) => onAdjustmentChange('brightness', v)} onReset={() => onAdjustmentChange('brightness', 100)} unit="%" />
            <AdjustmentSlider label="Contrast" value={adjustments.contrast} min={0} max={200} onChange={(v) => onAdjustmentChange('contrast', v)} onReset={() => onAdjustmentChange('contrast', 100)} unit="%" />
            <AdjustmentSlider label="Saturation" value={adjustments.saturation} min={0} max={200} onChange={(v) => onAdjustmentChange('saturation', v)} onReset={() => onAdjustmentChange('saturation', 100)} unit="%" />
            <AdjustmentSlider label="Hue" value={adjustments.hue} min={-180} max={180} onChange={(v) => onAdjustmentChange('hue', v)} onReset={() => onAdjustmentChange('hue', 0)} unit="°" />
            <AdjustmentSlider label="Blur" value={adjustments.blur} min={0} max={20} step={0.1} onChange={(v) => onAdjustmentChange('blur', v)} onReset={() => onAdjustmentChange('blur', 0)} unit="px" />
            <AdjustmentSlider label="Sharpen" value={adjustments.sharpen} min={0} max={100} onChange={(v) => onAdjustmentChange('sharpen', v)} onReset={() => onAdjustmentChange('sharpen', 0)} unit="%" />
            
            <ColorBalanceEditor colorBalance={adjustments.colorBalance} onColorBalanceChange={onColorBalanceChange} onReset={resetColorBalance} />

            <div className="flex items-center gap-2 pt-2 border-t border-brand-subtle-text/20">
                <button onClick={onReset} className="flex-1 bg-surface-muted hover:bg-surface-muted-hover text-text-primary font-bold py-2 px-4 rounded-md text-sm">Reset All</button>
                <button onClick={onApply} className="flex-1 bg-brand hover:bg-brand-hover text-brand-text font-bold py-2 px-4 rounded-md text-sm">Apply</button>
            </div>
        </div>
    );
};

export default Adjustments;
