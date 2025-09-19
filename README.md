
# Imaginara - AI-Powered Image Editor

Imaginara is a web-based application that leverages the power of Google's Gemini AI to provide a suite of powerful image creation and editing tools. You can generate images from text prompts, edit existing images with AI, and much more.

## Features

-   **Generate Images from Text**: Create stunning images from your textual descriptions.
-   **AI-Powered Editing**:
    -   **In-painting**: Edit parts of an image by providing a mask and a prompt.
    -   **Image-to-Image Generation**: Generate a new image based on an existing one and a prompt.
    -   **Style Transfer**: Apply the style of one image to another.
    -   **Mask Generation**: Automatically generate a mask for a subject in an image.
-   **AI-Assisted Creativity**:
    -   **Prompt Improvement**: Enhance your prompts for better results.
    -   **Image Description**: Get a detailed description of an image.
    -   **Suggestion Analysis**: Get suggestions on how to edit an image.
    -   **Generate from JSON**: Generate an image from a JSON description.

## Tech Stack

-   **Frontend**: [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
-   **Bundler**: [Vite](https://vitejs.dev/)
-   **AI**: [Google Gemini](https://ai.google.dev/)

## Getting Started

Follow these instructions to get the project up and running on your local machine.

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or later recommended)
-   [npm](https://www.npmjs.com/) (usually comes with Node.js)

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/imaginara.git
    cd imaginara
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Set up your environment variables:**

    -   Create a new file named `.env` in the root of the project.
    -   Add the following line to the `.env` file:

        ```
        API_KEY=your_gemini_api_key
        ```

    -   Replace `your_gemini_api_key` with your actual Google Gemini API key. You can get a free API key from [Google AI Studio](https://ai.google.dev/gemini-api/docs/api-key).

## Available Scripts

In the project directory, you can run the following commands:

-   `npm run dev`: Runs the app in development mode. Open [http://localhost:5173](http://localhost:5173) to view it in the browser.
-   `npm run build`: Builds the app for production to the `dist` folder.
-   `npm run preview`: Runs the production build locally.

## ❗️ Security Warning ❗️

Do **NOT** expose your API key in client-side code in a production environment. This is a major security risk and will allow anyone to use your key. For production apps, it is highly recommended to call your own secure backend server, which then calls the Gemini API. The current setup is for demonstration purposes only.

## Contributing

Contributions are welcome! Please feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License.
