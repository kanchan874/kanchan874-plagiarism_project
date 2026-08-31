const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const Report = require('../models/Report');
const dbConfig = require('../config/db');
const { searchWebEngine, fetchWebTexts } = require('../utils/search');
const { tokenizeSentences, getSentenceSimilarity } = require('../utils/similarity');

const RESULTS_DIR = path.join(__dirname, '..', 'results');

// Ensure results directory exists
(async () => {
  try {
    if (!process.env.VERCEL) {
      await fs.mkdir(RESULTS_DIR, { recursive: true });
    }
  } catch (err) {}
})();

/**
 * Performs core sentence-by-sentence plagiarism analysis against web sources
 */
const compareText = async (text, searchWeb = true) => {
  if (!text || !text.trim()) {
    throw new Error("Document text is empty or unreadable.");
  }

  // 1. Tokenize document sentences
  const origSentences = tokenizeSentences(text);
  if (origSentences.length === 0) {
    throw new Error("Document does not contain enough sentences to analyze.");
  }

  const totalWords = text.split(/\s+/).filter(w => w.length > 0).length;
  const totalChars = text.length;

  // 2. Gather candidates for Web Search
  let webTexts = {};
  const searchResults = [];
  const searchUrls = new Set();

  if (searchWeb) {
    // Select up to 8 descriptive sentences (length 8-30 words)
    const candidates = origSentences.filter(s => {
      const words = s.split(/\s+/).filter(w => w.length > 0).length;
      return words >= 8 && words <= 30;
    });

    if (candidates.length > 0) {
      // Pick evenly spaced queries
      const step = Math.max(1, Math.floor(candidates.length / 8));
      const queries = [];
      for (let i = 0; i < candidates.length; i += step) {
        if (queries.length >= 8) break;
        queries.push(candidates[i]);
      }

      // Search queries in parallel
      const searchPromises = queries.map(q => searchWebEngine(q, 3));
      const searchOutputs = await Promise.all(searchPromises);

      searchOutputs.forEach(results => {
        results.forEach(r => {
          searchResults.push(r);
          searchUrls.add(r.url);
        });
      });

      // Scrape top 8 unique websites in parallel
      const targetUrls = Array.from(searchUrls).slice(0, 8);
      if (targetUrls.length > 0) {
        webTexts = await fetchWebTexts(targetUrls);
      }
    }
  }

  // 3. Compile Reference Corpus (Downloaded text & search snippets fallback)
  const referenceCorpus = {};

  // Add successfully downloaded full web texts
  Object.keys(webTexts).forEach(url => {
    referenceCorpus[url] = tokenizeSentences(webTexts[url]);
  });

  // Fallback to snippets for pages that failed to download
  searchResults.forEach(r => {
    const url = r.url;
    if (!referenceCorpus[url] && r.snippet && r.snippet.trim()) {
      referenceCorpus[url] = tokenizeSentences(r.snippet);
    }
  });

  // 4. Sentence-by-sentence comparison
  const sentenceResults = [];
  const threshold = 0.45;

  for (const s1 of origSentences) {
    const s1Words = s1.split(/\s+/).filter(w => w.length > 0).length;
    let bestScore = 0.0;
    let bestSource = null;
    let bestMatchSentence = null;

    // Analyze sentences with at least 5 words to prevent false positives
    if (s1Words >= 5) {
      for (const sourceName of Object.keys(referenceCorpus)) {
        const refSents = referenceCorpus[sourceName];
        for (const s2 of refSents) {
          const s2Words = s2.split(/\s+/).filter(w => w.length > 0).length;
          if (s2Words < 5) continue;

          const score = getSentenceSimilarity(s1, s2);
          if (score > bestScore) {
            bestScore = score;
            bestSource = sourceName;
            bestMatchSentence = s2;
          }
        }
      }
    }

    const isPlagiarized = bestScore >= threshold;
    sentenceResults.push({
      text: s1,
      plagiarized: isPlagiarized,
      similarity: isPlagiarized ? Math.round(bestScore * 1000) / 10 : null,
      source: isPlagiarized ? bestSource : null,
      source_text: isPlagiarized ? bestMatchSentence : null
    });
  }

  // 5. Calculate plagiarism statistics (weighted by word count)
  let plagiarizedWordCount = 0;
  sentenceResults.forEach(s => {
    if (s.plagiarized) {
      plagiarizedWordCount += s.text.split(/\s+/).filter(w => w.length > 0).length;
    }
  });

  let similarityPercentage = 0.0;
  if (totalWords > 0) {
    similarityPercentage = Math.round((plagiarizedWordCount / totalWords) * 1000) / 10;
  }
  const uniquePercentage = Math.round((100.0 - similarityPercentage) * 10) / 10;

  // 6. Summarize matching source statistics
  const sourceStats = {};
  sentenceResults.forEach(s => {
    if (s.plagiarized && s.source) {
      const src = s.source;
      const words = s.text.split(/\s+/).filter(w => w.length > 0).length;
      if (!sourceStats[src]) {
        sourceStats[src] = {
          source: src,
          match_count: 0,
          matched_words: 0
        };
      }
      sourceStats[src].match_count += 1;
      sourceStats[src].matched_words += words;
    }
  });

  const allSources = [];
  let bestMatchFile = null;
  let maxWordsMatched = 0;

  Object.keys(sourceStats).forEach(src => {
    const stats = sourceStats[src];
    const percentage = totalWords > 0 ? Math.round((stats.matched_words / totalWords) * 1000) / 10 : 0.0;
    allSources.push({
      source: src,
      match_count: stats.match_count,
      percentage
    });
    if (stats.matched_words > maxWordsMatched) {
      maxWordsMatched = stats.matched_words;
      bestMatchFile = src;
    }
  });

  // Sort sources by match percentage descending
  allSources.sort((a, b) => b.percentage - a.percentage);

  return {
    similarity: similarityPercentage,
    unique_percentage: uniquePercentage,
    matched_file: bestMatchFile,
    status: similarityPercentage >= 30.0 ? 'plagiarised' : 'clean',
    word_count: totalWords,
    char_count: totalChars,
    sentences: sentenceResults,
    all_sources: allSources
  };
};

