// FIX: Use express namespace to avoid type conflicts with global types.
// FIX: By explicitly importing Request and Response, we ensure the correct types from Express are used, resolving type conflicts.
import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { planTripHandler } from './planTrip';
import { getTripIdeasHandler } from './getTripIdeas';
import { checkTripUpdatesHandler } from './checkTripUpdates';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
// FIX: Correctly type express middleware.
app.use(express.json());

app.post('/api/planTrip', async (req: Request, res: Response) => {
    try {
        // FIX: Correctly access req.body
        const result = await planTripHandler(req.body);
        // FIX: Correctly use res.json
        res.json(result);
    } catch (error: any) {
        console.error("Error in /api/planTrip:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        if (errorMessage.includes('timed out')) {
            // FIX: Correctly use res.status and res.json
            return res.status(504).json({ error: "La petición ha tardado demasiado en responder." });
        }
        // FIX: Correctly use res.status and res.json
        res.status(500).json({ error: errorMessage || 'Failed to generate trip plan from AI.' });
    }
});

app.post('/api/getTripIdeas', async (req: Request, res: Response) => {
    try {
        const result = await getTripIdeasHandler();
        // FIX: Correctly use res.json
        res.json(result);
    } catch (error: any) {
        console.error("Error in /api/getTripIdeas:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        if (errorMessage.includes('timed out')) {
            // FIX: Correctly use res.status and res.json
            return res.status(504).json({ error: "La petición de sugerencias ha tardado demasiado." });
        }
        // FIX: Correctly use res.status and res.json
        res.status(500).json({ error: errorMessage || 'No se pudieron generar las ideas de viaje.' });
    }
});

app.post('/api/checkTripUpdates', async (req: Request, res: Response) => {
    try {
        // FIX: Correctly access req.body
        const result = await checkTripUpdatesHandler(req.body);
        // FIX: Correctly use res.json
        res.json(result);
    } catch (error: any) {
        console.error("Error in /api/checkTripUpdates:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        // FIX: Correctly use res.status and res.json
        res.status(500).json({ error: errorMessage || 'Failed to generate update from AI.' });
    }
});

// En un entorno como Render, process.cwd() apunta a la raíz del proyecto.
// Esto es más fiable que calcular la ruta desde __dirname.
const projectRoot = process.cwd();

// Servir los ficheros estáticos desde la raíz del proyecto.
// FIX: Correctly type express middleware.
app.use(express.static(projectRoot));

// Para cualquier otra ruta que no sea de la API, servir el index.html para soportar el enrutamiento del lado del cliente (SPA).
app.get('*', (req: Request, res: Response) => {
  // FIX: Correctly access req.path
  if (!req.path.startsWith('/api')) {
    // FIX: Correctly use res.sendFile
    res.sendFile(path.join(projectRoot, 'index.html'));
  } else {
    // Si la ruta empieza con /api pero no fue manejada por las rutas específicas, es un 404.
    // FIX: Correctly use res.status and res.json
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});