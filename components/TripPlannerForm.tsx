import React, { useState, useEffect } from 'react';
import { RecentSearch, GeoPoint } from '../types';

interface TripPlannerFormProps {
    onSearch: (origin: string, destination: string, date: string, isOnDemand: boolean, passengers: number, isWheelchairAccessible: boolean, isTaxiOnDemand: boolean, findAccommodation: boolean, originCoords: GeoPoint | null) => void;
    isLoading: boolean;
    initialData?: RecentSearch;
    onCancelSearch: () => void;
}

const getTodaysDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};


export const TripPlannerForm: React.FC<TripPlannerFormProps> = ({ onSearch, isLoading, initialData, onCancelSearch }) => {
    const [origin, setOrigin] = useState(initialData?.origin || '');
    const [destination, setDestination] = useState(initialData?.destination || '');
    const [originCoords, setOriginCoords] = useState<GeoPoint | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);
    
    const deriveIsTaxiOnly = (data?: RecentSearch): boolean => {
        if (!data) return false;
        if (data.isTaxiOnDemand) return true;
        if (data.isWheelchairAccessible) return true;
        if (data.origin && data.destination && data.origin === data.destination) return true;
        return false;
    };
    
    const [isTaxiOnly, setIsTaxiOnly] = useState(deriveIsTaxiOnly(initialData));
    const [travelDate, setTravelDate] = useState(initialData?.date || getTodaysDate());
    const [isOnDemand, setIsOnDemand] = useState(initialData?.isOnDemand || false);
    const [passengers, setPassengers] = useState(initialData?.passengers || 1);
    const [isWheelchairAccessible, setIsWheelchairAccessible] = useState(initialData?.isWheelchairAccessible || false);
    const [isTaxiOnDemand, setIsTaxiOnDemand] = useState(initialData?.isTaxiOnDemand || false);
    const [findAccommodation, setFindAccommodation] = useState(initialData?.findAccommodation || false);

    useEffect(() => {
        if (locationError) {
            const timer = setTimeout(() => setLocationError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [locationError]);

    // Efecto para actualizar el formulario si cambian los datos iniciales desde fuera
    useEffect(() => {
        if (initialData) {
            setOrigin(initialData.origin);
            setDestination(initialData.destination);
            setOriginCoords(null);
            setIsTaxiOnly(deriveIsTaxiOnly(initialData));
            setTravelDate(initialData.date);
            setIsOnDemand(initialData.isOnDemand);
            setPassengers(initialData.passengers);
            setIsWheelchairAccessible(initialData.isWheelchairAccessible);
            setIsTaxiOnDemand(initialData.isTaxiOnDemand);
            setFindAccommodation(initialData.findAccommodation);
        }
    }, [initialData]);
    
    const handleLocateUser = () => {
        if (!navigator.geolocation) {
            setLocationError("Geolocalización no soportada.");
            return;
        }
        setIsLocating(true);
        setLocationError(null);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setOriginCoords({ lat: latitude, lng: longitude });
                setOrigin('Mi ubicación actual');
                setIsLocating(false);
            },
            (error) => {
                setLocationError("No se pudo obtener la ubicación.");
                console.error(error);
                setIsLocating(false);
            },
            { timeout: 10000 }
        );
    };

    const handleOriginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setOrigin(e.target.value);
        if (originCoords) {
            setOriginCoords(null); // Clear coords if user types manually
        }
    };


    const handleTaxiOnlyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setIsTaxiOnly(checked);
        if (checked) {
            setDestination(''); 
            setIsOnDemand(false);
            setFindAccommodation(false);
        } else {
            setIsWheelchairAccessible(false); 
            setIsTaxiOnDemand(false);
        }
    };

    const handleTaxiOnDemandChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setIsTaxiOnDemand(checked);
        if (checked) {
            setIsTaxiOnly(true); 
            setIsOnDemand(false); 
            setFindAccommodation(false); 
        }
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const currentHour = now.getHours();

        // Check if it's today and between 10 PM and 6 AM, and not already a taxi search
        if (travelDate === todayStr && (currentHour >= 22 || currentHour < 6) && !isTaxiOnly && !isTaxiOnDemand) {
            const confirmNightSearch = window.confirm(
                "Es de noche. Para un viaje inmediato, las opciones más realistas son un taxi a demanda o buscar alojamiento. ¿Quieres que ajustemos la búsqueda por ti?"
            );

            if (confirmNightSearch) {
                onSearch(origin, origin, travelDate, false, passengers, isWheelchairAccessible, true, true, originCoords);
            }
            // If user cancels, we do nothing and the form submission is aborted.
        } else {
            // Proceed with normal search
            const finalDestination = isTaxiOnly ? origin : destination;
            onSearch(origin, finalDestination, travelDate, isOnDemand, passengers, isWheelchairAccessible, isTaxiOnDemand, findAccommodation, originCoords);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <div className="relative">
                    <label htmlFor="origin" className="absolute -top-2 left-2 inline-block bg-white px-1 text-xs font-medium text-gray-900">
                        {isTaxiOnly ? 'Localidad para buscar taxi' : 'Desde'}
                    </label>
                    <input
                        type="text"
                        id="origin"
                        value={origin}
                        onChange={handleOriginChange}
                        placeholder={isTaxiOnly ? "Ej: Albarracín" : "Ej: Teruel (ciudad)"}
                        className="block w-full rounded-md border-0 py-2.5 pl-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm sm:leading-6"
                        required
                        disabled={isLoading}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <button
                            type="button"
                            onClick={handleLocateUser}
                            disabled={isLoading || isLocating}
                            className="text-gray-400 hover:text-teal-600 disabled:text-gray-300 disabled:cursor-not-allowed"
                            aria-label="Usar mi ubicación actual"
                            title="Usar mi ubicación actual"
                        >
                            {isLocating ? (
                                <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
                            ) : (
                                <i className="fa-solid fa-location-crosshairs" aria-hidden="true"></i>
                            )}
                        </button>
                    </div>
                </div>
                {locationError && <p className="mt-1 text-xs text-red-600">{locationError}</p>}
            </div>


            {!isTaxiOnly && (
                 <div className="relative">
                    <label htmlFor="destination" className="absolute -top-2 left-2 inline-block bg-white px-1 text-xs font-medium text-gray-900">Hasta</label>
                    <input
                        type="text"
                        id="destination"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="Ej: Albarracín"
                        className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm sm:leading-6"
                        required={!isTaxiOnly}
                        disabled={isLoading}
                    />
                </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                    <label htmlFor="travel-date" className="absolute -top-2 left-2 inline-block bg-white px-1 text-xs font-medium text-gray-900">
                        Fecha del viaje
                    </label>
                    <input
                        type="date"
                        id="travel-date"
                        value={travelDate}
                        onChange={(e) => setTravelDate(e.target.value)}
                        min={getTodaysDate()}
                        className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm sm:leading-6"
                        required
                        disabled={isLoading}
                    />
                </div>
                <div className="relative">
                    <label htmlFor="passengers" className="absolute -top-2 left-2 inline-block bg-white px-1 text-xs font-medium text-gray-900">
                        Pasajeros
                    </label>
                    <input
                        type="number"
                        id="passengers"
                        value={passengers}
                        onChange={(e) => setPassengers(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        min="1"
                        className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm sm:leading-6"
                        required
                        disabled={isLoading}
                    />
                </div>
            </div>
           
            <div className="space-y-4 pt-2">
                <div className="relative flex items-start">
                    <div className="flex h-6 items-center">
                        <input
                            id="taxi-only"
                            name="taxi-only"
                            type="checkbox"
                            checked={isTaxiOnly}
                            onChange={handleTaxiOnlyChange}
                            disabled={isLoading || isTaxiOnDemand}
                            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-600 disabled:bg-gray-200 disabled:cursor-not-allowed"
                        />
                    </div>
                    <div className="ml-3 text-sm leading-6">
                        <label htmlFor="taxi-only" className={`font-medium transition-colors ${isTaxiOnDemand ? 'text-gray-400' : 'text-gray-900'}`}>
                            Buscar solo taxi
                        </label>
                        <p id="taxi-only-description" className={`transition-colors ${isTaxiOnDemand ? 'text-gray-400' : 'text-gray-500'}`}>
                            Marca esta opción para encontrar taxis en una localidad específica.
                        </p>
                    </div>
                </div>

                <div className="relative flex items-start">
                    <div className="flex h-6 items-center">
                        <input
                            id="taxi-on-demand"
                            name="taxi-on-demand"
                            type="checkbox"
                            checked={isTaxiOnDemand}
                            onChange={handleTaxiOnDemandChange}
                            disabled={isLoading}
                            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-600"
                        />
                    </div>
                    <div className="ml-3 text-sm leading-6">
                        <label htmlFor="taxi-on-demand" className="font-medium text-gray-900 flex items-center">
                            <i className="fa-solid fa-phone-volume mr-2.5 text-orange-500 text-lg" aria-hidden="true"></i>
                            <span>Buscar Taxis a Demanda</span>
                        </label>
                        <p id="taxi-on-demand-description" className="text-gray-500">
                            Encuentra taxis que operan con reserva telefónica. Esto activará el modo "Buscar solo taxi" y desactivará otras opciones de ruta.
                        </p>
                    </div>
                </div>
                
                <div className="relative flex items-start">
                    <div className="flex h-6 items-center">
                        <input
                            id="wheelchair-accessible"
                            name="wheelchair-accessible"
                            type="checkbox"
                            checked={isWheelchairAccessible}
                            onChange={(e) => setIsWheelchairAccessible(e.target.checked)}
                            disabled={isLoading || !isTaxiOnly}
                            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-600 disabled:bg-gray-200 disabled:cursor-not-allowed"
                        />
                    </div>
                    <div className="ml-3 text-sm leading-6">
                        <label htmlFor="wheelchair-accessible" className={`font-medium transition-colors ${!isTaxiOnly ? 'text-gray-400' : 'text-gray-900'}`}>
                            Taxi accesible
                        </label>
                        <p id="wheelchair-accessible-description" className={`transition-colors ${!isTaxiOnly ? 'text-gray-400' : 'text-gray-500'}`}>
                            Necesito un taxi adaptado para silla de ruedas (activo solo con "Buscar solo taxi").
                        </p>
                    </div>
                </div>

                 <div className="relative flex items-start">
                    <div className="flex h-6 items-center">
                        <input
                            id="on-demand"
                            name="on-demand"
                            type="checkbox"
                            checked={isOnDemand}
                            onChange={(e) => setIsOnDemand(e.target.checked)}
                            disabled={isLoading || isTaxiOnly}
                            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-600 disabled:bg-gray-200 disabled:cursor-not-allowed"
                        />
                    </div>
                    <div className="ml-3 text-sm leading-6">
                        <label htmlFor="on-demand" className={`font-medium transition-colors ${isTaxiOnly ? 'text-gray-400' : 'text-gray-900'}`}>
                            Buscar Transporte a Demanda
                        </label>
                        <p id="on-demand-description" className={`transition-colors ${isTaxiOnly ? 'text-gray-400' : 'text-gray-500'}`}>
                            Prioriza servicios de bus que requieren reserva telefónica previa.
                        </p>
                    </div>
                </div>
                
                <div className="relative flex items-start">
                    <div className="flex h-6 items-center">
                        <input
                            id="find-accommodation"
                            name="find-accommodation"
                            type="checkbox"
                            checked={findAccommodation}
                            onChange={(e) => setFindAccommodation(e.target.checked)}
                            disabled={isLoading || isTaxiOnly}
                            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-600 disabled:bg-gray-200 disabled:cursor-not-allowed"
                        />
                    </div>
                    <div className="ml-3 text-sm leading-6">
                        <label htmlFor="find-accommodation" className={`font-medium transition-colors ${isTaxiOnly ? 'text-gray-400' : 'text-gray-900'}`}>
                            Buscar alojamiento si no hay vuelta
                        </label>
                        <p id="find-accommodation-description" className={`transition-colors ${isTaxiOnly ? 'text-gray-400' : 'text-gray-500'}`}>
                           Si no hay ruta de vuelta el mismo día, sugiere alojamiento y el viaje de vuelta al día siguiente.
                        </p>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <button
                    type="button"
                    onClick={onCancelSearch}
                    className="flex w-full justify-center items-center rounded-md bg-red-600 px-3 py-2.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 transition-colors duration-200"
                >
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Cancelar</span>
                </button>
            ) : (
                <button
                    type="submit"
                    className="flex w-full justify-center items-center rounded-md bg-teal-600 px-3 py-2.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-teal-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 transition-colors duration-200"
                >
                    <i className="fa-solid fa-magnifying-glass mr-2" aria-hidden="true"></i>
                    {isTaxiOnly ? 'Buscar Taxi' : 'Buscar Viaje'}
                </button>
            )}
        </form>
    );
};