/**
 * Endpoint controller: processes paste text or file uploads
 */
const checkPlagiarism = async (req, res) => {
  try {
    let text = "";
    let filename = "Direct Paste Text";

    // Extract paste text
    if (req.body.paste_text) {
      text = req.body.paste_text.trim();
    } else if (req.file) {
      // Handle file upload extraction
      filename = req.file.originalname;
      const { readFile } = require('../utils/extractor');
      text = await readFile(req.file.path, filename);
      // Clean up uploaded file
      try {
        await fs.unlink(req.file.path);
      } catch (e) {}
    } else if (req.body.text) {
      // JSON API payload
      text = req.body.text.trim();
    }

    if (!text || text.length < 50) {
      return res.status(400).json({ error: "Document must contain at least 50 characters." });
    }

    const searchWeb = req.body.search_web !== false && req.body.search_web !== 'false';
    const analysis = await compareText(text, searchWeb);

    const resultId = crypto.randomBytes(6).toString('hex');
    const reportData = {
      result_id: resultId,
      filename,
      ...analysis
    };

    // Save report payload
    if (dbConfig.isConnected()) {
      await new Report(reportData).save();
    } else {
      if (!process.env.VERCEL) {
        const filepath = path.join(RESULTS_DIR, `${resultId}.json`);
        await fs.writeFile(filepath, JSON.stringify(reportData, null, 2), 'utf8');
      } else {
        console.warn("[Vercel] Database is offline; cannot save local fallback JSON report on read-only filesystem.");
      }
    }

    res.json({
      result_id: resultId,
      similarity: reportData.similarity,
      unique_percentage: reportData.unique_percentage,
      status: reportData.status,
      filename: reportData.filename
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Endpoint controller: retrieves report payload by ID
 */
const getReport = async (req, res) => {
  const resultId = req.params.resultId;
  try {
    let report = null;

    if (dbConfig.isConnected()) {
      report = await Report.findOne({ result_id: resultId });
    }

    if (!report) {
      // Fallback: check file storage
      const filepath = path.join(RESULTS_DIR, `${resultId}.json`);
      try {
        const fileContent = await fs.readFile(filepath, 'utf8');
        report = JSON.parse(fileContent);
      } catch (err) {
        return res.status(404).json({ error: "Plagiarism report not found." });
      }
    }

    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  checkPlagiarism,
  getReport
};
