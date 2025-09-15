import React, { useState, useEffect } from 'react';
import ImageEditor from './components/ImageEditor';
import { MoonIcon, SunIcon } from './components/Icon';

const App: React.FC = () => {
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove(theme === 'dark' ? 'light' : 'dark');
        root.classList.add(theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };

    return (
        <div className="bg-gray-100 dark:bg-dark-bg min-h-screen text-gray-800 dark:text-dark-text font-sans transition-colors duration-300">
            <header className="py-6 px-4 sm:px-8 border-b border-gray-200 dark:border-dark-border">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-sky-600 dark:text-sky-400">Imaginara</h1>
                        <p className="mt-2 text-gray-500 dark:text-dark-text-secondary">
                            Upload an image, draw a mask, and tell the AI what to create.
                        </p>
                    </div>
                    <button 
                        onClick={toggleTheme} 
                        className="p-2 rounded-full text-gray-500 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-surface transition-colors"
                        aria-label="Toggle theme"
                    >
                        {theme === 'light' ? <MoonIcon className="h-6 w-6" /> : <SunIcon className="h-6 w-6" />}
                    </button>
                </div>
            </header>
            <main className="p-4 sm:p-8">
                <div className="max-w-7xl mx-auto">
                    <ImageEditor />
                </div>
            </main>
            <footer className="text-center py-4 mt-8 border-t border-gray-200 dark:border-dark-border text-gray-500 dark:text-dark-text-secondary text-sm">
                <p>Powered by Google Gemini. Created for demonstration purposes.</p>
            </footer>
        </div>
    );
};

export default App;