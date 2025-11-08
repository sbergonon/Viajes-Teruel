
import { GoogleGenAI, Type } from "@google/genai";
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const geoPointSchema = {
    type: Type.OBJECT,
    description: "Coordenadas geográficas (latitud, longitud).",
    properties: {
        lat: { type: Type.NUMBER, description: "Latitud" },
        lng: { type: Type.NUMBER, description: "Longitud" }
    },
    required: ['lat', 'lng']
};

const accommodationSchema = {
    type: Type.OBJECT,
    description: "Sugerencia de alojamiento.",
    properties: {
        name: { type: Type.STRING, description: "Nombre del alojamiento." },
        type: { type: Type.STRING, description: "Tipo de alojamiento (ej: 'Hotel', 'Casa Rural', 'Hostal')." },
        contactDetails: { type: Type.STRING, description: "Detalles de contacto (teléfono, email o web)." },
        notes: { type: Type.STRING, description: "Notas adicionales sobre el alojamiento." }
    },
    required: ['name', 'type', 'contactDetails']
};

const intermediateStopSchema = {
    type: Type.OBJECT,
    description: "Una parada intermedia en un trayecto.",
    properties: {
        name: { type: Type.STRING, description: "Nombre de la parada." },
        arrivalTime: { type: Type.STRING, description: "Hora de llegada a la parada." },
        departureTime: { type: Type.STRING, description: "Hora de salida de la parada (si es diferente a la de llegada)." }
    },
    required: ['name', 'arrivalTime']
};

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        routes: {
            type: Type.ARRAY,
            description: "Lista de posibles rutas para el viaje. Ofrece al menos 2 o 3 si es posible.",
            items: {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING, description: "Resumen corto de la ruta, ej: 'Bus a Albarracín y Taxi a Gea' o 'Taxis en Albarracín'" },
                    totalDuration: { type: Type.STRING, description: "Duración total del viaje, ej: '2h 15m'" },
                    totalPrice: { type: Type.NUMBER, description: "Coste total estimado del viaje en Euros." },
                    notes: { type: Type.STRING, description: "Notas adicionales importantes sobre la ruta, como 'Esta ruta solo opera en días laborables' o 'El taxi debe reservarse con antelación'." },
                    steps: {
                        type: Type.ARRAY,
                        description: "Pasos individuales que componen la ruta.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                transportType: { type: Type.STRING, enum: ['Bus', 'Train', 'Taxi', 'Walk'], description: "Tipo de transporte." },
                                origin: { type: Type.STRING, description: "Lugar de inicio del paso." },
                                destination: { type: Type.STRING, description: "Lugar de fin del paso." },
                                departureTime: { type: Type.STRING, description: "Hora de salida, ej: '09:30'" },
                                arrivalTime: { type: Type.STRING, description: "Hora de llegada, ej: '10:45'" },
                                duration: { type: Type.STRING, description: "Duración del paso, ej: '1h 15m'" },
                                company: { type: Type.STRING, description: "Nombre de la compañía de transporte (ej: 'Tezasa', 'Renfe', 'Taxi Local')." },
                                line: { type: Type.STRING, description: "Número o nombre de la línea si aplica." },
                                price: { type: Type.NUMBER, description: "Precio estimado del paso en Euros. Para taxis, un rango estimado." },
                                bookingInfo: {
                                    type: Type.OBJECT,
                                    properties: {
                                        type: { type: Type.STRING, enum: ['Web', 'Phone', 'Email', 'OnSite', 'NotAvailable'], description: "Método de reserva." },
                                        details: { type: Type.STRING, description: "URL, número de teléfono, email o 'Comprar en taquilla'. Para taxis, el número local." },
                                        notes: { type: Type.STRING, description: "Notas sobre la reserva, ej: 'Se recomienda reservar online para mejor precio'." },
                                        fareInfo: { type: Type.STRING, description: "Si el transporte es Bus o Tren, describe los tipos de billetes disponibles (ej: 'Billete sencillo', 'Ida y vuelta', 'Tarjeta Lazo'). Es opcional." }
                                    },
                                    required: ['type', 'details']
                                },
                                originCoords: geoPointSchema,
                                destinationCoords: geoPointSchema,
                                estimatedTravelTime: { type: Type.STRING, description: "Tiempo estimado de viaje puro, sin contar paradas. Ej: '1h 5m'" },
                                approximateWaitingTime: { type: Type.STRING, description: "Tiempo de espera aproximado antes de este paso. Para el primer paso es '0m'. Para los siguientes, es el tiempo entre la llegada del paso anterior y la salida de este. Ej: '25m'" },
                                intermediateStops: {
                                    type: Type.ARRAY,
                                    description: "Lista de paradas intermedias importantes durante este paso.",
                                    items: intermediateStopSchema
                                }
                            },
                            required: ['transportType', 'origin', 'destination', 'departureTime', 'arrivalTime', 'duration', 'price', 'bookingInfo', 'originCoords', 'destinationCoords', 'estimatedTravelTime', 'approximateWaitingTime']
                        },
                    },
                    accommodationSuggestions: {
                        type: Type.ARRAY,
                        description: "Sugerencias de alojamiento si no hay ruta de vuelta el mismo día y el usuario lo solicitó.",
                        items: accommodationSchema
                    },
                },
                required: ['summary', 'totalDuration', 'totalPrice', 'steps']
            }
        }
    },
    required: ['routes']
};

