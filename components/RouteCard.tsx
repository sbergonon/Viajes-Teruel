
import React, { useState } from 'react';
import { Route, Step, TransportType, BookingType, Accommodation } from '../types';

interface RouteCardProps {
    route: Route;
    isSelected: boolean;
    onSelect: (route: Route) => void;
    isSubscribed: boolean;
    onToggleSubscription: (route: Route) => void;
}

const transportIcons: { [key in TransportType]: string } = {
    [TransportType.BUS]: "fa-solid fa-bus-simple",
    [TransportType.TRAIN]: "fa-solid fa-train-subway",
    [TransportType.TAXI]: "fa-solid fa-taxi",
    [TransportType.WALK]: "fa-solid fa-person-walking",
};

const transportColors: { [key in TransportType]: string } = {
    [TransportType.BUS]: "bg-blue-100 text-blue-800",
    [TransportType.TRAIN]: "bg-red-100 text-red-800",
    [TransportType.TAXI]: "bg-amber-500 text-white",
    [TransportType.WALK]: "bg-gray-100 text-gray-800",
}

const bookingIcons: { [key in BookingType]: string } = {
    [BookingType.WEB]: "fa-solid fa-globe",
    [BookingType.PHONE]: "fa-solid fa-phone",
    [BookingType.EMAIL]: "fa-solid fa-envelope",
    [BookingType.ON_SITE]: "fa-solid fa-ticket",
    [BookingType.NOT_AVAILABLE]: "fa-solid fa-circle-xmark",
}

const PhoneNumber: React.FC<{ phone: string }> = ({ phone }) => {
    const [isCopied, setIsCopied] = useState(false);
    
    const handleCopy = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(phone.replace(/\s/g, ''));
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="flex items-center group">
            <a href={`tel:${phone.replace(/\s/g, '')}`} className="font-medium text-teal-600 hover:text-teal-500 truncate">{phone}</a>
            <button
                onClick={handleCopy}
                className="ml-2 text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
                title={isCopied ? "¡Copiado!" : "Copiar número"}
                aria-label={isCopied ? "Número copiado" : "Copiar número de teléfono"}
            >
                <i className={`fa-regular ${isCopied ? 'fa-circle-check text-green-600' : 'fa-copy'}`}></i>
            </button>
        </div>
    );
};

const TransportStepsSummary: React.FC<{ steps: Step[] }> = ({ steps }) => (
    <div className="flex items-center space-x-1">
        {steps.map((step, index) => (
            <React.Fragment key={index}>
                <div 
                    className={`flex h-6 w-6 items-center justify-center rounded-full ${transportColors[step.transportType]}`}
                    title={step.transportType}
                    aria-label={`Paso de transporte: ${step.transportType}`}
                >
                    <i className={`${transportIcons[step.transportType]} text-xs`} />
                </div>
                {index < steps.length - 1 && <i className="fa-solid fa-chevron-right text-gray-300 text-xs" />}
            </React.Fragment>
        ))}
    </div>
);

const AccommodationDetails: React.FC<{ accommodations: Accommodation[] }> = ({ accommodations }) => (
    <div className="p-4 bg-gray-50 border-t border-gray-200">
        <p className="text-sm text-gray-600 mb-3">Como no hay una ruta de vuelta clara para el mismo día, aquí tienes algunas opciones de alojamiento:</p>
        <ul className="space-y-3">
            {accommodations.map((acc, index) => (
                <li key={index} className="text-sm bg-white p-3 rounded-lg border border-gray-200">
                    <p className="font-semibold text-gray-800">{acc.name} <span className="text-xs font-normal text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full ml-1">{acc.type}</span></p>
                    <p className="text-sm text-teal-600 font-medium mt-1 truncate flex items-center gap-2">
                        <i className="fa-solid fa-phone-volume text-xs text-gray-400" aria-hidden="true"></i>
                        <span>{acc.contactDetails}</span>
                    </p>
                    {acc.notes && <p className="text-xs italic text-gray-500 mt-2 pt-2 border-t border-gray-100">{acc.notes}</p>}
                </li>
            ))}
        </ul>
    </div>
);


