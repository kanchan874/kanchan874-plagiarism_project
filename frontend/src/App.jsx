import React, { useState } from 'react';
import Home from './pages/Home';
import Report from './pages/Report';

function App() {
  const [view, setView] = useState('home');
  const [reportData, setReportData] = useState(null);

  return (
    <div>
      {/* Navigation Bar */}
      <header className="nav">
        <div className="nav-inner">
          <div className="nav-logo" onClick={() => setView('home')} style={{ cursor: 'pointer' }}>
            Plag<span className="accent">Check</span>
          </div>
          <div className="nav-pills">
            <button 
              className={`pill ${view === 'home' ? 'active' : ''}`}
              onClick={() => setView('home')}
            >
              Checker Dashboard
            </button>
            {reportData && (
              <button 
                className={`pill ${view === 'report' ? 'active' : ''}`}
                onClick={() => setView('report')}
              >
                Latest Analysis
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Panel Views */}
      {view === 'home' ? (
        <Home onViewReport={(data) => {
          setReportData(data);
          setView('report');
        }} />
      ) : (
        <Report reportData={reportData} onViewHome={() => setView('home')} />
      )}
    </div>
  );
}

export default App;
