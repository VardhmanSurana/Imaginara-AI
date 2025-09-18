import { GoogleGenAI, Modality, Type } from "@google/genai";
import { 
    INPAINTING_PROMPT,
    SUGGESTIONS_PROMPT,
    IMPROVE_PROMPT_SYSTEM_INSTRUCTION,
    DESCRIBE_IMAGE_SYSTEM_INSTRUCTION,
    GENERATE_FROM_JSON_PROMPT,
    MASK_GENERATION_PROMPT,
    STYLE_TRANSFER_PROMPT
} from '../prompts';
import { Suggestion } from '../types';


// ❗️ DANGER ZONE: SECURITY WARNING ❗️
// Do NOT expose your API key in client-side code.
// This is a major security risk and will allow anyone to use your key.
// For production apps, call your own secure backend server, which then calls the Gemini API.
// We are only doing this for demonstration purposes.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable not set. Please add it to your environment.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateInpaintedImage = async (
    prompt: string,
    imageB64: string,
    maskB64: string
): Promise<string> => {
    try {
        const fullPrompt = INPAINTING_PROMPT(prompt);
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    { inlineData: { data: imageB64, mimeType: 'image/png' } },
                    { inlineData: { data: maskB64, mimeType: 'image/png' } },
                    { text: fullPrompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const imagePart = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);
        if (imagePart && imagePart.inlineData) {
            return imagePart.inlineData.data;
        } else {
            const textResponse = response.text;
            console.error("API did not return an image. Response text:", textResponse);
            throw new Error(`API failed to return an image. It said: "${textResponse || 'No reason provided.'}"`);
        }
    } catch (error) {
        console.error("Error calling Gemini API for in-painting:", error);
        throw new Error("Failed to generate image from AI. Please check the console for more details.");
    }
};

export const generateImageFromImageAndPrompt = async (
    prompt: string,
    imageB64: string
): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    { inlineData: { data: imageB64, mimeType: 'image/png' } },
                    { text: prompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const imagePart = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);
        if (imagePart && imagePart.inlineData) {
            return imagePart.inlineData.data;
        } else {
            const textResponse = response.text;
            console.error("API did not return an image. Response text:", textResponse);
            throw new Error(`API failed to return an image. It said: "${textResponse || 'No reason provided.'}"`);
        }
    } catch (error) {
        console.error("Error calling Gemini API for image-to-image:", error);
        throw new Error("Failed to generate image from AI. Please check the console for more details.");
    }
};

export const analyzeImageForSuggestions = async (imageB64: string): Promise<Suggestion[]> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { data: imageB64, mimeType: 'image/jpeg' } },
                    { text: SUGGESTIONS_PROMPT }
                ]
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            heading: { type: Type.STRING },
                            prompt: { type: Type.STRING }
                        },
                        required: ['heading', 'prompt']
                    }
                }
            }
        });

        const jsonString = response.text.trim();
        const suggestions: Suggestion[] = JSON.parse(jsonString);

        if (Array.isArray(suggestions) && suggestions.every(s => typeof s.heading === 'string' && typeof s.prompt === 'string')) {
            return suggestions;
        } else {
            console.warn("API returned an unexpected format for suggestions.");
            return [];
        }
    } catch (error) {
        console.error("Error analyzing image for suggestions:", error);
        return [];
    }
};

export const improvePrompt = async (currentPrompt: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: currentPrompt,
            config: {
                systemInstruction: IMPROVE_PROMPT_SYSTEM_INSTRUCTION,
            },
        });
        
        return response.text.trim();
    } catch(error) {
        console.error("Error improving prompt:", error);
        throw new Error("Failed to improve prompt with AI. Please check the console.");
    }
};

