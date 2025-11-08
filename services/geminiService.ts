import { TripPlan, GeoPoint, TripIdea, Subscription } from '../types';

export const getTripIdeas = async (signal?: AbortSignal): Promise<TripIdea[]> => {
    try {
        const response = await fetch('/api/getTripIdeas', {
            method: 'POST',
            signal,
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Error getting trip ideas: ${response.statusText}`;
            try {
                const errorBody = JSON.parse(errorText);
                errorMessage = errorBody.error || errorMessage;
            } catch (e) {
                errorMessage = errorText;
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        
        if (!data.ideas || !Array.isArray(data.ideas)) {
            throw new Error("Respuesta de la API de ideas con formato incorrecto.");
        }

        return data.ideas;

    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Fetch for trip ideas aborted');
        } else {
            console.error("Error calling getTripIdeas function:", error);
        }
        throw error;
    }
};

export const planTrip = async (
    origin: string, 
    destination: string, 
    date: string, 
    isOnDemand: boolean, 
    passengers: number, 
    isWheelchairAccessible: boolean, 
    isTaxiOnDemand: boolean, 
    findAccommodation: boolean,
    isUrgent: boolean,
    originCoords: GeoPoint | null,
    signal?: AbortSignal // Se añade el AbortSignal opcional
): Promise<TripPlan> => {
    try {
        const response = await fetch('/api/planTrip', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ origin, destination, date, isOnDemand, passengers, isWheelchairAccessible, isTaxiOnDemand, findAccommodation, isUrgent, originCoords }),
            signal, // Se pasa el signal a la petición fetch
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Error from serverless function: ${response.statusText}`;
            if (errorText) {
                try {
                    const errorBody = JSON.parse(errorText);
                    errorMessage = errorBody.error || errorMessage;
                } catch (e) {
                    // El cuerpo no era JSON, podría ser un error de texto plano del gateway
                    errorMessage = errorText;
                }
            }
            console.error('Serverless function error response:', errorMessage);
            throw new Error(errorMessage);
        }

        const tripPlan = await response.json();
        
        if (!tripPlan.routes || !Array.isArray(tripPlan.routes)) {
            throw new Error("Respuesta de la API con formato incorrecto.");
        }

        return tripPlan;

    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Fetch aborted');
        } else {
            console.error("Error calling serverless function:", error);
        }
        throw error; // Relanzamos el error para que el componente que llama lo maneje
    }
};

export const checkTripUpdates = async (subscription: Subscription, signal?: AbortSignal): Promise<{ message: string }> => {
    try {
        const response = await fetch('/api/checkTripUpdates', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ subscription }),
            signal,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to check for updates.');
        }

        return await response.json();
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Update check aborted');
        } else {
            console.error("Error calling checkTripUpdates function:", error);
        }
        throw error;
    }
};
