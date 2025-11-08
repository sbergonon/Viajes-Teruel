
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { TripPlan, Route as RouteType, TransportType } from '../types';
import { RouteCard } from './RouteCard';
import { getSubscriptionId } from '../services/subscriptionService';

interface TripResultsProps {
    tripPlan: TripPlan | null;
    isLoading: boolean;
    hasSearched: boolean;
    subscribedRouteIds: Set<string>;
    onToggleSubscription: (route: RouteType) => void;
}

const TripMap: React.FC<{ route: RouteType | null }> = ({ route }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any | null>(null);
    const layerGroupRef = useRef<any | null>(null);
    const userLocationMarkerRef = useRef<any | null>(null);

    const [isLocating, setIsLocating] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);

    useEffect(() => {
        if (locationError) {
            const timer = setTimeout(() => {
                setLocationError(null);
            }, 5000); // Hide error after 5 seconds
            return () => clearTimeout(timer);
        }
    }, [locationError]);

    useEffect(() => {
        if (mapRef.current && !mapInstanceRef.current) {
            const L = (window as any).L;
            if (!L) {
                console.error("Leaflet is not loaded");
                return;
            }
            mapInstanceRef.current = L.map(mapRef.current).setView([40.6, -0.7], 8); // Centered on Teruel province
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(mapInstanceRef.current);
            layerGroupRef.current = L.layerGroup().addTo(mapInstanceRef.current);
        }
    }, []);

    useEffect(() => {
        const L = (window as any).L;
        if (!mapInstanceRef.current || !layerGroupRef.current || !L) return;

        layerGroupRef.current.clearLayers();

        if (route && route.steps.length > 0) {
            const points = [];
            
            if (route.steps[0].originCoords) {
                points.push([route.steps[0].originCoords.lat, route.steps[0].originCoords.lng]);
            }
            
            for (const step of route.steps) {
                 if (step.destinationCoords) {
                    points.push([step.destinationCoords.lat, step.destinationCoords.lng]);
                 }
            }

            const validPoints = points.filter(p => Array.isArray(p) && p.length === 2 && typeof p[0] === 'number' && typeof p[1] === 'number');

            if (validPoints.length > 0) {
                const startPoint = validPoints[0];
                const endPoint = validPoints[validPoints.length - 1];

                L.marker(startPoint).addTo(layerGroupRef.current)
                    .bindPopup(`<b>Origen:</b> ${route.steps[0].origin}`);
                
                if (validPoints.length > 1 && JSON.stringify(startPoint) !== JSON.stringify(endPoint)) {
                    L.marker(endPoint).addTo(layerGroupRef.current)
                        .bindPopup(`<b>Destino:</b> ${route.steps[route.steps.length - 1].destination}`);
                }
                
                if (validPoints.length > 1) {
                    const polyline = L.polyline(validPoints, { color: '#0d9488' }).addTo(layerGroupRef.current); // Teal color
                    mapInstanceRef.current.fitBounds(polyline.getBounds().pad(0.1));
                } else {
                    mapInstanceRef.current.setView(startPoint, 13);
                }
            }
        } else {
             mapInstanceRef.current.setView([40.6, -0.7], 8);
        }

    }, [route]);
    
    const handleLocateUser = () => {
        if (!navigator.geolocation) {
            setLocationError("La geolocalización no está soportada por tu navegador.");
            return;
        }
        
        setIsLocating(true);
        setLocationError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const L = (window as any).L;
                if (!mapInstanceRef.current || !L) return;

                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                const userLatLng = L.latLng(userLat, userLng);

                if (userLocationMarkerRef.current) {
                    userLocationMarkerRef.current.remove();
                }

                const userIcon = L.divIcon({
                    html: `
                        <div class="user-location-icon-container">
                            <div class="user-location-pulse-ring"></div>
                            <div class="user-location-dot"></div>
                        </div>
                    `,
                    className: 'bg-transparent border-0',
                    iconSize: [24, 24],
                    iconAnchor: [12, 12],
                });

                userLocationMarkerRef.current = L.marker(userLatLng, { icon: userIcon })
                    .addTo(mapInstanceRef.current)
                    .bindPopup("<b>Tu ubicación actual</b>").openPopup();
                
                if (route && route.steps.length > 0 && route.steps[0].originCoords) {
                    const startPoint = L.latLng(route.steps[0].originCoords.lat, route.steps[0].originCoords.lng);
                    const bounds = L.latLngBounds(userLatLng, startPoint);
                    mapInstanceRef.current.fitBounds(bounds.pad(0.2));
                } else {
                    mapInstanceRef.current.setView(userLatLng, 14);
                }

                setIsLocating(false);
            },
            (error) => {
                let message;
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        message = "Has denegado el permiso de ubicación.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        message = "Información de ubicación no disponible.";
                        break;
                    case error.TIMEOUT:
                        message = "Se ha agotado el tiempo para obtener la ubicación.";
                        break;
                    default:
                        message = "Ocurrió un error desconocido al obtener la ubicación.";
                        break;
                }
                setLocationError(message);
                setIsLocating(false);
            }
        );
    };

    return (
        <div className="relative">
            <div ref={mapRef} className="h-96 w-full rounded-lg z-0" />
            <button
                onClick={handleLocateUser}
                disabled={isLocating}
                className="absolute top-3 right-3 z-[1000] bg-white p-2.5 h-10 w-10 rounded-full shadow-lg text-gray-700 hover:bg-gray-100 disabled:bg-gray-200 disabled:cursor-wait flex items-center justify-center transition-colors"
                title="Mostrar mi ubicación"
                aria-label="Mostrar mi ubicación"
            >
                {isLocating ? <i className="fa-solid fa-spinner fa-spin text-lg" aria-hidden="true"></i> : <i className="fa-solid fa-location-crosshairs text-lg" aria-hidden="true"></i>}
            </button>
             {locationError && <p className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[1000] bg-red-100 text-red-800 text-xs py-1 px-2 rounded-md shadow-md">{locationError}</p>}
        </div>
    );
};


