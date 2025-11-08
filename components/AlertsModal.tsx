import React, { useState, useCallback } from 'react';
import { Subscription } from '../types';
import { checkTripUpdates } from '../services/geminiService';

interface AlertItemProps {
    subscription: Subscription;
    onUnsubscribe: (id: string) => void;
}

const AlertItem: React.FC<AlertItemProps> = ({ subscription, onUnsubscribe }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [update, setUpdate] = useState<{ message: string; type: 'info' | 'success' | 'warning' | 'error' } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleCheckUpdates = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setUpdate(null);
        try {
            const result = await checkTripUpdates(subscription);
            const message = result.message.toLowerCase();
            let type: 'info' | 'success' | 'warning' | 'error' = 'info';
            if (message.includes('cancelado') || message.includes('cancelled')) {
                type = 'error';
            } else if (message.includes('retraso') || message.includes('delay')) {
                type = 'warning';
            } else if (message.includes('orden') || message.includes('previsto') || message.includes('on time')) {
                type = 'success';
            }
            setUpdate({ message: result.message, type });
        } catch (e) {
            setError(e.message || 'No se pudo comprobar el estado.');
        } finally {
            setIsLoading(false);
        }
    }, [subscription]);

    const getUpdateColorClasses = () => {
        if (!update) return 'bg-gray-100 text-gray-800';
        switch (update.type) {
            case 'success': return 'bg-green-100 text-green-800';
            case 'warning': return 'bg-amber-100 text-amber-800';
            case 'error': return 'bg-red-100 text-red-800';
            default: return 'bg-blue-100 text-blue-800';
        }
    };
    
    const getUpdateIcon = () => {
        if (!update) return 'fa-circle-question';
        switch (update.type) {
            case 'success': return 'fa-circle-check';
            case 'warning': return 'fa-triangle-exclamation';
            case 'error': return 'fa-circle-xmark';
            default: return 'fa-circle-info';
        }
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-bold text-gray-800">{subscription.summary}</h4>
                    <p className="text-xs text-gray-500">{subscription.origin} → {subscription.destination}</p>
                </div>
                <button
                    onClick={() => onUnsubscribe(subscription.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                    aria-label={`Anular suscripción a la ruta: ${subscription.summary}`}
                    title="Anular suscripción"
                >
                    <i className="fa-solid fa-trash-can" aria-hidden="true"></i>
                </button>
            </div>
            <div className={`mt-3 p-3 rounded-md text-sm transition-colors ${getUpdateColorClasses()}`}>
                {isLoading ? (
                     <div className="flex items-center text-gray-600" role="status" aria-live="polite">
                        <i className="fa-solid fa-spinner fa-spin mr-2" aria-hidden="true"></i>
                        <span>Comprobando estado...</span>
                    </div>
                ) : error ? (
                    <div className="flex items-start text-red-800" role="alert">
                        <i className="fa-solid fa-circle-xmark mr-2 mt-0.5" aria-hidden="true"></i>
                        <span>{error}</span>
                    </div>
                ) : update ? (
                     <div className="flex items-start" role="status" aria-live="polite">
                        <i className={`fa-solid ${getUpdateIcon()} mr-2 mt-0.5`} aria-hidden="true"></i>
                        <span>{update.message}</span>
                    </div>
                ) : (
                    <p className="text-gray-600 italic text-xs">Aún no se ha comprobado el estado de este viaje.</p>
                )}
            </div>
            <div className="mt-3">
                <button 
                    onClick={handleCheckUpdates}
                    disabled={isLoading}
                    className="w-full flex justify-center items-center gap-2 rounded-md bg-teal-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 transition-colors disabled:bg-teal-300 disabled:cursor-not-allowed"
                >
                    <i className="fa-solid fa-arrows-rotate" aria-hidden="true"></i>
                    Comprobar ahora
                </button>
            </div>
        </div>
    );
};


interface AlertsModalProps {
    isOpen: boolean;
    onClose: () => void;
    subscriptions: Subscription[];
    onUnsubscribe: (id: string) => void;
}

export const AlertsModal: React.FC<AlertsModalProps> = ({ isOpen, onClose, subscriptions, onUnsubscribe }) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="alerts-title"
        >
            <div
                className="bg-gray-100 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="sticky top-0 bg-gray-100/80 backdrop-blur-sm z-10 p-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 id="alerts-title" className="text-lg font-semibold text-gray-800 flex items-center">
                        <i className="fa-solid fa-bell text-teal-600 mr-3" aria-hidden="true"></i>
                        Mis Alertas de Viaje
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-700 transition-colors"
                        aria-label="Cerrar"
                    >
                        <i className="fa-solid fa-xmark text-2xl" aria-hidden="true"></i>
                    </button>
                </div>

                <div className="p-6 flex-grow">
                    {subscriptions.length > 0 ? (
                        <div className="space-y-4">
                            {subscriptions.map(sub => (
                                <AlertItem key={sub.id} subscription={sub} onUnsubscribe={onUnsubscribe} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 px-4">
                            <div className="mx-auto h-16 w-16 text-gray-400">
                                <i className="fa-regular fa-bell-slash text-5xl" aria-hidden="true"></i>
                            </div>
                            <h3 className="mt-2 text-lg font-medium text-gray-900">No tienes suscripciones</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Haz clic en el icono de la campana <i className="fa-regular fa-bell text-xs" aria-hidden="true"></i> en una ruta para recibir alertas.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