const imageDescriptionSchema = {
    type: Type.OBJECT, properties: { general_description: { type: Type.STRING }, composition: { type: Type.OBJECT, properties: { subjects: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, keywords: { type: Type.ARRAY, items: { type: Type.STRING } }, }, required: ["name", "description", "keywords"] } }, scene: { type: Type.OBJECT, properties: { setting: { type: Type.STRING }, time_of_day: { type: Type.STRING }, weather_or_atmosphere: { type: Type.STRING }, }, required: ["setting", "time_of_day", "weather_or_atmosphere"] } }, required: ["subjects", "scene"] }, visual_style: { type: Type.OBJECT, properties: { art_style: { type: Type.STRING }, lighting: { type: Type.STRING }, color_palette: { type: Type.STRING }, mood_or_emotion: { type: Type.STRING }, }, required: ["art_style", "lighting", "color_palette", "mood_or_emotion"] }, technical_details: { type: Type.OBJECT, properties: { camera_angle: { type: Type.STRING }, focus: { type: Type.STRING }, textures_and_details: { type: Type.ARRAY, items: { type: Type.STRING } }, }, required: ["camera_angle", "focus", "textures_and_details"] }, narrative_elements: { type: Type.OBJECT, properties: { story: { type: Type.STRING }, symbolism: { type: Type.STRING }, }, required: ["story", "symbolism"] } }, required: ["general_description", "composition", "visual_style", "technical_details", "narrative_elements"]
};

export const describeImage = async (imageB64: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [ { inlineData: { data: imageB64, mimeType: 'image/png' } }, ] },
            config: { systemInstruction: DESCRIBE_IMAGE_SYSTEM_INSTRUCTION, responseMimeType: 'application/json', responseSchema: imageDescriptionSchema as any, }
        });
        return response.text;
    } catch (error) {
        console.error("Error describing image:", error);
        throw new Error("Failed to describe image. Please check the console for details.");
    }
};

export const generateImageFromJsonPrompt = async (prompt: string): Promise<string> => {
    try {
        const fullPrompt = GENERATE_FROM_JSON_PROMPT(prompt);
        return generateImageFromText(fullPrompt);
    } catch (error) {
        console.error("Error generating image from JSON:", error);
        throw new Error("Failed to generate new image from description. Please check the console for details.");
    }
};

export const generateMask = async (imageB64: string, subject_prompt: string): Promise<string> => {
    try {
        const fullPrompt = MASK_GENERATION_PROMPT(subject_prompt);

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts: [ { inlineData: { data: imageB64, mimeType: 'image/png' } }, { text: fullPrompt }, ], },
            config: { responseModalities: [Modality.IMAGE], },
        });

        const imagePart = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);
        if (imagePart && imagePart.inlineData) {
            return imagePart.inlineData.data;
        } else {
            console.error("API did not return a mask image. Response text:", response.text);
            throw new Error(`API failed to return a mask image.`);
        }
    } catch (error) {
        console.error("Error generating mask from AI:", error);
        throw new Error("Failed to generate mask from AI. Check console for details.");
    }
};

export const generateImageFromText = async (prompt: string): Promise<string> => {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/png',
            },
        });
        const image = response.generatedImages?.[0]?.image?.imageBytes;
        if (image) {
            return image;
        } else {
            console.error("API did not return an image for text-to-image.", response);
            throw new Error(`API failed to return an image for text-to-image.`);
        }
    } catch(error) {
        console.error("Error generating image from text:", error);
        throw new Error("Failed to generate new image from text. Check console for details.");
    }
};

export const applyStyleTransfer = async (contentImageB64: string, styleImageB64: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    { inlineData: { data: contentImageB64, mimeType: 'image/png' } },
                    { inlineData: { data: styleImageB64, mimeType: 'image/png' } },
                    { text: STYLE_TRANSFER_PROMPT },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const imagePart = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);
        if (imagePart && imagePart.inlineData) {
            return imagePart.inlineData.data;
        } else {
            const textResponse = response.text;
            console.error("API did not return an image for style transfer. Response text:", textResponse);
            throw new Error(`API failed to return an image for style transfer. It said: "${textResponse || 'No reason provided.'}"`);
        }
    } catch (error) {
        console.error("Error calling Gemini API for style transfer:", error);
        throw new Error("Failed to apply style transfer. Please check the console for more details.");
    }
};