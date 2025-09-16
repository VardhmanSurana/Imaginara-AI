import React, { useState, useRef } from 'react';
// FIX: Imported SparklesIcon
import { CreateIcon, UploadIcon, SparklesIcon } from './Icon';
import Spinner from './Spinner';

interface LandingPageProps {
    onStartWithCreate: (prompt: string) => void;
    onStartWithUpload: (file: File) => void;
    isLoading: boolean;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStartWithCreate, onStartWithUpload, isLoading }) => {
    const [prompt, setPrompt] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            onStartWithUpload(event.target.files[0]);
        }
    };

    const handleCreateClick = () => {
        if (prompt.trim()) {
            onStartWithCreate(prompt.trim());
        }
    };
    
    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="landing-container h-full flex flex-col items-center justify-start sm:justify-center p-4 gap-4 sm:gap-8">
            <div className="landing-card w-full max-w-lg p-6 sm:p-8 bg-surface rounded-xl shadow-lg border border-border-base">
                <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-brand-subtle-bg rounded-lg">
                        <CreateIcon className="h-8 w-8 text-brand-subtle-text" />
                    </div>
                    <h2 className="text-2xl font-bold text-text-primary">Create New Image</h2>
                </div>
                <p className="mb-4 text-text-secondary">Describe the image you want to generate with AI.</p>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., 'A photorealistic image of an astronaut riding a horse on Mars'"
                    className="w-full bg-surface-secondary border border-border-muted rounded-md p-3 text-text-primary focus:ring-2 focus:ring-brand focus:border-brand transition mb-4"
                    rows={4}
                />
                <button
                    onClick={handleCreateClick}
                    disabled={!prompt.trim() || isLoading}
                    className="w-full bg-brand hover:bg-brand-hover text-brand-text font-bold py-3 px-4 rounded-md inline-flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Spinner /> : <SparklesIcon className="h-5 w-5" />}
                    <span className="ml-2">Generate Image</span>
                </button>
            </div>
            <div className="landing-card w-full max-w-lg p-6 sm:p-8 bg-surface rounded-xl shadow-lg border border-border-base">
                 <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-brand-subtle-bg rounded-lg">
                        <UploadIcon className="h-8 w-8 text-brand-subtle-text" />
                    </div>
                    <h2 className="text-2xl font-bold text-text-primary">Edit Your Image</h2>
                </div>
                <p className="mb-4 text-text-secondary">Upload an image to start editing with powerful AI tools.</p>
                
                <button
                    onClick={handleUploadClick}
                    className="w-full bg-surface-muted hover:bg-surface-muted-hover text-text-tertiary font-bold py-10 px-4 rounded-md inline-flex flex-col items-center justify-center transition-colors border-2 border-dashed border-border-muted"
                >
                    <UploadIcon className="h-10 w-10 mb-2" />
                    <span>Click to Upload Image</span>
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                />
            </div>
        </div>
    );
};

export default LandingPage;