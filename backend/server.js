require('dotenv').config(); // Load .env FIRST before any other imports
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { connectDB } = require('./config/db');
const plagRoutes = require('./routes/plagRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect Database
connectDB();

// Middlewares — allow all origins (public API)
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-API-Key', 'Authorization'],
};
app.use(cors(corsOptions));
app.options('/(.*)', cors(corsOptions)); // Handle pre-flight for all routes
app.use(express.json({ limit: '350mb' }));
app.use(express.urlencoded({ extended: true, limit: '350mb' }));

// Ensure uploads directory exists (local development only)
if (!process.env.VERCEL) {
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
  }
}

// API routes
app.use('/api', plagRoutes);

// Root route - API info
app.get('/', (req, res) => {
  res.json({
    name: 'PlagCheck API',
    version: '2.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      check: 'POST /api/check',
      upload: 'POST /api/upload',
      report: 'GET /api/report/:id'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0', engine: 'js-plagcheck' });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[MERN Server] Server listening on port ${PORT}`);
  });
}

module.exports = app;
