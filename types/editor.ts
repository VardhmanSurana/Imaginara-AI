
export type Tool = 'brush' | 'eraser';

export type EditorMode = 'edit' | 'remove' | 'replace_bg' | 'enhance' | 'style_transfer' | 'resize' | 'transform' | 'change_ratio' | 'adjustments';

interface ColorBalanceValue {
    r: number;
    g: number;
    b: number;
}

export interface AdjustmentsState {
    brightness: number;
    contrast: number;
    saturation: number;
    hue: number;
    blur: number;
    sharpen: number;
    colorBalance: {
        shadows: ColorBalanceValue;
        midtones: ColorBalanceValue;
        highlights: ColorBalanceValue;
    };
}

export const defaultAdjustments: AdjustmentsState = {
    brightness: 100, // %
    contrast: 100, // %
    saturation: 100, // %
    hue: 0, // deg
    blur: 0, // px
    sharpen: 0, // %
    colorBalance: {
        shadows: { r: 0, g: 0, b: 0 },
        midtones: { r: 0, g: 0, b: 0 },
        highlights: { r: 0, g: 0, b: 0 },
    },
};
