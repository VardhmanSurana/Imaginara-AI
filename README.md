
# Imaginara - AI-Powered Image Creation & Editing

Imaginara is a web-based application that leverages the power of AI to create and edit images. Whether you want to generate a new image from a text prompt or upload your own to start editing, Imaginara provides a suite of powerful AI tools to bring your creative vision to life.

## About The Project

This project was built to showcase the capabilities of the Gemini API for advanced image manipulation and generation. It provides a user-friendly interface for tasks like inpainting, style transfer, and AI-driven image analysis.

## Features

- **Generate Images from Text**: Create new images from a descriptive text prompt.
- **Upload and Edit**: Upload your own images to start editing.
- **AI-Powered Editing**:
  - **Inpainting**: Remove or replace objects in your image.
  - **Enhance Image**: Improve the quality and resolution of your images.
  - **Style Transfer**: Apply the artistic style of one image to another.
  - **AI Suggestions**: Get AI-powered suggestions for edits.
- **Image Manipulation**:
  - **Resize and Crop**: Change the dimensions and aspect ratio of your images.
  - **Transform**: Rotate and skew your images.
  - **Adjustments**: Fine-tune color, brightness, contrast, and more.
- **Describe and Recreate**: Generate a detailed JSON description of an image and use it to recreate it.
- **Snapshots**: Save and load different versions of your work.

## Getting Started

To get a local copy up and running follow these simple steps.

### Prerequisites

- Node.js
- npm

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/VardhmanSurana/Imaginara-AI.git
   ```
2. Install NPM packages
   ```sh
   npm install
   ```
3. Set the `GEMINI_API_KEY` in `.env.local` to your Gemini API key.
4. Run the app:
   ```sh
   npm run dev
   ```

## Built With

* [React](https://reactjs.org/)
* [TypeScript](https://www.typescriptlang.org/)
* [Tailwind CSS](https://tailwindcss.com/)
* [Vite](https://vitejs.dev/)
* [Gemini API](https://ai.google.dev/docs)
