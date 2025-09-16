import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import EditorPage from './components/EditorPage';
import { generateImageFromText } from './services/geminiService';

const App: React.FC = () => {
    const [view, setView] = useState<'landing' | 'editor'>('landing');
    const [initialImageDataUrl, setInitialImageDataUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleStartWithUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            setInitialImageDataUrl(e.target?.result as string);
            setView('editor');
        };
        reader.readAsDataURL(file);
    };

    const handleStartWithCreate = async (prompt: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const resultB64 = await generateImageFromText(prompt);
            const newImageSrc = `data:image/png;base64,${resultB64}`;
            setInitialImageDataUrl(newImageSrc);
            setView('editor');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGoHome = () => {
        setInitialImageDataUrl(null);
        setError(null);
        setView('landing');
    };

    return (
        <div className="min-h-screen text-text-primary font-sans transition-colors duration-300 flex flex-col">
            <header className="sticky top-0 z-30 navbar-glass">
                 <div className="max-w-screen-2xl mx-auto flex justify-between items-center py-4 px-4 sm:px-8">
                    <div className="flex items-center gap-4">
                         <h1 className="text-3xl font-bold text-brand">Imaginara</h1>
                         <p className="mt-1 text-text-secondary hidden sm:block">
                            AI-Powered Image Creation & Editing
                        </p>
                    </div>
                </div>
            </header>
            
            <main className="flex-grow">
                {view === 'landing' ? (
                    <LandingPage onStartWithCreate={handleStartWithCreate} onStartWithUpload={handleStartWithUpload} isLoading={isLoading} />
                ) : (
                    <EditorPage initialImageDataUrl={initialImageDataUrl} onGoHome={handleGoHome} />
                )}
            </main>

            {error && view === 'landing' && (
                <div className="fixed bottom-4 right-4 max-w-sm w-full p-4 bg-error-bg border border-error-border text-error-text rounded-md text-sm shadow-lg z-50">
                    <div className="flex justify-between items-start">
                        <span>{error}</span>
                        <button onClick={() => setError(null)} className="ml-2 font-bold">&times;</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;