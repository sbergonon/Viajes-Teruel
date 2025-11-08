import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        ideas: {
            type: Type.ARRAY,
            description: "Lista de 3 ideas de excursiones de un día por la provincia de Teruel.",
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "Un nombre atractivo y corto para la excursión." },
                    description: { type: Type.STRING, description: "Una descripción concisa (2-3 líneas) que resalte lo especial de la ruta." },
                    origin: { type: Type.STRING, description: "La localidad de origen sugerida, normalmente 'Teruel'." },
                    destination: { type: Type.STRING, description: "La localidad principal de destino para la excursión." }
                },
                required: ['title', 'description', 'origin', 'destination']
            }
        }
    },
    required: ['ideas']
};

const FUNCTION_TIMEOUT = 9000;

export const getTripIdeasHandler = async () => {
    const prompt = `
        Actúa como un guía turístico experto en la provincia de Teruel, España. Tu objetivo es inspirar a un viajero que no sabe qué visitar.
        Sugiere exactamente 3 ideas de excursiones de un día.
        
        Para cada idea, proporciona:
        1.  Un título atractivo y corto (ej: "Ruta de los Castillos y Murallas").
        2.  Una descripción breve (2-3 frases) que capture la esencia del lugar y lo que lo hace especial.
        3.  Una localidad de origen, que siempre debe ser "Teruel".
        4.  Una localidad de destino principal para la excursión (ej: "Albarracín").
        
        Asegúrate de que los destinos sean variados y representen diferentes comarcas de la provincia (ej: Albarracín, Matarraña, Gúdar-Javalambre).
        La respuesta DEBE seguir el esquema JSON proporcionado.
    `;
    
    const systemInstruction = "Eres un guía turístico creativo y experto en la provincia de Teruel. Tu misión es generar ideas de viaje inspiradoras y bien estructuradas en formato JSON.";

    const geminiPromise = ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: responseSchema,
            temperature: 0.8,
        },
    });
    
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Function timed out')), FUNCTION_TIMEOUT)
    );

    const response: any = await Promise.race([geminiPromise, timeoutPromise]);

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
};