const StepDetails: React.FC<{ step: Step }> = ({ step }) => {
    const [areStopsVisible, setAreStopsVisible] = useState(false);
    const hasIntermediateStops = step.intermediateStops && step.intermediateStops.length > 0;

    const bookingAction = () => {
        switch(step.bookingInfo.type) {
            case BookingType.WEB:
                const url = step.bookingInfo.details.startsWith('http') ? step.bookingInfo.details : `https://${step.bookingInfo.details}`;
                return <a href={url} target="_blank" rel="noopener noreferrer" className="font-medium text-teal-600 hover:text-teal-500 truncate">{step.bookingInfo.details}</a>;
            case BookingType.PHONE:
                return <PhoneNumber phone={step.bookingInfo.details} />;
            case BookingType.EMAIL:
                return <a href={`mailto:${step.bookingInfo.details}`} className="font-medium text-teal-600 hover:text-teal-500 truncate">{step.bookingInfo.details}</a>;
            default:
                return <span className="text-gray-700 truncate">{step.bookingInfo.details}</span>;
        }
    }
    
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${step.originCoords.lat},${step.originCoords.lng}`;

    return (
        <div className="relative pl-8">
            <div className={`absolute left-0 top-1.5 h-full border-l-2 ${step.transportType === TransportType.WALK ? 'border-dashed border-gray-400' : 'border-teal-500'}`}></div>
            <div className={`absolute left-[-9px] top-1.5 flex h-5 w-5 items-center justify-center rounded-full ${transportColors[step.transportType] || 'bg-gray-100 text-gray-800'}`} title={step.transportType} aria-label={`Medio de transporte: ${step.transportType}`}>
                <i className={`${transportIcons[step.transportType]} text-xs`} aria-hidden="true"></i>
            </div>
            <div className="ml-4 pb-8">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-bold text-gray-800">{step.origin} <i className="fa-solid fa-arrow-right-long text-xs mx-1 text-gray-400"></i> {step.destination}</p>
                        <p className="text-xs text-gray-500">{step.company} {step.line && `- Línea ${step.line}`}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                        {step.price > 0 && (
                            <div 
                                className="font-semibold text-gray-800 relative"
                                title={step.transportType === TransportType.TAXI ? "Coste estimado" : ""}
                            >
                                {step.transportType === TransportType.TAXI && <span className="absolute -left-3 top-0.5 text-xs font-normal">~</span>}
                                <span>{step.price.toFixed(2)}€</span>
                            </div>
                        )}
                        <p className="text-xs text-gray-500">{step.duration}</p>
                    </div>
                </div>
                <div className="flex text-xs text-gray-600 mt-1">
                    <p><i className="fa-regular fa-clock mr-1.5" aria-hidden="true"></i> {step.departureTime} - {step.arrivalTime}</p>
                </div>
                <div className="flex items-center text-xs text-gray-500 mt-2 space-x-4">
                    {step.approximateWaitingTime && (
                        <span title="Tiempo de espera estimado" className="inline-flex items-center">
                            <i className="fa-regular fa-hourglass-half mr-1.5 text-orange-500" aria-hidden="true"></i>
                            Espera:&nbsp;
                            <span className={`font-medium ${
                                parseInt(step.approximateWaitingTime, 10) > 15
                                ? 'bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md'
                                : 'text-gray-700'
                            }`}>
                                {step.approximateWaitingTime}
                            </span>
                        </span>
                    )}
                    {step.estimatedTravelTime && (
                        <span title="Tiempo de viaje en movimiento">
                            <i className="fa-solid fa-stopwatch mr-1.5 text-sky-500" aria-hidden="true"></i>
                            Viaje: <span className="font-medium text-gray-700">{step.estimatedTravelTime}</span>
                        </span>
                    )}
                </div>

                {hasIntermediateStops && (
                    <div className="mt-3">
                        <button
                            onClick={() => setAreStopsVisible(prev => !prev)}
                            className="w-full flex justify-between items-center text-left text-xs font-medium text-gray-600 hover:text-gray-900 py-1"
                            aria-expanded={areStopsVisible}
                            aria-controls={`stops-${step.origin}-${step.destination}`}
                        >
                            <span className="flex items-center">
                                <i className="fa-solid fa-list-ol mr-2 text-gray-400" aria-hidden="true"></i>
                                Ver {step.intermediateStops.length} paradas intermedias
                            </span>
                            <i className={`fa-solid fa-chevron-down transition-transform ${areStopsVisible ? 'rotate-180' : ''}`} aria-hidden="true"></i>
                        </button>
                        {areStopsVisible && (
                            <ul id={`stops-${step.origin}-${step.destination}`} className="mt-2 pl-5 border-l-2 border-dotted border-gray-300 space-y-3 py-2">
                                {step.intermediateStops.map((stop, index) => (
                                    <li key={index} className="relative">
                                        <div className="absolute -left-[1.1rem] top-1 h-3 w-3 bg-gray-300 rounded-full border-2 border-white" aria-hidden="true"></div>
                                        <p className="text-xs font-medium text-gray-800">{stop.name}</p>
                                        <p className="text-xs text-gray-500">
                                            Llegada: {stop.arrivalTime}
                                            {stop.departureTime && ` | Salida: ${stop.departureTime}`}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
                 
                 <div className="mt-3 bg-gray-50 p-3 rounded-md text-sm">
                    <div className="flex items-start space-x-3">
                        <i className={`${bookingIcons[step.bookingInfo.type]} mt-1 text-teal-600 w-4 text-center`} aria-hidden="true"></i>
                        <div>
                            <h4 className="font-semibold text-gray-800">Reserva y contacto</h4>
                            <div className="text-xs text-gray-600">{bookingAction()}</div>
                            {step.bookingInfo.notes && <p className="text-xs text-gray-500 mt-1 italic">{step.bookingInfo.notes}</p>}
                        </div>
                    </div>
                    {step.bookingInfo.fareInfo && (
                        <div className="flex items-start space-x-3 pt-3 mt-3 border-t border-gray-200">
                            <i className="fa-solid fa-tags mt-1 text-gray-500 w-4 text-center" aria-hidden="true"></i>
                            <div>
                                <h5 className="font-semibold text-gray-800">Tarifas disponibles</h5>
                                <p className="text-xs text-gray-600">{step.bookingInfo.fareInfo}</p>
                            </div>
                        </div>
                    )}
                    <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap gap-2">
                        {step.bookingInfo.type === BookingType.WEB && (
                            <a 
                                href={step.bookingInfo.details.startsWith('http') ? step.bookingInfo.details : `https://${step.bookingInfo.details}`}
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 hover:bg-blue-200 transition-colors"
                            >
                                <i className="fa-solid fa-globe" aria-hidden="true"></i>
                                Reservar en la web
                            </a>
                        )}
                        {step.bookingInfo.type === BookingType.PHONE && (
                            <a 
                                href={`tel:${step.bookingInfo.details.replace(/\s/g, '')}`} 
                                className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 hover:bg-green-200 transition-colors"
                            >
                                <i className="fa-solid fa-phone" aria-hidden="true"></i>
                                Llamar para reservar
                            </a>
                        )}
                        {step.transportType === TransportType.TAXI && (
                             <a 
                                href={mapUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-800 hover:bg-sky-200 transition-colors"
                            >
                                <i className="fa-solid fa-map-location-dot" aria-hidden="true"></i>
                                Ver en mapa
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


export const RouteCard: React.FC<RouteCardProps> = ({ route, isSelected, onSelect, isSubscribed, onToggleSubscription }) => {
    const hasAccommodation = route.accommodationSuggestions && route.accommodationSuggestions.length > 0;
    const [isCopied, setIsCopied] = useState(false);
    const [isAccommodationVisible, setIsAccommodationVisible] = useState(false);

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation(); 

        const shareText = `Ruta de viaje por Teruel: ${route.summary}. Duración: ${route.totalDuration}, Precio: ${route.totalPrice.toFixed(2)}€.`;
        const shareData = {
            title: 'Plan de Viaje - Teruel',
            text: shareText,
            url: window.location.href,
        };

        if (navigator.share) {
            navigator.share(shareData).catch(err => {
                if (err.name !== 'AbortError') console.error(err);
            });
        } else {
            navigator.clipboard.writeText(`${shareText}\nEncuentra tu ruta en: ${window.location.href}`)
                .then(() => {
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                })
                .catch(console.error);
        }
    };

    const handleToggleSubscription = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleSubscription(route);
    };

    return (
        <div 
            onClick={() => onSelect(route)}
            className={`bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 cursor-pointer ${isSelected ? 'shadow-2xl ring-2 ring-teal-500' : 'hover:shadow-xl'}`}
            role="button"
            tabIndex={0}
            aria-label={`Seleccionar ruta: ${route.summary}`}
            onKeyPress={(e) => e.key === 'Enter' && onSelect(route)}
        >
            <div className={`p-4 border-b border-gray-200 transition-colors ${isSelected ? 'bg-teal-50' : 'bg-white'}`}>
                <div className="flex justify-between items-start gap-3">
                    <h3 className="font-bold text-lg text-gray-800 flex-grow">{route.summary}</h3>
                    <div className="flex-shrink-0 flex items-center gap-2">
                        <button
                            onClick={handleToggleSubscription}
                            className={`px-3 py-1.5 text-sm rounded-md transition-all duration-200 flex items-center ${
                                isSubscribed 
                                ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' 
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                            aria-label={isSubscribed ? "Anular suscripción a alertas de esta ruta" : "Recibir alertas sobre esta ruta"}
                            title={isSubscribed ? "Anular suscripción a alertas" : "Recibir alertas de esta ruta"}
                        >
                            <i className={`${isSubscribed ? 'fa-solid' : 'fa-regular'} fa-bell`} aria-hidden="true"></i>
                        </button>
                        <button
                            onClick={handleShare}
                            className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 flex items-center whitespace-nowrap ${
                                isCopied 
                                ? 'bg-green-600 text-white' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                            aria-label={isCopied ? "Enlace copiado al portapapeles" : "Compartir esta ruta"}
                            title={isCopied ? "¡Copiado al portapapeles!" : "Compartir ruta"}
                        >
                            <i className={`fa-solid ${isCopied ? 'fa-check' : 'fa-share-nodes'} mr-1.5`} aria-hidden="true"></i>
                            {isCopied ? 'Copiado' : 'Compartir'}
                        </button>
                    </div>
                </div>
                 {route.notes && <p className="text-xs text-amber-800 bg-amber-100 p-2 rounded-md mt-3 italic"><i className="fa-solid fa-circle-info mr-2" aria-hidden="true"></i>{route.notes}</p>}
                
                <div className="mt-4 flex justify-between items-center">
                    <TransportStepsSummary steps={route.steps} />
                    <div className="flex items-center gap-x-4 text-sm text-gray-600">
                        <span title="Duración total"><i className="fa-regular fa-clock mr-1.5" aria-hidden="true"></i> {route.totalDuration}</span>
                        <span className="font-semibold text-base text-teal-700" title="Precio total estimado"><i className="fa-solid fa-euro-sign mr-1" aria-hidden="true"></i> {route.totalPrice.toFixed(2)}</span>
                    </div>
                </div>
            </div>
            
            {hasAccommodation && (
                <div className="border-t border-gray-200">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsAccommodationVisible(prev => !prev);
                        }}
                        className="w-full text-left p-4 bg-blue-50 hover:bg-blue-100 transition-colors flex justify-between items-center"
                        aria-expanded={isAccommodationVisible}
                        aria-controls={`accommodation-details-${route.summary.replace(/\s/g, '-')}`}
                    >
                        <span className="font-semibold text-blue-800 flex items-center text-sm">
                            <i className="fa-solid fa-bed mr-2.5" aria-hidden="true"></i>
                            Alojamiento Sugerido en {route.steps[route.steps.length - 1].destination}
                        </span>
                        <i className={`fa-solid fa-chevron-down text-blue-600 transition-transform ${isAccommodationVisible ? 'rotate-180' : ''}`} aria-hidden="true"></i>
                    </button>
                    {isAccommodationVisible && (
                        <div id={`accommodation-details-${route.summary.replace(/\s/g, '-')}`}>
                            <AccommodationDetails 
                                accommodations={route.accommodationSuggestions!} 
                            />
                        </div>
                    )}
                </div>
            )}

            {isSelected && (
                 <div className="p-4 bg-gray-50/50">
                    <div className="flow-root">
                         {route.steps.map((step, index) => (
                            <StepDetails key={index} step={step} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
