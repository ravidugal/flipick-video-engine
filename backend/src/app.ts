import express from 'express';
import cors from 'cors';
import { config } from './config/env';

// Import routes
import aiRoutes from './routes/ai.routes';
import projectRoutes from './routes/project.routes';
import pexelsRoutes from './routes/pexels.routes';

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:4200', 'http://localhost:4201', 'http://localhost:4202'],
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Flipick AI Video API is running' });
});

// API routes
app.use('/api/ai', aiRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/pexels', pexelsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

export default app;
