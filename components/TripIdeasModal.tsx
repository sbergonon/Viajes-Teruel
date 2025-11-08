import React from 'react';
import { TripIdea } from '../types';

interface TripIdeasModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPlan: (idea: TripIdea) => void;
    ideas: TripIdea[];
    isLoading: boolean;
    error: string | null;
}

const LoadingSkeleton: React.FC = () => (
    <div className="space-y-4 animate-pulse">
        {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-200 p-4 rounded-lg">
                <div className="h-5 bg-gray-300 rounded w-3/4 mb-3"></div>
                <div className="h-3 bg-gray-300 rounded w-full mb-1"></div>
                <div className="h-3 bg-gray-300 rounded w-5/6"></div>
                <div className="h-8 bg-gray-300 rounded-md w-1/2 mt-4"></div>
            </div>
        ))}
    </div>
);

const IdeaCard: React.FC<{ idea: TripIdea; onPlan: (idea: TripIdea) => void; }> = ({ idea, onPlan }) => (
    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 transition-transform hover:scale-[1.02]">
        <h4 className="font-bold text-gray-800 text-lg">{idea.title}</h4>
        <p className="text-sm text-gray-600 mt-1 mb-4">{idea.description}</p>
        <button
            onClick={() => onPlan(idea)}
            className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 transition-colors"
        >
            <i className="fa-solid fa-route" aria-hidden="true"></i>
            Planificar esta ruta
        </button>
    </div>
);


export const TripIdeasModal: React.FC<TripIdeasModalProps> = ({ isOpen, onClose, onPlan, ideas, isLoading, error }) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="trip-ideas-title"
        >
            <div 
                className="bg-gray-100 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="sticky top-0 bg-gray-100/80 backdrop-blur-sm z-10 p-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 id="trip-ideas-title" className="text-lg font-semibold text-gray-800 flex items-center">
                        <i className="fa-solid fa-lightbulb text-amber-500 mr-3" aria-hidden="true"></i>
                        Ideas para tu viaje
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-700 transition-colors"
                        aria-label="Cerrar"
                    >
                        <i className="fa-solid fa-xmark text-2xl" aria-hidden="true"></i>
                    </button>
                </div>

                <div className="p-6">
                    {isLoading && <LoadingSkeleton />}
                    {error && !isLoading && (
                        <div className="text-center py-6 px-4 bg-red-50 rounded-lg">
                            <div className="mx-auto h-12 w-12 text-red-400">
                                <i className="fa-solid fa-circle-exclamation text-4xl" aria-hidden="true"></i>
                            </div>
                            <h3 className="mt-2 text-md font-medium text-red-800">Error al sugerir viajes</h3>
                            <p className="mt-1 text-sm text-red-600">{error}</p>
                        </div>
                    )}
                    {!isLoading && !error && ideas.length > 0 && (
                        <div className="space-y-4">
                            {ideas.map((idea, index) => (
                                <IdeaCard key={index} idea={idea} onPlan={onPlan} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};