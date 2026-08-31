const fs = require('fs').promises;
const path = require('path');

// NOTE: pdf-parse and mammoth are lazy-loaded inside functions
// to avoid Vercel cold-start crashes caused by top-level require()

const readTxt = async (filepath) => {
  return await fs.readFile(filepath, 'utf8');
};

const readPdf = async (filepath) => {
  // Lazy-load pdf-parse only when needed — prevents Vercel startup crash
  const pdfParse = require('pdf-parse');
  const buffer = await fs.readFile(filepath);
  const data = await pdfParse(buffer);
  return data.text || '';
};

const readDocx = async (filepath) => {
  // Lazy-load mammoth only when needed
  const mammoth = require('mammoth');
  const result = await mammoth.extractRawText({ path: filepath });
  return result.value || '';
};

const readFile = async (filepath, originalName) => {
  const ext = path.extname(originalName || filepath).toLowerCase();
  if (ext === '.txt') {
    return await readTxt(filepath);
  } else if (ext === '.pdf') {
    return await readPdf(filepath);
  } else if (ext === '.docx') {
    return await readDocx(filepath);
  } else {
    throw new Error(`Unsupported format: '${ext}'. Use TXT, PDF, or DOCX.`);
  }
};

module.exports = { readFile };
