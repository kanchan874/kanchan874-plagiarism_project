import React, { useState } from 'react';

function Report({ reportData, onViewHome }) {
  const [selectedSentence, setSelectedSentence] = useState(null);
  const [activeTab, setActiveTab] = useState('sources');

  // Auto-select the first plagiarized sentence on load
  React.useEffect(() => {
    if (reportData?.sentences) {
      const firstPlag = reportData.sentences.find(s => s.plagiarized);
      if (firstPlag) setSelectedSentence(firstPlag);
    }
  }, [reportData]);

  if (!reportData) {
    return (
      <div className="report-wrap" style={{ textAlign: 'center', padding: '80px 24px' }}>
        <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>⚠</span>
        <h2 className="pane-title" style={{ marginBottom: '12px' }}>No report available</h2>
        <p className="pane-subtitle" style={{ marginBottom: '24px' }}>Please run a plagiarism check first.</p>
        <button className="pill active" onClick={onViewHome}>Return to Dashboard</button>
      </div>
    );
  }

  const {
    similarity,
    unique_percentage,
    status,
    sentences,
    all_sources,
    filename
  } = reportData;

  // Circular gauge geometry
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * similarity) / 100;

  const getVerdictClass = (pct) => {
    if (pct >= 50) return 'high';
    if (pct >= 20) return 'mid';
    return 'clean';
  };

  const verdictClass = getVerdictClass(similarity);

  // Highlight matching words between two text snippets
  const renderWordDiff = (sentenceText, referenceText) => {
    if (!sentenceText || !referenceText) return sentenceText;
    const cleanWord = (w) => w.toLowerCase().replace(/[^\w]/g, '');
    const sourceWords = new Set(
      referenceText.split(/\s+/).map(cleanWord).filter(w => w.length > 0)
    );
    const tokens = sentenceText.split(/(\s+|[^\w\s]+)/);
    return tokens.map((token, idx) => {
      const cleaned = cleanWord(token);
      if (cleaned && sourceWords.has(cleaned)) {
        return <span key={idx} className="diff-highlight">{token}</span>;
      }
      return token;
    });
  };

  return (
    <div className="report-wrap">
      {/* Header */}
      <div className="report-header">
        <div>
          <span className="rh-meta">Analysis Summary Report</span>
          <h1 className="rh-title">{filename || 'Document Checked'}</h1>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="pill print-hide"
            onClick={() => window.print()}
            style={{
              border: '1px solid var(--accent)',
              color: 'var(--accent)',
              background: 'var(--accent-soft)'
            }}
          >
            🖨 Export PDF
          </button>
          <button className="pill print-hide" onClick={onViewHome}>
            ← Check New Document
          </button>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="report-grid">
        {/* Left — Document Viewer */}
        <div>
          <div className="pane-header">
            <h2>Document Content</h2>
            <span className="pane-subtitle">Click highlighted sentences to inspect matching web sources.</span>
          </div>
          <div className="document-viewer-card">
            <div className="document-text-container">
              {sentences?.map((s, idx) => {
                if (s.plagiarized) {
                  const level = s.similarity >= 70 ? 'high' : s.similarity >= 50 ? 'mid' : 'low';
                  const activeClass = selectedSentence?.text === s.text ? 'active' : '';
                  return (
                    <span
                      key={idx}
                      className={`sent-match level-${level} ${activeClass}`}
                      onClick={() => setSelectedSentence(s)}
                    >
                      {s.text}{' '}
                    </span>
                  );
                }
                return (
                  <span key={idx} className="sent-clean">
                    {s.text}{' '}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right — Inspector Pane */}
        <div className="inspector-pane">
          {/* Score Gauge */}
          <div className="verdict-card">
            <div className="gauge-section">
              <div className="score-ring">
                <svg className="ring-svg">
                  <circle className="ring-bg" cx="48" cy="48" r={radius} />
                  <circle
                    className={`ring-fill verdict-${verdictClass}-ring`}
                    cx="48"
                    cy="48"
                    r={radius}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                  />
                </svg>
                <div className="ring-text">
                  <span className="ring-pct">{similarity}%</span>
                  <span className="ring-label">Plagiarised</span>
                </div>
              </div>
              <div className="gauge-details">
                <div className={`gd-verdict verdict-${status}`}>
                  {similarity >= 30 ? 'Plagiarism Detected' : 'Clean Document'}
                </div>
                <div className="gd-summary">
                  Matched {similarity}% of words to web sources. {unique_percentage}% text is unique.
                </div>
              </div>
            </div>

            <div className="metrics-bar-grid">
              <div className="metric-bar-item">
                <div className="mbi-header">
                  <span>Plagiarised</span>
                  <span style={{ color: 'var(--red)' }}>{similarity}%</span>
                </div>
                <div className="mbi-bar-bg">
                  <div className="mbi-bar-fill" style={{ width: `${similarity}%`, background: 'var(--red)' }}></div>
                </div>
              </div>
              <div className="metric-bar-item">
                <div className="mbi-header">
                  <span>Unique</span>
                  <span style={{ color: 'var(--green)' }}>{unique_percentage}%</span>
                </div>
                <div className="mbi-bar-bg">
                  <div className="mbi-bar-fill" style={{ width: `${unique_percentage}%`, background: 'var(--green)' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Sources List */}
          <div className="verdict-card">
            <div className="tab-selector">
              <button
                className={`tab-sel-btn ${activeTab === 'sources' ? 'active' : ''}`}
                onClick={() => setActiveTab('sources')}
              >
                Top Web Sources ({all_sources?.length || 0})
              </button>
            </div>
            {activeTab === 'sources' && (
              <div className="sources-list">
                {all_sources && all_sources.length > 0 ? (
                  all_sources.map((src, idx) => (
                    <div key={idx} className="source-item">
                      <div className="source-info">
                        <a
                          href={src.source}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="source-link"
                          title="Open URL"
                        >
                          {src.source}
                        </a>
                        <div className="source-badge-row">
                          <span className="source-badge web-source">WEB MATCH</span>
                          <span className="source-matches-tag">{src.match_count} sentences</span>
                        </div>
                      </div>
                      <div className="source-pct">{src.percentage}%</div>
                    </div>
                  ))
                ) : (
                  <div className="empty-inspector">
                    <span className="empty-icon">🔍</span>
                    <p>No matching webpages found.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Match Inspector */}
          <div className="match-inspector-card">
            <div className="pane-header">
              <h2>Match Inspector</h2>
              <span className="pane-subtitle">Select a highlighted sentence to inspect source overlaps.</span>
            </div>
            {selectedSentence ? (
              <div>
                <div className="inspector-source-wrap">
                  <span className="si-label">Source URL:</span>
                  <a
                    href={selectedSentence.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="source-link"
                  >
                    {selectedSentence.source}
                  </a>
                </div>
                <div className="comparison-container">
                  <div className="comp-panel">
                    <span className="cp-label">Your Document</span>
                    <div className="cp-box">
                      {renderWordDiff(selectedSentence.text, selectedSentence.source_text)}
                    </div>
                  </div>
                  <div className="comp-panel">
                    <span className="cp-label">Matching Source Context</span>
                    <div className="cp-box">
                      {renderWordDiff(selectedSentence.source_text, selectedSentence.text)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-inspector">
                <span className="empty-icon">✓</span>
                <p>Select any highlighted sentence to inspect source overlaps.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Report;
