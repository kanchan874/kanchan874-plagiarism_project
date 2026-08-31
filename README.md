# PlagCheck — Intelligent Web Plagiarism Detection Platform

PlagCheck is a high-performance, modern web application built on the decoupled **MERN stack** (MongoDB, Express, React, Node.js). It is designed to analyze uploaded documents and pasted paragraphs, query search engine indexes in real-time, retrieve potential matches from web databases in parallel, and run multi-tier natural language similarity heuristics to pinpoint duplicate and paraphrased text.

---

## 🚀 Key Features

* **Dual Input Interface**: Submit paragraphs directly via paste-text box or drag-and-drop document files (`.txt`, `.pdf`, `.docx`).
* **High-Capacity File Processing**: Handles files up to **300 MB** with custom asynchronous stream extraction.
* **Real-time Web Analysis**: Queries Bing and DuckDuckGo indexes dynamically to scrape matching online texts in parallel.
* **Interactive Similarity Dashboard**: Displays circular verdict gauges, unique vs. plagiarised word distributions, and a matching source list.
* **Match Inspector**: Offers a side-by-side view highlighting exact overlapping words between the uploaded text and the matched source.
* **PDF Report Exports**: Native print-media layouts formatted to save clean, high-contrast, ink-friendly summary reports.
* **Fallback Database**: Seamlessly writes and loads checks locally on the filesystem using JSON if MongoDB is offline.

---

## 🛠 Technology Stack

* **Frontend**: React (Vite), Axios, HTML5 Drag-and-Drop, CSS Custom Variable dark theme design system.
* **Backend**: Node.js, Express, Multer (multipart form processing), PDF-Parse, Mammoth (DOCX parser).
* **Database**: MongoDB (Mongoose schemas) with dynamic filesystem fallback support.
* **NLP engine**: Custom tokenizers, Porter Stemmer, TF-IDF Vectorizer, Cosine Similarity matrices, and LCS Sequence Alignments.

---

## 📈 Similarity Metrics & Pipeline

The plagiarism check process follows a multi-tier comparison pipeline:

```
[Uploaded Text] ➔ [Sentence Tokenization & Clean] ➔ [Bing Search Queries]
                                                            │
[LCS Sequence Ratio] ⮘ [Cosine Matrix (TF-IDF)] ⮘ [15% Jaccard Filter]
         │
[JSON/Mongoose Save] ➔ [Interactive Matches & Highlights in React]
```

1. **Jaccard Pre-filter**: Measures vocabulary overlap between scraped web pages and input sentences. Pairs with less than `0.15` similarity are skipped to speed up processing.
2. **Cosine Similarity (TF-IDF)**: Calculates vector alignment between sentences to identify paraphrased text structures.
3. **LCS Ratio**: Analyzes Longest Common Subsequences between matching regions to detect exact verbatim segments.

### 📊 Plagiarism Thresholds

| Similarity Score | Status | Verdict |
|------------------|--------|---------|
| **0% – 29%** | ✅ Original | No plagiarism detected. |
| **30% – 69%** | ⚠️ Suspicious | Possible plagiarism detected. Review matching sources. |
| **70% – 100%** | 🚨 Plagiarised | High plagiarism detected. Heavy verbatim matches. |

---

## ⚙️ Running Locally

Follow these instructions to boot up the backend API and frontend servers:

### Prerequisites
Make sure you have [Node.js (v18+)](https://nodejs.org) and [NPM](https://npm.js) installed.

### 1. Launch the Backend Server
Navigate to the `backend/` directory, install packages, and start the node listener:
```bash
cd backend
npm install
npm start
```
*The API will start listening on port `5000` (e.g. `http://localhost:5000`). If local MongoDB is running, it will connect; otherwise, it will save report payloads to `backend/results/`.*

### 2. Launch the React Client
Open a second terminal window, navigate to the `frontend/` directory, install packages, and start Vite:
```bash
cd frontend
npm install
npm run dev
```
*Vite will compile and launch the application on port `5173`. Open [http://localhost:5173](http://localhost:5173) in your browser.*

---

## 🔑 API Headers & Authentication

The Express router protects check endpoints with a header token authentication:

* **Header Name**: `X-API-Key`
* **Default Value**: `123456` *(configured in backend environment variable)*

### API Reference Table

| Method | Endpoint | Description | Payload / Params |
|--------|----------|-------------|------------------|
| `POST` | `/api/check` | Analyze paste text block | `{ "text": "...", "search_web": true }` |
| `POST` | `/api/upload` | Upload and parse document file | `multipart/form-data` with `"file"` |
| `GET` | `/api/report/:id` | Retrieve completed analysis report | URL param `id` (e.g. `cdc830135fd9`) |
| `GET` | `/health` | Server status and version check | None |
