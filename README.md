# Imaginara

Imaginara is a powerful, web-based image editing application that leverages the capabilities of Google's Gemini AI to provide a seamless and intuitive image manipulation experience. Upload your images, and use AI-powered tools to edit, enhance, and transform them in creative ways.

## Key Features

*   **AI-Powered In-painting:** Draw a mask over any part of your image and use a text prompt to tell the AI what to generate in its place.
*   **Intelligent Object Removal:** Seamlessly remove unwanted objects or blemishes from your photos.
*   **Effortless Background Replacement:** Automatically detect and replace the background of your image with a new scene described by your prompt.
*   **Image Enhancement:** Upscale your images, improve clarity, and remove noise and artifacts with a single click.
*   **Creative Assistance:**
    *   Get AI-powered suggestions for how to edit your image.
    *   Improve your text prompts for better results.
    *   Generate a detailed JSON description of your image that can be used to recreate it from scratch.
*   **Advanced Editor Controls:**
    *   Intuitive brush and eraser tools for precise masking.
    *   Pan and zoom for easy navigation.
    *   Undo/Redo functionality.
    *   Light and Dark mode support.

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

You need to have Node.js and a package manager (npm, yarn, or pnpm) installed on your system.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-repo/imaginara.git
    cd imaginara
    ```

2.  **Install dependencies:**
    Choose your preferred package manager:
    ```bash
    # Using npm
    npm install

    # Using yarn
    yarn install

    # Using pnpm
    pnpm install
    ```

3.  **Set up environment variables:**
    This project requires an API key for Google Gemini. Create a `.env.local` file in the root of the project and add your API key:
    ```
    VITE_GEMINI_API_KEY=YOUR_API_KEY
    ```

4.  **Run the development server:**
    ```bash
    # Using npm
    npm run dev

    # Using yarn
    yarn dev

    # Using pnpm
    pnpm dev
    ```
    Open [http://localhost:5173](http://localhost:5173) (or whatever port is indicated in your terminal) to view it in the browser.

## Project Structure

The project is organized into the following directories:

```
/
├── public/               # Static assets
├── src/
│   ├── components/       # React components
│   ├── hooks/            # Custom React hooks
│   ├── services/         # Services for external APIs
│   ├── App.tsx           # Main application component
│   ├── index.css         # Global styles
│   ├── index.tsx         # Entry point of the application
│   └── types.ts          # TypeScript type definitions
├── .gitignore            # Git ignore file
├── index.html            # HTML template
├── package.json          # Project metadata and dependencies
├── tsconfig.json         # TypeScript configuration
└── vite.config.ts        # Vite configuration
```

**`src/components`**: This directory contains all the React components used in the application. Each component is in its own file.

**`src/hooks`**: This directory contains custom React hooks that encapsulate reusable logic.

**`src/services`**: This directory contains services that interact with external APIs, such as the Google Gemini API.

**`src/types.ts`**: This file contains all the TypeScript type definitions used throughout the project.

## Components

### `App.tsx`

The main component of the application. It sets up the main layout, including the header, footer, and the main content area. It also manages the theme (light/dark mode).

### `ImageEditor.tsx`

This is the core component of the application. It manages the state of the image, the mask, the prompt, and all the user interactions. It integrates all the other components to provide the full image editing experience.

### `CanvasView.tsx`

This component is responsible for rendering the image and the mask on the canvas. It handles user input for drawing on the mask, as well as panning and zooming.

### `ControlsPanel.tsx`

This component renders the main control panel. It includes the image upload button, the prompt input field, brush size slider, and the generate button. It also displays AI suggestions.

### `Toolbar.tsx`

This component renders the toolbar above the canvas. It allows the user to switch between different editor modes (`edit`, `remove`, `replace_bg`, `enhance`), tools (`brush`, `eraser`), and access other actions like undo, redo, download, and describe image.

### `Icon.tsx`

A component to render SVG icons used throughout the application.

### `JsonModal.tsx`

A modal component that displays the JSON representation of the image, as described by the AI. It allows the user to view, edit, and regenerate the image from this JSON data.

### `Spinner.tsx`

A simple spinner component to indicate loading states.

### `StylePresets.tsx`

This component provides a set of preset style keywords that can be appended to the user's prompt to achieve a certain artistic style.

## Custom Hooks

### `useCanvasTransform.ts`

This hook manages the state and logic for canvas transformations, including panning and zooming. It returns the current transform state and functions to handle user input for transforming the canvas.

### `useImageHistory.ts`

This hook manages the undo/redo history of the image. It keeps track of the different states of the image as it's being edited and provides functions to move back and forth in the history.

## Services

### `geminiService.ts`

This service is responsible for all communication with the Google Gemini API. It abstracts the API calls for the different AI-powered features, such as:

*   Generating in-painted images
*   Analyzing an image for edit suggestions
*   Improving a text prompt
*   Describing an image in JSON format
*   Generating an image from a JSON prompt

## Built With

*   [React](https://reactjs.org/) - The web framework used.
*   [Vite](https://vitejs.dev/) - The build tool.
*   [TypeScript](https://www.typescriptlang.org/) - The language.
*   [Google Gemini](https://ai.google.dev/) - The AI model.
*   [Tailwind CSS](https://tailwindcss.com/) - The CSS framework.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
