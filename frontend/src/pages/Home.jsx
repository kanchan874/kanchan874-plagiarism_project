import React, { useState, useRef, useEffect } from 'react';
import api from '../api';

function Home({ onViewReport }) {
  const [activeTab, setActiveTab] = useState('paste'); // 'paste' or 'upload'
  const [pasteText, setPasteText] = useState('');
  const [file, setFile] = useState(null);
  const [apiKey, setApiKey] = useState('123456');
  const [searchWeb, setSearchWeb] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStep, setProgressStep] = useState(0); // 0 to 4
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);

  // Character and word counters
  const charCount = pasteText.length;
  const wordCount = pasteText.trim() === '' ? 0 : pasteText.trim().split(/\s+/).length;

  const progressMessages = [
    "Extracting document text...",
    "Querying Bing search engine index...",
    "Downloading matching web pages in parallel...",
    "Calculating Jaccard and Cosine sentence similarities...",
    "Generating final plagiarism report payload..."
  ];

  // Simulate progress bar movement during query parsing
  useEffect(() => {
    let interval = null;
    if (loading) {
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) {
            clearInterval(interval);
            return 95;
          }
          // Shift message steps based on progress percent
          const newProgress = prev + Math.floor(Math.random() * 8) + 2;
          const stepIndex = Math.min(4, Math.floor(newProgress / 20));
          setProgressStep(stepIndex);
          return newProgress;
        });
      }, 500);
    } else {
      setProgress(0);
      setProgressStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // File dropzone handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    setError('');
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (!['txt', 'pdf', 'docx'].includes(ext)) {
      setError('File type not allowed. Please upload a TXT, PDF, or DOCX document.');
      return;
    }
    if (selectedFile.size > 300 * 1024 * 1024) {
      setError('File is too large. Maximum allowed size is 300 MB.');
      return;
    }
    setFile(selectedFile);
  };

  // Submit Handler
  const handleAnalyse = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setProgress(5);

    try {
      const headers = { 'X-API-Key': apiKey };
      let response;

      if (activeTab === 'paste') {
        if (wordCount < 10) {
          throw new Error('Please enter at least 10 words to perform plagiarism check.');
        }
        response = await api.post('/api/check', {
          text: pasteText,
          search_web: searchWeb
        }, { headers });
      } else {
        if (!file) {
          throw new Error('Please upload a file to perform check.');
        }
        const formData = new FormData();
        formData.append('file', file);
        formData.append('search_web', searchWeb);
        response = await api.post('/api/upload', formData, {
          headers: {
            ...headers,
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      setProgress(100);
      setTimeout(() => {
        setLoading(false);
        onViewReport(response.data.result_id);
      }, 500);

    } catch (err) {
      setLoading(false);
      const errMsg = err.response?.data?.error || err.message || 'An error occurred during analysis.';
      setError(errMsg);
    }
  };

  return (
    <div>
      {/* ── HERO BANNER ── */}
      <section className="hero">
        <div className="hero-bg">
          <div className="blob blob1"></div>
          <div className="blob blob2"></div>
          <div className="grid-lines"></div>
        </div>
        <div className="hero-content">
          <div className="badge-row">
            <span className="badge">MERN Engine v3.0</span>
            <span className="badge">Realtime Web Indexing</span>
          </div>
          <h1 className="hero-title">
            Detect Plagiarism<br />
            <em>Intelligently.</em>
          </h1>
          <p className="hero-sub">
            Pasted text, TXT, PDF, or DOCX — our engine cross-references your content against the web using real-time search engine queries to identify exact and paraphrased matches.
          </p>
        </div>
      </section>

      {/* ── MAIN CONTAINER ── */}
      <main className="main-wrap">
        <div className="upload-card">
          {/* Steps tracker */}
          <div className="steps">
            <div className={`step ${!loading ? 'active' : ''} ${file || pasteText.length > 50 ? 'done' : ''}`}>
              <div className="step-num">{file || pasteText.length > 50 ? '✓' : '01'}</div>
              <span>Upload or Paste</span>
            </div>
            <div className="step-line"></div>
            <div className={`step ${loading && progressStep < 4 ? 'active' : ''} ${progressStep === 4 ? 'done' : ''}`}>
              <div className="step-num">{progressStep === 4 ? '✓' : '02'}</div>
              <span>Web Retrieval</span>
            </div>
            <div className="step-line"></div>
            <div className={`step ${progress === 100 ? 'active done' : ''}`}>
              <div className="step-num">03</div>
              <span>Match Report</span>
            </div>
          </div>

          {/* Form wrapper */}
          <form onSubmit={handleAnalyse}>
            {/* Input tabs */}
            {!loading && (
              <div className="tab-container">
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'paste' ? 'active' : ''}`}
                  onClick={() => setActiveTab('paste')}
                >
                  Paste Content
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
                  onClick={() => setActiveTab('upload')}
                >
                  Upload Document
                </button>
              </div>
            )}

            {/* Paste Text Field */}
            {!loading && activeTab === 'paste' && (
              <div className="textarea-wrap">
                <textarea
                  className="text-input-field"
                  placeholder="Paste your paragraph or document content here to search for duplicates across the web..."
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                />
                <div className="textarea-footer">
                  <span>{charCount} Characters</span>
                  <span>{wordCount} Words</span>
                </div>
              </div>
            )}

            {/* Document upload dropzone */}
            {!loading && activeTab === 'upload' && (
              <div>
                {!file ? (
                  <div
                    className={`dropzone ${dragActive ? 'dragover' : ''}`}
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current.click()}
                  >
                    <span className="drop-icon">📄</span>
                    <h3 className="drop-title">Drag & drop your document here</h3>
                    <p className="drop-sub">
                      or <span className="file-link">browse local files</span>
                    </p>
                    <div className="file-types">
                      <span className="ft-tag">PDF</span>
                      <span className="ft-tag">DOCX</span>
                      <span className="ft-tag">TXT</span>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      style={{ display: 'none' }}
                      accept=".txt,.pdf,.docx"
                      onChange={handleFileChange}
                    />
                  </div>
                ) : (
                  <div className="file-preview">
                    <span className="fp-icon">
                      {file.name.endsWith('.pdf') ? '📕' : file.name.endsWith('.docx') ? '📘' : '📄'}
                    </span>
                    <div className="fp-info">
                      <div className="fp-name">{file.name}</div>
                      <div className="fp-size">{(file.size / 1024).toFixed(1)} KB</div>
                    </div>
                    <button
                      type="button"
                      className="fp-remove"
                      onClick={() => setFile(null)}
                      title="Remove file"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Options configuration */}
            {!loading && (
              <div className="options-row">
                <div className="flex-1">
                  <div className="key-row">
                    <span className="key-label">⚙ API KEY:</span>
                    <input
                      type="password"
                      className="key-input"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                    <span className="key-status">Active</span>
                  </div>
                </div>
                <div className="mode-toggle-wrap">
                  <label className="checkbox-container">
                    Search Web (Live check)
                    <input
                      type="checkbox"
                      checked={searchWeb}
                      onChange={(e) => setSearchWeb(e.target.checked)}
                    />
                    <span className="checkmark"></span>
                  </label>
                </div>
              </div>
            )}

            {/* Submit check button */}
            {!loading && (
              <button
                type="submit"
                className="btn-check"
                disabled={activeTab === 'paste' ? wordCount < 10 : !file}
              >
                <span>Analyse Document</span>
                <span className="btn-arrow">→</span>
              </button>
            )}

            {/* Progress and status loading display */}
            {loading && (
              <div className="progress-wrap">
                <div className="progress-steps">
                  {progressMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`ps-item ${progressStep === idx ? 'active' : ''} ${progressStep > idx ? 'done' : ''}`}
                    >
                      <div className="ps-dot"></div>
                      <span>{msg}</span>
                    </div>
                  ))}
                </div>
                <div className="progress-bar-wrap">
                  <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}

            {/* Errors display */}
            {error && (
              <div className="error-box">
                <span>⚠</span>
                <span>{error}</span>
              </div>
            )}
          </form>
        </div>

        {/* How it works info mechanics */}
        <section className="how-section">
          <h2 className="how-title">Engine Mechanics</h2>
          <div className="how-grid">
            <div className="how-card">
              <div className="how-num">01</div>
              <h3>Dual Input</h3>
              <p>Paste text directly or drop a document up to 5 MB for comprehensive evaluation.</p>
            </div>
            <div className="how-card">
              <div className="how-num">02</div>
              <h3>Web Retrieval</h3>
              <p>Extracts sentences and queries Bing indexes to locate original sources.</p>
            </div>
            <div className="how-card">
              <div className="how-num">03</div>
              <h3>Parallel Scrape</h3>
              <p>Downloads web matches in parallel to compile a local reference corpus on the fly.</p>
            </div>
            <div className="how-card">
              <div className="how-num">04</div>
              <h3>Deep Search</h3>
              <p>Scans extensive web databases and parses online indexes to find similarities.</p>
            </div>
            <div className="how-card">
              <div className="how-num">05</div>
              <h3>Sequence Matcher</h3>
              <p>Evaluates verbatim overlaps and paraphrased sections using combined Jaccard and Sequence alignments.</p>
            </div>
            <div className="how-card">
              <div className="how-num">06</div>
              <h3>Interactive Report</h3>
              <p>Highlights similarities with interactive clicks, detailing source URLs and matching words.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Home;
