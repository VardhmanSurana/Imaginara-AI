import React from 'react';

interface Snapshot {
    name: string;
    dataUrl: string;
    thumbnail: string;
}

interface SnapshotsModalProps {
    isOpen: boolean;
    onClose: () => void;
    snapshots: Snapshot[];
    onLoad: (dataUrl: string) => void;
    onDelete: (index: number) => void;
}

const SnapshotsModal: React.FC<SnapshotsModalProps> = ({ isOpen, onClose, snapshots, onLoad, onDelete }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50 p-4">
            <div className="bg-surface rounded-lg shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-border-base">
                    <h3 className="text-xl font-bold text-brand">History Snapshots</h3>
                    <p className="text-sm text-text-secondary mt-1">Load a previously saved version of your image.</p>
                </div>
                <div className="p-4 overflow-y-auto">
                    {snapshots.length === 0 ? (
                        <p className="text-center text-text-secondary py-8">No snapshots saved yet.</p>
                    ) : (
                        <ul className="space-y-3">
                            {snapshots.map((snapshot, index) => (
                                <li key={index} className="flex items-center gap-4 p-2 bg-bg rounded-lg">
                                    <img src={snapshot.thumbnail} alt={snapshot.name} className="w-16 h-16 rounded-md object-cover flex-shrink-0" />
                                    <span className="font-medium text-text-primary flex-grow truncate">{snapshot.name}</span>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button onClick={() => onLoad(snapshot.dataUrl)} className="bg-brand hover:bg-brand-hover text-brand-text font-bold py-2 px-4 rounded-md text-sm transition-colors">Load</button>
                                        <button onClick={() => onDelete(index)} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md text-sm transition-colors">Delete</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="p-4 border-t border-border-base flex justify-end gap-4">
                    <button onClick={onClose} className="bg-surface-muted hover:bg-surface-muted-hover text-text-primary font-bold py-2 px-4 rounded-md transition-colors">Close</button>
                </div>
            </div>
        </div>
    );
};

export default SnapshotsModal;