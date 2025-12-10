import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config/env';
import pool from './config/database';
// Routes
import projectRoutes from './routes/project.routes';
import sceneRoutes from "./routes/scene.routes";
import aiRoutes from './routes/ai.routes';
import pexelsRoutes from './routes/pexels.routes';
import voiceRoutes from './routes/voice.routes';
import statusRoutes from './routes/status.routes';
import authRoutes from './routes/auth.routes';
import tenantRoutes from './routes/tenant.routes';
import userRoutes from './routes/user.routes';
import scenarioRoutes from './routes/scenario.routes';
import adminRoutes from './routes/admin.routes';
import pdfRoutes from './routes/pdf.routes';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/login', (req, res) => {
  const htmlPath = path.join(__dirname, '../../frontend/src/assets/login.html');
  res.sendFile(htmlPath);
});

// Serve HTML pages
app.get('/', (req, res) => {
  const htmlPath = path.join(__dirname, '../../frontend/src/assets/video-studio.html');
  res.sendFile(htmlPath);
});

app.get('/projects', (req, res) => {
  const htmlPath = path.join(__dirname, '../../frontend/src/assets/projects.html');
  res.sendFile(htmlPath);
});

app.get('/scene-editor', (req, res) => {
  const htmlPath = path.join(__dirname, '../../frontend/src/assets/scene-editor.html');
  res.sendFile(htmlPath);
});

app.get('/video-studio', (req, res) => {
  const htmlPath = path.join(__dirname, '../../frontend/src/assets/video-studio.html');
  res.sendFile(htmlPath);
});

app.get('/admin/tenants', (req, res) => {
  const htmlPath = path.join(__dirname, '../../frontend/src/assets/admin/tenants.html');
  res.sendFile(htmlPath);
});

app.get('/admin/users', (req, res) => {
  const htmlPath = path.join(__dirname, '../../frontend/src/assets/admin/users.html');
  res.sendFile(htmlPath);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects', sceneRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/pexels', pexelsRoutes);
app.use('/api', voiceRoutes);
app.use('/api', statusRoutes);
app.use('/api/scenarios', scenarioRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/pdf', pdfRoutes);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server
const PORT = config.port || 3000;
app.listen(PORT, async () => {
  console.log('\n🚀 ================================');
  console.log('🎬 Flipick AI Video Studio API');
  console.log('🚀 ================================');
  console.log(`📡 Server: http://localhost:${PORT}`);
  console.log(`🎥 Studio: http://localhost:${PORT}`);
  console.log(`📁 Projects: http://localhost:${PORT}/projects`);
  console.log(`🔍 Health: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${config.nodeEnv}`);
  console.log('🚀 ================================\n');

  // Test database connection
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
});

export default app;
