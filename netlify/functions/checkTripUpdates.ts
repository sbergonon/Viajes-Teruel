import { GoogleGenAI, Type } from "@google/genai";
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        message: {
            type: Type.STRING,
            description: "A short, plausible status update for the trip. Can be a delay, cancellation, schedule change, or a confirmation that everything is on time."
        }
    },
    required: ['message']
};

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { subscription } = JSON.parse(event.body || '{}');

        if (!subscription) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing subscription details' }) };
        }

        const prompt = `
            Actúa como un sistema de alertas de transporte público para la provincia de Teruel.
            He recibido una solicitud para comprobar el estado de un viaje planificado:
            - Ruta: ${subscription.summary}
            - Origen: ${subscription.origin}
            - Destino: ${subscription.destination}
            - Fecha: ${subscription.date}

            Genera una actualización de estado CONCISA y REALISTA para este viaje.
            Tienes tres opciones, elige una de forma aleatoria pero con sentido:
            1. (50% de probabilidad) No hay incidencias: "Todo en orden. El servicio opera según lo previsto." o similar.
            2. (40% de probabilidad) Un retraso menor: "Retraso de 15 minutos en el bus de las 10:30 debido a tráfico." o algo específico y creíble.
            3. (10% de probabilidad) Una cancelación o cambio importante: "AVISO: La línea de bus entre ${subscription.origin} y ${subscription.destination} ha sido cancelada por obras. Se recomienda usar taxi."

            La respuesta debe ser creíble para un usuario real. Usa un tono informativo.
            La respuesta DEBE seguir el esquema JSON proporcionado.
        `;
        
        const systemInstruction = "Eres un sistema automático de información de tráfico y transporte. Generas alertas concisas y realistas en formato JSON.";

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema,
                temperature: 0.9,
            },
        });

        const jsonText = response.text.trim();
        const update = JSON.parse(jsonText);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*', 
            },
            body: JSON.stringify(update),
        };

    } catch (error) {
        console.error("Error in checkTripUpdates function:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to generate update from AI." }),
        };
    }
};

export { handler };