const LoadingSkeleton: React.FC = () => (
    <div className="space-y-4 animate-pulse">
        <div className="bg-white p-4 rounded-lg shadow">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
        {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-full"></div>
            </div>
        ))}
    </div>
);

const InitialState: React.FC = () => (
    <div className="text-center py-10 px-4">
        <div className="mx-auto h-16 w-16 text-teal-300">
             <i className="fa-solid fa-map-signs text-5xl" aria-hidden="true"></i>
        </div>
        <h3 className="mt-2 text-lg font-medium text-gray-900">Planifica tu próximo viaje</h3>
        <p className="mt-1 text-sm text-gray-500">
            Descubre cómo moverte por Teruel usando el transporte público.
        </p>
    </div>
);

const NoResults: React.FC<{isFiltered?: boolean}> = ({ isFiltered = false }) => (
     <div className="text-center py-10 px-4">
        <div className="mx-auto h-16 w-16 text-amber-400">
            <i className={`fa-solid ${isFiltered ? 'fa-filter-circle-xmark' : 'fa-triangle-exclamation'} text-5xl`} aria-hidden="true"></i>
        </div>
        <h3 className="mt-2 text-lg font-medium text-gray-900">{isFiltered ? 'Ninguna ruta coincide con los filtros' : 'No se encontraron rutas'}</h3>
        <p className="mt-1 text-sm text-gray-500">
            {isFiltered ? 'Prueba a cambiar o eliminar algunos filtros para ver más resultados.' : 'No hemos podido encontrar una ruta para tu búsqueda. Intenta con otras localidades.'}
        </p>
    </div>
);

const parseDurationToHours = (durationStr: string): number => {
    if (!durationStr) return 0;
    let totalHours = 0;
    const hoursMatch = durationStr.match(/(\d+)\s*h/);
    const minutesMatch = durationStr.match(/(\d+)\s*m/);

    if (hoursMatch) {
        totalHours += parseInt(hoursMatch[1], 10);
    }
    if (minutesMatch) {
        totalHours += parseInt(minutesMatch[1], 10) / 60;
    }
    return totalHours;
};


