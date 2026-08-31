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
app.use(cors());
app.use(express.json({ limit: '350mb' }));
app.use(express.urlencoded({ extended: true, limit: '350mb' }));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// API routes
app.use('/api', plagRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0', engine: 'js-plagcheck' });
});

app.listen(PORT, () => {
  console.log(`[MERN Server] Server listening on port ${PORT}`);
});

module.exports = app;
