// FIX: Alias express Request and Response to avoid type conflicts with global types.
import express, { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import cors from 'cors';
import path from 'path';
import { planTripHandler } from './planTrip';
import { getTripIdeasHandler } from './getTripIdeas';
import { checkTripUpdatesHandler } from './checkTripUpdates';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.post('/api/planTrip', async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const result = await planTripHandler(req.body);
        res.json(result);
    } catch (error: any) {
        console.error("Error in /api/planTrip:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        if (errorMessage.includes('timed out')) {
            return res.status(504).json({ error: "La petición ha tardado demasiado en responder." });
        }
        res.status(500).json({ error: errorMessage || 'Failed to generate trip plan from AI.' });
    }
});

app.post('/api/getTripIdeas', async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const result = await getTripIdeasHandler();
        res.json(result);
    } catch (error: any) {
        console.error("Error in /api/getTripIdeas:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        if (errorMessage.includes('timed out')) {
            return res.status(504).json({ error: "La petición de sugerencias ha tardado demasiado." });
        }
        res.status(500).json({ error: errorMessage || 'No se pudieron generar las ideas de viaje.' });
    }
});

app.post('/api/checkTripUpdates', async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const result = await checkTripUpdatesHandler(req.body);
        res.json(result);
    } catch (error: any) {
        console.error("Error in /api/checkTripUpdates:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: errorMessage || 'Failed to generate update from AI.' });
    }
});

// __dirname es una variable global en CommonJS que apunta al directorio del módulo actual.
// El fichero compilado está en `dist/api/`, por lo que subimos dos niveles para encontrar la raíz del proyecto.
const projectRoot = path.join(__dirname, '..', '..');

// Sirve los ficheros estáticos del frontend desde la raíz del proyecto
app.use(express.static(projectRoot));

// Para cualquier otra ruta que no sea de la API, sirve el index.html
app.get('*', (req: ExpressRequest, res: ExpressResponse) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile('index.html', { root: projectRoot });
  }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});