export const TripResults: React.FC<TripResultsProps> = ({ tripPlan, isLoading, hasSearched, subscribedRouteIds, onToggleSubscription }) => {
    const [activeTransportTypes, setActiveTransportTypes] = useState<Set<TransportType>>(new Set());
    const [maxPrice, setMaxPrice] = useState<number>(0);
    const [priceRangeMax, setPriceRangeMax] = useState<number>(100);
    const [selectedRoute, setSelectedRoute] = useState<RouteType | null>(null);
    const [departureTimeFilter, setDepartureTimeFilter] = useState<string>('');
    const [arrivalTimeFilter, setArrivalTimeFilter] = useState<string>('');
    const [durationRange, setDurationRange] = useState<{ min: number; max: number }>({ min: 0, max: 24 });
    const [durationRangeBounds, setDurationRangeBounds] = useState<{ min: number; max: number }>({ min: 0, max: 24 });
    const [sortOption, setSortOption] = useState<string>('default');
    const [isMapVisible, setIsMapVisible] = useState<boolean>(true);

    const availableTransports = useMemo(() => {
        if (!tripPlan?.routes) return [];
        return Array.from(new Set(tripPlan.routes.flatMap(r => r.steps.map(s => s.transportType))));
    }, [tripPlan]);

    const filteredAndSortedRoutes = useMemo(() => {
        if (!tripPlan?.routes) return [];
    
        let routes = tripPlan.routes.filter(route => {
            const priceMatch = route.totalPrice <= maxPrice;
    
            const transportMatch = (() => {
                if (activeTransportTypes.size === 0) return true;
                const routeTransportTypes = new Set(route.steps.map(step => step.transportType));
                return [...activeTransportTypes].every(type => routeTransportTypes.has(type));
            })();
    
            const departureMatch = (() => {
                if (!departureTimeFilter) return true;
                if (route.steps.length === 0 || !route.steps[0].departureTime) return false;
                return route.steps[0].departureTime >= departureTimeFilter;
            })();
    
            const arrivalMatch = (() => {
                if (!arrivalTimeFilter) return true;
                if (route.steps.length === 0 || !route.steps[route.steps.length - 1].arrivalTime) return false;
                return route.steps[route.steps.length - 1].arrivalTime <= arrivalTimeFilter;
            })();

            const routeDurationHours = parseDurationToHours(route.totalDuration);
            const durationMatch = routeDurationHours >= durationRange.min && routeDurationHours <= durationRange.max;
    
            return priceMatch && transportMatch && departureMatch && arrivalMatch && durationMatch;
        });

        const [sortKey, sortDirection] = sortOption.split('-');
        if (sortKey !== 'default') {
            routes.sort((a, b) => {
                let valA, valB;
                if (sortKey === 'price') {
                    valA = a.totalPrice;
                    valB = b.totalPrice;
                } else { // duration
                    valA = parseDurationToHours(a.totalDuration);
                    valB = parseDurationToHours(b.totalDuration);
                }

                return sortDirection === 'asc' ? valA - valB : valB - valA;
            });
        }

        return routes;

    }, [tripPlan, maxPrice, activeTransportTypes, departureTimeFilter, arrivalTimeFilter, durationRange, sortOption]);

    useEffect(() => {
        if (tripPlan && tripPlan.routes.length > 0) {
            const max = Math.ceil(Math.max(...tripPlan.routes.map(r => r.totalPrice), 0));
            setPriceRangeMax(max > 0 ? max : 100);
            setMaxPrice(max > 0 ? max : 100);

            const durationsInHours = tripPlan.routes.map(r => parseDurationToHours(r.totalDuration));
            const minDur = Math.floor(Math.min(...durationsInHours, 0));
            const maxDur = Math.ceil(Math.max(...durationsInHours, 1));
            setDurationRangeBounds({ min: minDur, max: maxDur });
            setDurationRange({ min: minDur, max: maxDur });
            
            setActiveTransportTypes(new Set());
            setSortOption('default');
            setDepartureTimeFilter('');
            setArrivalTimeFilter('');

        }
    }, [tripPlan]);
    
    useEffect(() => {
        if (filteredAndSortedRoutes.length > 0) {
            if (!selectedRoute || !filteredAndSortedRoutes.includes(selectedRoute)) {
                setSelectedRoute(filteredAndSortedRoutes[0]);
            }
        } else {
            setSelectedRoute(null);
        }
    }, [filteredAndSortedRoutes, selectedRoute]);


    const handleTransportToggle = (type: TransportType) => {
        setActiveTransportTypes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(type)) {
                newSet.delete(type);
            } else {
                newSet.add(type);
            }
            return newSet;
        });
    };
    
    if (isLoading) {
        return <LoadingSkeleton />;
    }

    if (!hasSearched) {
        return <InitialState />;
    }
    
    if (!tripPlan || tripPlan.routes.length === 0) {
        return <NoResults />;
    }
    
    return (
        <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg shadow-md space-y-4">
                <h3 className="text-md font-semibold text-gray-700">Filtrar y ordenar resultados</h3>
                
                <div>
                    <label htmlFor="sort-order" className="block text-sm font-medium text-gray-900 mb-1">Ordenar por</label>
                    <select
                        id="sort-order"
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                        className="block w-full rounded-md border-0 py-2 pl-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm"
                    >
                        <option value="default">Recomendado</option>
                        <option value="price-asc">Precio (más bajo primero)</option>
                        <option value="price-desc">Precio (más alto primero)</option>
                        <option value="duration-asc">Duración (más corta primero)</option>
                        <option value="duration-desc">Duración (más larga primero)</option>
                    </select>
                </div>
                
                <div>
                    <label className="text-sm font-medium text-gray-900">Filtrar por tipo de transporte</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {availableTransports.filter(type => type !== TransportType.WALK).map(type => (
                            <button
                                key={type}
                                onClick={() => handleTransportToggle(type)}
                                className={`px-3 py-1 text-sm font-medium rounded-full transition-colors duration-200 ${activeTransportTypes.has(type) ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label htmlFor="price-range" className="flex justify-between text-sm font-medium text-gray-900">
                        <span>Precio máximo</span>
                        <span className="font-bold text-teal-600">{maxPrice.toFixed(2)}€</span>
                    </label>
                    <input
                        id="price-range"
                        type="range"
                        min="0"
                        max={priceRangeMax}
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600 mt-1"
                    />
                </div>
                
                <div>
                    <label className="flex justify-between text-sm font-medium text-gray-900">
                        <span>Duración del viaje (horas)</span>
                        <span className="font-bold text-teal-600">{`${durationRange.min}h - ${durationRange.max}h`}</span>
                    </label>
                    <div className="grid grid-cols-2 gap-4 mt-1">
                        <div>
                            <label htmlFor="min-duration" className="block text-xs text-gray-600">Mínimo</label>
                            <input
                                id="min-duration"
                                type="number"
                                value={durationRange.min}
                                min={durationRangeBounds.min}
                                max={durationRange.max}
                                onChange={(e) => setDurationRange(d => ({ ...d, min: Math.max(durationRangeBounds.min, Number(e.target.value)) }))}
                                className="mt-1 block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm"
                            />
                        </div>
                        <div>
                            <label htmlFor="max-duration" className="block text-xs text-gray-600">Máximo</label>
                            <input
                                id="max-duration"
                                type="number"
                                value={durationRange.max}
                                min={durationRange.min}
                                max={durationRangeBounds.max}
                                onChange={(e) => setDurationRange(d => ({ ...d, max: Math.min(durationRangeBounds.max, Number(e.target.value)) }))}
                                className="mt-1 block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="departure-time" className="block text-sm font-medium text-gray-900">
                                Salida (desde)
                            </label>
                            <input
                                id="departure-time"
                                type="time"
                                value={departureTimeFilter}
                                onChange={(e) => setDepartureTimeFilter(e.target.value)}
                                className="mt-1 block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm"
                            />
                        </div>
                        <div>
                            <label htmlFor="arrival-time" className="block text-sm font-medium text-gray-900">
                                Llegada (hasta)
                            </label>
                            <input
                                id="arrival-time"
                                type="time"
                                value={arrivalTimeFilter}
                                onChange={(e) => setArrivalTimeFilter(e.target.value)}
                                className="mt-1 block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md sticky top-[70px] z-[5]">
                 <div className="flex justify-between items-center">
                    <h3 className="text-md font-semibold text-gray-700">Mapa de la ruta seleccionada</h3>
                    <button
                        onClick={() => setIsMapVisible(prev => !prev)}
                        className="flex items-center gap-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 py-1.5 px-3 rounded-full transition-colors shadow-sm"
                        aria-expanded={isMapVisible}
                        aria-controls="trip-map-container"
                    >
                        <i className={`fa-solid ${isMapVisible ? 'fa-eye-slash' : 'fa-eye'} fa-fw`} aria-hidden="true"></i>
                        <span>{isMapVisible ? 'Ocultar mapa' : 'Mostrar mapa'}</span>
                    </button>
                </div>
                {isMapVisible && (
                    <div id="trip-map-container" className="mt-3">
                         <TripMap route={selectedRoute} />
                    </div>
                )}
            </div>

             <h2 className="text-lg font-semibold text-gray-800 pt-4">Rutas sugeridas</h2>

            {filteredAndSortedRoutes.length > 0 ? (
                filteredAndSortedRoutes.map((route: RouteType, index: number) => (
                    <RouteCard 
                        key={index} 
                        route={route} 
                        isSelected={route === selectedRoute}
                        onSelect={setSelectedRoute}
                        isSubscribed={subscribedRouteIds.has(getSubscriptionId(route))}
                        onToggleSubscription={onToggleSubscription}
                    />
                ))
            ) : (
                <NoResults isFiltered={tripPlan.routes.length > 0} />
            )}
        </div>
    );
};
