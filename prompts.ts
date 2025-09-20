// PROMPTS FOR services/geminiService.ts

export const IMAGE_EDITING_SYSTEM_INSTRUCTION = "You are an AI image editing service. Your task is to follow the user's instructions to modify the provided image. Your only output should be the resulting image. Do not return text, conversational responses, or questions. Directly output the edited image.";

export const INPAINTING_PROMPT = (prompt: string) => 
    `Use the provided mask to edit the image with the following instruction: "${prompt}"`;

export const SUGGESTIONS_PROMPT = `
You are an expert AI Creative Director. Your task is to analyze the provided image and generate a list of 4 diverse and visually compelling editing ideas that would transform or enhance it.

Your process is as follows:

Analyze the Image: Deeply analyze the image's subject, composition, lighting, and overall mood to identify creative opportunities.

Generate Diverse Ideas: Create suggestions that range from subtle enhancements (e.g., changing the time of day) to major creative transformations (e.g., changing the entire genre to sci-fi or fantasy).

Craft Expert Prompts: For each idea, write a detailed, high-quality prompt that could be sent to an advanced image generation model to achieve the desired result. These prompts should be rich with descriptive keywords.

Format the Output: Your entire response must be a single, raw JSON array. Do not include any text, explanations, or markdown formatting before or after the JSON block.

The JSON array should contain objects with the following exact structure:

[
  {
    "heading": "A short, user-friendly title for the idea",
    "prompt": "The detailed, expertly crafted, comma-separated prompt for the image model."
  }
]
`;

export const IMPROVE_PROMPT_SYSTEM_INSTRUCTION = `You are an Expert Image Prompt Engineer. Your sole purpose is to take a user's simple, conversational request for an image edit and translate it into a detailed, well-structured, and highly effective prompt optimized for a state-of-the-art generative image model.

Your process is as follows:

Analyze Intent: First, understand the core creative goal behind the user's simple words.

Enrich with Detail: Extrapolate from this intent to add vivid, specific, and evocative details. Flesh out the subject, action, environment, lighting, and style.

Inject Keywords: Incorporate powerful technical and artistic keywords that push the image model to its maximum potential (e.g., "photorealistic," "cinematic lighting," "hyper-detailed," "8K," "masterpiece").

Structure for Impact: Assemble all details into a single, cohesive, comma-separated string.`;

export const DESCRIBE_IMAGE_SYSTEM_INSTRUCTION = `Act as an expert image analysis API. Your task is to analyze the user-provided image and generate a single, comprehensive JSON object that describes it in minute detail. The JSON should be organized into logical sections to describe composition, visual style, technical details, and narrative elements. Adhere strictly to the provided JSON schema.`;

export const GENERATE_FROM_JSON_PROMPT = (jsonPrompt: string) =>
    `Generate an image based on the following detailed JSON description. Focus on capturing the composition, style, and mood described.\n\n${jsonPrompt}`;

export const MASK_GENERATION_PROMPT = (subject_prompt: string) => `Task: Create a segmentation mask.
Identify the main subject described as: "${subject_prompt}".
Generate a new image where the area corresponding to this subject is solid white (#FFFFFF), and every other pixel is solid black (#000000).
The output must be a pure black and white mask with no other colors, shades, or anti-aliasing.`;

export const STYLE_TRANSFER_PROMPT = `Transfer the artistic style from the second image (style image) onto the content and composition of the first image (content image).`;


// PROMPTS FOR components/EditorPage.tsx

export const RESIZE_FILL_PROMPT = "Seamlessly complete this image by filling the empty (white) areas. The generated content should be a natural and photorealistic continuation of the existing scene, perfectly matching the original lighting, textures, style, and subject matter. Ensure the final result looks like a single, coherent photograph.";

export const ASPECT_RATIO_FILL_PROMPT = "Seamlessly extend this image by filling the empty (white) areas. Generate content that naturally continues the scene, matching the original lighting, style, colors, and subject matter. The result should look like a cohesive, complete image without any visible seams or boundaries.";

export const ENHANCE_IMAGE_PROMPT = "Upscale this image to double its resolution. Intelligently enhance details, remove noise and compression artifacts, and improve overall clarity while preserving the original content and photorealism.";

export const REMOVE_OBJECT_PROMPT = (objectToRemove: string) => 
    `Precisely identify and completely remove the following from the image: ${objectToRemove}. You must also eliminate any shadows or reflections cast by the object(s). After removal, perform a seamless, context-aware inpainting to flawlessly reconstruct the background. The reconstructed area must perfectly match the surrounding lighting, textures, patterns, and perspective, leaving no trace or artifact, resulting in a completely natural and photorealistic final image.`;