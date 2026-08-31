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

// Middlewares
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    // Allow all vercel.app subdomains, localhost, and 127.0.0.1
    const allowed = [
      /\.vercel\.app$/,
      /^http:\/\/localhost(:\d+)?$/,
      /^http:\/\/127\.0\.0\.1(:\d+)?$/,
    ];
    if (allowed.some(pattern => pattern.test(origin))) {
      return callback(null, true);
    }
    // Also allow any custom domain set in FRONTEND_URL env var
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }
    callback(new Error('CORS: Origin not allowed — ' + origin));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-API-Key', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Pre-flight for all routes
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
