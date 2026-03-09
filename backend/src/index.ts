import express from 'express';
import cors from 'cors';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import authRoutes     from './routes/auth';
import accountRoutes  from './routes/accounts';
import campaignRoutes from './routes/campaigns';
import leadRoutes     from './routes/leads';
import aiRoutes       from './routes/ai';
import oauthRoutes    from './routes/oauth';
import linkedinRoutes from './routes/linkedin';

const app = express();

app.use(cors({ origin: config.FRONTEND_URL || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

app.get('/', (_req, res) => {
  res.json({
    name: 'LinkedIn Manager API',
    version: '2.0.0',
    status: 'running',
    endpoints: {
      health:   '/api/health',
      auth:     '/api/auth',
      accounts: '/api/accounts',
      campaigns:'/api/campaigns',
      leads:    '/api/leads',
      ai:       '/api/ai',
      oauth:    '/api/oauth',
      linkedin: '/api/linkedin',
    },
  });
});

app.get('/health',     (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/auth',     authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/campaigns',campaignRoutes);
app.use('/api/leads',    leadRoutes);
app.use('/api/ai',       aiRoutes);
app.use('/api/oauth',    oauthRoutes);
app.use('/api/linkedin', linkedinRoutes);

app.use(errorHandler);

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: `${req.method} ${req.path} not found` });
});

const PORT = config.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

process.on('SIGTERM', () => { logger.info('SIGTERM'); process.exit(0); });
process.on('SIGINT',  () => { logger.info('SIGINT');  process.exit(0); });
