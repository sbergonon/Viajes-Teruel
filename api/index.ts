import express, { Request, Response } from 'express';
import cors from 'cors';
import { planTripHandler } from './planTrip';
import { getTripIdeasHandler } from './getTripIdeas';
import { checkTripUpdatesHandler } from './checkTripUpdates';

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
        if (error.message.includes('timed out')) {
            return res.status(504).json({ error: "La petición ha tardado demasiado en responder." });
        }
        res.status(500).json({ error: error.message || 'Failed to generate trip plan from AI.' });
    }
});

app.post('/api/getTripIdeas', async (req: Request, res: Response) => {
    try {
        const result = await getTripIdeasHandler();
        res.json(result);
    } catch (error) {
        console.error("Error in /api/getTripIdeas:", error);
        if (error.message.includes('timed out')) {
            return res.status(504).json({ error: "La petición de sugerencias ha tardado demasiado." });
        }
        res.status(500).json({ error: error.message || 'No se pudieron generar las ideas de viaje.' });
    }
});

app.post('/api/checkTripUpdates', async (req: Request, res: Response) => {
    try {
        const result = await checkTripUpdatesHandler(req.body);
        res.json(result);
    } catch (error) {
        console.error("Error in /api/checkTripUpdates:", error);
        res.status(500).json({ error: error.message || 'Failed to generate update from AI.' });
    }
});

// Sirve los ficheros estáticos del frontend desde la raíz
app.use(express.static('./'));

// Para cualquier otra ruta, sirve el index.html para soportar SPA routing si es necesario
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile('index.html', { root: './' });
  }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
