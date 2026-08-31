const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { checkPlagiarism, getReport } = require('../controllers/plagController');

// Configure upload folder
const uploadDir = process.env.VERCEL 
  ? '/tmp' 
  : path.join(__dirname, '..', 'uploads');

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 300 * 1024 * 1024 } // 300 MB limit
});

const API_KEY = process.env.API_KEY || '123456';

// Simple API Key authentication middleware
const authenticate = (req, res, next) => {
  const key = req.headers['x-api-key'] || req.body.api_key || req.query.api_key;
  if (key !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized. Invalid or missing API key.' });
  }
  next();
};

router.post('/upload', upload.single('file'), authenticate, checkPlagiarism);
router.post('/check', authenticate, checkPlagiarism);
router.get('/report/:resultId', getReport);

module.exports = router;
