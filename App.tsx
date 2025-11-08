import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { TripPlannerForm } from './components/TripPlannerForm';
import { TripResults } from './components/TripResults';
import { getTripIdeas, planTrip } from './services/geminiService';
import { TripPlan, RecentSearch, GeoPoint, TripIdea, Subscription, Route as RouteType } from './types';
import { RecentSearches } from './components/RecentSearches';
import { getRecentSearches, saveRecentSearch } from './services/recentSearchService';
import * as subscriptionService from './services/subscriptionService';
import { TripIdeasModal } from './components/TripIdeasModal';
import { AlertsModal } from './components/AlertsModal';

const SEARCH_TIMEOUT = 45000; // 45 segundos

const getTodaysDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const App: React.FC = () => {
    const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState<boolean>(false);
    const [searchId, setSearchId] = useState(0);
    const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
    const [initialFormData, setInitialFormData] = useState<RecentSearch | undefined>();
    const abortControllerRef = useRef<AbortController | null>(null);

    // State for Trip Ideas
    const [tripIdeas, setTripIdeas] = useState<TripIdea[]>([]);
    const [isIdeasLoading, setIsIdeasLoading] = useState<boolean>(false);
    const [ideasError, setIdeasError] = useState<string | null>(null);
    const [isIdeasModalOpen, setIsIdeasModalOpen] = useState<boolean>(false);
    const ideasAbortControllerRef = useRef<AbortController | null>(null);
    
    // State for Subscriptions & Alerts
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [isAlertsModalOpen, setIsAlertsModalOpen] = useState<boolean>(false);
    const [currentSearchDate, setCurrentSearchDate] = useState<string>(getTodaysDate());

    useEffect(() => {
        setRecentSearches(getRecentSearches());
        setSubscriptions(subscriptionService.getSubscriptions());
    }, []);

    const subscribedRouteIds = useMemo(() => new Set(subscriptions.map(s => s.id)), [subscriptions]);
    
    const isTaxiOnlySearch = (origin: string, destination: string) => origin.trim().toLowerCase() === destination.trim().toLowerCase() && origin.trim() !== '';

    const handleSearch = useCallback(async (origin: string, destination: string, date: string, isOnDemand: boolean, passengers: number, isWheelchairAccessible: boolean, isTaxiOnDemand: boolean, findAccommodation: boolean, originCoords: GeoPoint | null) => {
        if (origin === 'Mi ubicación actual' && !originCoords) {
            setError("Por favor, usa el botón de geolocalización de nuevo para confirmar tu ubicación antes de realizar esta búsqueda.");
            return;
        }
        if (!origin || (!isTaxiOnlySearch(origin, destination) && !destination)) {
            setError("Por favor, introduce un origen y un destino.");
            return;
        }

        if (abortControllerRef.current) {
            abortControllerRef.current.abort('new_search');
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;
        const signal = controller.signal;

        const searchToSave: RecentSearch = {
            origin, destination, date, isOnDemand, passengers, isWheelchairAccessible, isTaxiOnDemand, findAccommodation
        };
        saveRecentSearch(searchToSave);
        setRecentSearches(getRecentSearches());
        
        setCurrentSearchDate(date);
        setIsLoading(true);
        setError(null);
        setTripPlan(null);
        setHasSearched(true);

        const timeoutId = setTimeout(() => {
            controller.abort('timeout');
        }, SEARCH_TIMEOUT);

        try {
            const result = await planTrip(origin, destination, date, isOnDemand, passengers, isWheelchairAccessible, isTaxiOnDemand, findAccommodation, originCoords, signal);
            if (!signal.aborted) {
                setTripPlan(result);
            }
        } catch (e) {
            if (e.name === 'AbortError') {
                if (signal.reason === 'timeout') {
                    setError("La búsqueda está tardando demasiado. Por favor, inténtalo de nuevo más tarde.");
                } else if (signal.reason === 'user_cancel' || signal.reason === 'clear' || signal.reason === 'new_search') {
                    setError(null); 
                }
                setTripPlan(null);
            } else {
                console.error(e);
                if (e.message.includes("tardado demasiado") || e.message.includes("timed out")) {
                     setError("La búsqueda está tardando demasiado. El servidor no pudo responder a tiempo.");
                } else {
                    setError("No se pudo obtener la planificación del viaje. Por favor, inténtalo de nuevo.");
                }
                setTripPlan(null);
            }
        } finally {
            clearTimeout(timeoutId);
            if (abortControllerRef.current === controller) {
                 abortControllerRef.current = null;
            }
            setIsLoading(false);
        }
    }, []);
    
    const handleClearSearch = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort('clear');
            abortControllerRef.current = null;
        }
        setTripPlan(null);
        setError(null);
        setHasSearched(false);
        setInitialFormData(undefined);
        setIsLoading(false);
        setSearchId(id => id + 1);
    }, []);

    const handleCancelSearch = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort('user_cancel');
            abortControllerRef.current = null; // Reset ref immediately
        }
        // Directly update state for immediate feedback
        setIsLoading(false);
        setError(null);
    }, []);

    const handleSelectRecentSearch = useCallback((search: RecentSearch) => {
        setInitialFormData(search);
        setSearchId(id => id + 1);
    }, []);

    const handleCloseIdeasModal = useCallback(() => {
        if (ideasAbortControllerRef.current) {
            ideasAbortControllerRef.current.abort();
            ideasAbortControllerRef.current = null;
        }
        setIsIdeasModalOpen(false);
    }, []);

    const handleSuggestTrip = useCallback(async () => {
        if (ideasAbortControllerRef.current) {
            ideasAbortControllerRef.current.abort();
        }
        ideasAbortControllerRef.current = new AbortController();
        
        setIsIdeasLoading(true);
        setIdeasError(null);
        setTripIdeas([]); // Clear previous ideas for better UX
        setIsIdeasModalOpen(true);

        try {
            const ideas = await getTripIdeas(ideasAbortControllerRef.current.signal);
            setTripIdeas(ideas);
        } catch (e) {
            if (e.name !== 'AbortError') {
                setIdeasError(e.message || "No se pudieron obtener las sugerencias.");
            }
        } finally {
            setIsIdeasLoading(false);
        }
    }, []);

    const handlePlanFromIdea = useCallback((idea: TripIdea) => {
        setIsIdeasModalOpen(false);
        const searchData: RecentSearch = {
            origin: idea.origin,
            destination: idea.destination,
            date: getTodaysDate(),
            isOnDemand: false,
            passengers: 1,
            isWheelchairAccessible: false,
            isTaxiOnDemand: false,
            findAccommodation: false,
        };
        setInitialFormData(searchData);
        setSearchId(id => id + 1);
    }, []);

    const handleToggleSubscription = useCallback((route: RouteType) => {
        const id = subscriptionService.getSubscriptionId(route);
        if (subscribedRouteIds.has(id)) {
            subscriptionService.removeSubscription(id);
        } else {
            subscriptionService.addSubscription(route, currentSearchDate);
        }
        setSubscriptions(subscriptionService.getSubscriptions());
    }, [subscribedRouteIds, currentSearchDate]);
    
    const handleUnsubscribe = useCallback((id: string) => {
        subscriptionService.removeSubscription(id);
        setSubscriptions(subscriptionService.getSubscriptions());
    }, []);

    useEffect(() => {
        if (initialFormData) {
            handleSearch(
                initialFormData.origin,
                initialFormData.destination,
                initialFormData.date,
                initialFormData.isOnDemand,
                initialFormData.passengers,
                initialFormData.isWheelchairAccessible,
                initialFormData.isTaxiOnDemand,
                initialFormData.findAccommodation,
                null // Recent searches don't have coords, handleSearch will catch this.
            );
        }
    }, [initialFormData, searchId, handleSearch]);


    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
            <header className="bg-white shadow-md sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4 md:px-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <i className="fas fa-route text-2xl text-teal-600" aria-hidden="true"></i>
                            <h1 className="text-xl font-bold text-gray-800 tracking-tight">
                                Planificador de Viajes Teruel
                            </h1>
                        </div>
                        <button 
                            onClick={() => setIsAlertsModalOpen(true)}
                            className="relative text-gray-500 hover:text-teal-600 transition-colors"
                            aria-label="Ver mis alertas de viaje"
                            title="Mis Alertas"
                        >
                            <i className="fa-solid fa-bell text-2xl" aria-hidden="true"></i>
                            {subscriptions.length > 0 && (
                                <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" aria-hidden="true"></span>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto p-4 md:p-6">
                <div className="max-w-2xl mx-auto">
                    <section className="bg-white p-6 rounded-lg shadow-lg mb-6">
                        <div className="flex justify-between items-start mb-4 gap-2">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-700 mb-1">Encuentra tu ruta</h2>
                                <p className="text-sm text-gray-500">Introduce el origen, el destino y la fecha para planificar tu viaje.</p>
                            </div>
                            <div className="flex items-center flex-shrink-0 gap-2">
                                <button
                                    onClick={handleSuggestTrip}
                                    className="text-sm font-medium bg-amber-100 hover:bg-amber-200 text-amber-800 py-1 px-3 rounded-md transition-colors flex items-center whitespace-nowrap shadow-sm disabled:opacity-50"
                                    aria-label="Sugerir ideas de viaje"
                                    title="Obtener ideas de viaje"
                                    disabled={isIdeasLoading}
                                >
                                    {isIdeasLoading ? <i className="fa-solid fa-spinner fa-spin mr-1.5" aria-hidden="true"></i> : <i className="fa-solid fa-lightbulb mr-1.5" aria-hidden="true"></i>}
                                    <span>Ideas</span>
                                </button>
                                {(hasSearched || error) && !isLoading && (
                                    <button
                                        onClick={handleClearSearch}
                                        className="text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 py-1 px-3 rounded-md transition-colors flex items-center whitespace-nowrap shadow-sm"
                                        aria-label="Limpiar búsqueda y resultados"
                                        title="Limpiar búsqueda y resultados"
                                    >
                                        <i className="fa-solid fa-eraser mr-1.5" aria-hidden="true"></i>
                                        Limpiar
                                    </button>
                                )}
                            </div>
                        </div>
                        <TripPlannerForm 
                            key={searchId} 
                            onSearch={handleSearch} 
                            isLoading={isLoading} 
                            initialData={initialFormData}
                            onCancelSearch={handleCancelSearch}
                        />
                        {error && <p className="mt-4 text-red-500 text-sm font-medium bg-red-50 p-3 rounded-md border border-red-200">{error}</p>}
                    </section>
                    
                    <RecentSearches searches={recentSearches} onSelect={handleSelectRecentSearch} />
                    
                    <TripResults 
                        tripPlan={tripPlan} 
                        isLoading={isLoading} 
                        hasSearched={hasSearched}
                        subscribedRouteIds={subscribedRouteIds}
                        onToggleSubscription={handleToggleSubscription}
                    />
                </div>
            </main>

            <TripIdeasModal 
                isOpen={isIdeasModalOpen}
                onClose={handleCloseIdeasModal}
                onPlan={handlePlanFromIdea}
                ideas={tripIdeas}
                isLoading={isIdeasLoading}
                error={ideasError}
            />

            <AlertsModal
                isOpen={isAlertsModalOpen}
                onClose={() => setIsAlertsModalOpen(false)}
                subscriptions={subscriptions}
                onUnsubscribe={handleUnsubscribe}
            />
            
            <footer className="text-center py-4 text-xs text-gray-400">
                <p>Desarrollado con IA para viajes por Teruel</p>
            </footer>
        </div>
    );
};

export default App;