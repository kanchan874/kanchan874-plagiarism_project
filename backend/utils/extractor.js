const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const readTxt = async (filepath) => {
  return await fs.readFile(filepath, 'utf8');
};

const readPdf = async (filepath) => {
  const buffer = await fs.readFile(filepath);
  const { PDFParse } = require('pdf-parse');
  const parser = new PDFParse({ data: buffer });
  const data = await parser.getText();
  return data.text || '';
};

const readDocx = async (filepath) => {
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
