import 'dotenv/config';
import express from 'express';
import path from 'path';
import cors from 'cors';
import videoRoutes from './routes/videoRoutes';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.use('/streams', express.static(path.join(process.cwd(), 'streams')));
app.use('/thumbnails', express.static(path.join(process.cwd(), 'thumbnails')));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/videos', videoRoutes);

app.listen(PORT, () => {
  console.log(`Server running test on http://localhost:${PORT}`);
});
