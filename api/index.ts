import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
// Fix: Import `fileURLToPath` to resolve `__dirname` in ES modules.
import { fileURLToPath } from 'url';
import { planTripHandler } from './planTrip';
import { getTripIdeasHandler } from './getTripIdeas';
import { checkTripUpdatesHandler } from './checkTripUpdates';

// Fix: Define `__dirname` for ES module scope.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.post('/api/planTrip', async (req: Request, res: Response) => {
    try {
        const result = await planTripHandler(req.body);
        res.json(result);
    } catch (error) {
        console.error("Error in /api/planTrip:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        if (errorMessage.includes('timed out')) {
            return res.status(504).json({ error: "La petición ha tardado demasiado en responder." });
        }
        res.status(500).json({ error: errorMessage || 'Failed to generate trip plan from AI.' });
    }
});

app.post('/api/getTripIdeas', async (req: Request, res: Response) => {
    try {
        const result = await getTripIdeasHandler();
        res.json(result);
    } catch (error) {
        console.error("Error in /api/getTripIdeas:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        if (errorMessage.includes('timed out')) {
            return res.status(504).json({ error: "La petición de sugerencias ha tardado demasiado." });
        }
        res.status(500).json({ error: errorMessage || 'No se pudieron generar las ideas de viaje.' });
    }
});

app.post('/api/checkTripUpdates', async (req: Request, res: Response) => {
    try {
        const result = await checkTripUpdatesHandler(req.body);
        res.json(result);
    } catch (error) {
        console.error("Error in /api/checkTripUpdates:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: errorMessage || 'Failed to generate update from AI.' });
    }
});

// Define la ruta a la raíz del proyecto para servir archivos estáticos
// __dirname is a global variable in CommonJS that points to the directory of the current module.
// The compiled file is in `dist/api/`, so we go up two levels to find the project root.
const projectRoot = path.join(__dirname, '..', '..');

// Sirve los ficheros estáticos del frontend desde la raíz del proyecto
app.use(express.static(projectRoot));

// Para cualquier otra ruta que no sea de la API, sirve el index.html
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile('index.html', { root: projectRoot });
  }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});