const FUNCTION_TIMEOUT = 25000; // 25 segundos, para dar tiempo a consultas complejas

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
        };
    }

    try {
        const { origin, destination, date, passengers, isOnDemand, isWheelchairAccessible, isTaxiOnDemand, findAccommodation, originCoords } = JSON.parse(event.body || '{}');

        if (!origin || !destination || !date || !passengers) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing required fields' }),
            };
        }
        
        const isTaxiOnlySearch = origin.trim().toLowerCase() === destination.trim().toLowerCase() || origin === 'Mi ubicación actual' && isTaxiOnDemand;

        const onDemandInstructions = isOnDemand ? `El usuario ha solicitado priorizar el transporte a demanda (autobuses con reserva telefónica). Incluye estas opciones si son viables.` : "";
        const accessibilityInstructions = isWheelchairAccessible ? `El taxi DEBE ser accesible para silla de ruedas.` : "";
        const taxiOnDemandInstructions = isTaxiOnDemand ? `El usuario busca específicamente taxis que funcionen bajo demanda, es decir, que se reservan por teléfono. Prioriza este tipo de servicio.` : "";
        const generalTaxiInstructions = isWheelchairAccessible ? `Si se necesita un taxi como parte de una ruta, debe ser accesible para silla de ruedas.` : `Si un tramo no puede cubrirse con bus o tren, sugiere un taxi local, proporcionando el número de teléfono si es posible y un coste estimado.`;
        const accommodationInstructions = findAccommodation ? `Si no existe una combinación de transportes razonable para volver desde ${destination} a ${origin} en el mismo día, busca también sugerencias de alojamiento en ${destination} y planifica la ruta de vuelta para el día siguiente.` : "";
        
        let originInstruction = `desde "${origin}"`;
        if (originCoords && origin === 'Mi ubicación actual') {
            originInstruction = `desde la ubicación geográfica con coordenadas latitud ${originCoords.lat} y longitud ${originCoords.lng}. Primero, debes identificar la localidad o punto de interés conocido más cercano DENTRO DE LA PROVINCIAS DE TERUEL a estas coordenadas y usarlo como punto de partida real para el viaje. Indica en el resumen de la ruta desde qué localidad estás empezando, ej: "Desde cerca de Albarracín a..."`;
        }
        
        const prompt = isTaxiOnlySearch
            ? `
                Busca información de contacto de todos los servicios de taxi que operen en la localidad ${originInstruction}, en la provincia de Teruel, España.
                El usuario busca un taxi para ${passengers} pasajero(s).
                ${accessibilityInstructions}
                ${taxiOnDemandInstructions}
                Tu objetivo es proporcionar una lista útil de contactos para alguien que necesita un taxi en esa zona.
                
                - Proporciona el nombre del taxista o de la compañía si lo conoces.
                - El número de teléfono es la información más importante.
                - Si hay varios taxistas, crea un paso de tipo "Taxi" para cada uno de ellos en la misma ruta.
                - Para cada taxista, proporciona las coordenadas de la localidad en 'originCoords' y 'destinationCoords'.
                - Para cada paso, establece 'estimatedTravelTime' igual a 'duration' y 'approximateWaitingTime' en "0m".
                - La respuesta DEBE seguir el esquema JSON proporcionado. Crea una única ruta con uno o más pasos.
                - Para cada paso (cada taxista), el origen y destino puede ser el nombre de la localidad. El precio puede ser 0 ya que es solo informativo. Lo más importante es la información de contacto en 'bookingInfo'.
            `
            : `
                Planifica un viaje en transporte público ${originInstruction} hasta "${destination}" dentro de la provincia de Teruel, España. El viaje es para ${passengers} pasajero(s) y la fecha del viaje es ${date}.

                ${onDemandInstructions}
                ${generalTaxiInstructions}
                ${accommodationInstructions}

                Es MUY IMPORTANTE que consideres el día de la semana (laborable, sábado, domingo/festivo) que corresponde a la fecha '${date}', ya que los horarios de los autobuses pueden variar drásticamente. Proporciona únicamente los horarios válidos para esa fecha específica.

                Es crucial que **no** asumas que todos los viajes deben pasar por Teruel ciudad a menos que sea el origen, el destino o un transbordo absolutamente necesario. Prioriza siempre las rutas directas o más lógicas entre las localidades, incluso si utilizan líneas de autobús comarcales que no conectan con la capital. Por ejemplo, un viaje entre Villarluengo y Cantavieja debería usar el bus local que las conecta directamente, sin pasar por Teruel.

                Para cada paso del viaje, DEBES proporcionar las coordenadas geográficas (latitud y longitud) tanto para el origen ('originCoords') como para el destino ('destinationCoords'). Esta información es fundamental.
                
                Para los trayectos en bus y tren, si hay paradas intermedias relevantes, lista hasta 5 de las más importantes en 'intermediateStops', cada una con su nombre, hora de llegada y hora de salida si es diferente.

                **IMPORTANTE: INCLUYE EL TREN.** Además de autobuses y taxis, considera activamente la línea de tren regional que cruza la provincia (línea Zaragoza-Teruel-Valencia). Esta es una opción de transporte clave entre localidades mayores como Teruel ciudad, Cella, y otras paradas relevantes. Incluye el tren como parte de las rutas siempre que sea una alternativa lógica. La compañía es Renfe.

                Incluye horarios realistas, precios estimados y, fundamentalmente, cómo comprar o reservar los billetes.
                Si no hay reserva online, proporciona teléfonos o emails de contacto.
                
                Para los pasos de autobús y tren donde la reserva es online o en taquilla, intenta proporcionar información sobre los tipos de billetes disponibles en el campo 'fareInfo' (ej: 'Billete sencillo', 'Ida y vuelta con descuento', 'Se puede usar Tarjeta Lazo').

                Sé muy específico y práctico.
                Si no hay rutas directas, crea rutas con transbordos. Incluye si es necesario caminar un poco entre paradas.
                La información debe ser útil para un turista que no conoce la zona.

                Para cada paso del viaje, además de la duración total ('duration'), calcula y proporciona:
                1. 'estimatedTravelTime': El tiempo que el vehículo está en movimiento, excluyendo paradas intermedias.
                2. 'approximateWaitingTime': El tiempo de espera en la parada/estación antes de que comience este paso. Para el primer paso, este valor debe ser "0m". Para los demás, es la diferencia entre la hora de llegada del paso anterior y la hora de salida de este paso.
            `;
        
        const systemInstruction = "Eres un experto planificador de viajes especializado en el transporte público de la provincia de Teruel, España. Tu conocimiento abarca horarios de autobuses (incluyendo servicios a demanda y días específicos de operación como laborables, sábados o festivos), líneas de tren, y contactos de taxis locales en pueblos pequeños. Eres capaz de generar rutas lógicas, encontrar coordenadas precisas y proporcionar información práctica y fiable. Siempre devuelves la información en el formato JSON especificado.";

        const geminiPromise = ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.2,
            },
        });
        
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Function timed out')), FUNCTION_TIMEOUT)
        );

        const response: any = await Promise.race([geminiPromise, timeoutPromise]);

        const jsonText = response.text.trim();
        const tripPlan = JSON.parse(jsonText);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*', 
            },
            body: JSON.stringify(tripPlan),
        };

    } catch (error) {
        console.error("Error in serverless function:", error);
        if (error.message === 'Function timed out') {
            return {
                statusCode: 504, // Gateway Timeout
                body: JSON.stringify({ error: "La petición ha tardado demasiado en responder." }),
            };
        }
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to generate trip plan from AI." }),
        };
    }
};

export { handler };