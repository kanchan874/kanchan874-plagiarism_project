# PlagCheck — NLP Plagiarism Detector

> A college mini project for **Text Processing & Natural Language Processing** subjects.  
> Built with Python Flask, NLTK, scikit-learn (TF-IDF + Cosine Similarity).  
> No LLM/OpenAI used — 100% classical NLP.

---

## 📁 Project Structure

```
plagiarism_project/
├── app.py                  ← Flask backend (routes, API key check)
├── utils.py                ← NLP engine (read, clean, compare)
├── requirements.txt
├── Procfile                ← For Render / Railway deployment
├── runtime.txt             ← Python version pin
├── .env                    ← API key and secrets
├── .gitignore
├── README.md
│
├── dataset/                ← Reference documents to compare against
│   ├── doc1.txt            (AI & NLP content)
│   ├── doc2.txt            (Climate change content)
│   ├── doc3.txt            (Machine learning content)
│   ├── doc4.txt            (Blockchain content)
│   └── doc5.txt            (Cybersecurity content)
│
├── uploads/                ← Temp storage for uploaded files (auto-cleared)
│
├── templates/
│   ├── index.html          ← Upload page
│   └── report.html         ← Plagiarism report page
│
└── static/
    ├── style.css           ← Full custom dark UI stylesheet
    └── script.js           ← Drag-drop, AJAX upload, progress animation
```

---

## 🚀 How to Install & Run Locally

### 1. Clone / Download the project

```bash
git clone https://github.com/yourname/plagcheck.git
cd plagcheck
```

### 2. Create a virtual environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Download NLTK data (first run only)

```bash
python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords'); nltk.download('punkt_tab')"
```

### 5. Set up environment variables

Edit the `.env` file (already included):

```
API_KEY=123456
SECRET_KEY=plagchecker_secret_2024
FLASK_DEBUG=false
PORT=5000
```

Change `API_KEY` to anything you like for security.

### 6. Run the app

```bash
python app.py
```

Open your browser at: **http://localhost:5000**

---

## 📤 How to Upload a File

1. Open **http://localhost:5000** in your browser
2. Drag & drop a file onto the upload zone, or click **Browse Files**
3. Supported formats: **TXT**, **PDF**, **DOCX** (max 5 MB)
4. The API key field is pre-filled (`123456`) — leave it as is
5. Click **Analyse Document**
6. Wait for the NLP pipeline to process (~2–5 seconds)
7. View the full **Plagiarism Report**

---

## 📚 How to Add Dataset Files

The system compares uploaded documents against all files in the `dataset/` folder.

To add your own reference documents:

1. Place any `.txt`, `.pdf`, or `.docx` file inside the `dataset/` folder
2. No restart needed — files are read on every request
3. You can add as many files as needed

**Example:**
```bash
cp my_reference_paper.txt plagiarism_project/dataset/
```

---

## 🔬 NLP Processing Pipeline

| Step | Operation | Library |
|------|-----------|---------|
| 1 | Lowercase normalisation | Python built-in |
| 2 | Punctuation & digit removal | `re` module |
| 3 | Word tokenisation | `nltk.word_tokenize` |
| 4 | Stopword removal | `nltk.corpus.stopwords` |
| 5 | Stemming | `nltk.stem.PorterStemmer` |
| 6 | TF-IDF vectorisation (bigrams) | `sklearn.TfidfVectorizer` |
| 7 | Cosine similarity | `sklearn.metrics.pairwise.cosine_similarity` |
| 8 | Sentence-level matching | `nltk.sent_tokenize` + per-sentence TF-IDF |

---

## 📊 Plagiarism Thresholds

| Similarity | Status | Verdict |
|------------|--------|---------|
| 0% – 29% | ✅ Original | No plagiarism detected |
| 30% – 69% | ⚠️ Suspicious | Possible plagiarism |
| 70% – 100% | 🚨 Plagiarised | High plagiarism detected |

---

## 🔐 Security (API Key)

All upload requests require a valid API key.

**Via HTTP header:**
```
X-API-Key: 123456
```

**Via form field** (used by the web UI automatically):
```
api_key=123456
```

To change the key, edit `.env`:
```
API_KEY=your_new_key_here
```

---

## 🌐 API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | Upload page |
| POST | `/upload` | Upload file, run check, redirect to report |
| GET | `/report` | Show plagiarism report (session-based) |
| POST | `/check` | JSON API: send raw text, get JSON result |
| GET | `/health` | Health check endpoint |

### `/check` JSON API Example

```bash
curl -X POST http://localhost:5000/check \
  -H "Content-Type: application/json" \
  -H "X-API-Key: 123456" \
  -d '{"text": "Machine learning is a type of artificial intelligence..."}'
```

**Response:**
```json
{
  "similarity": 72.4,
  "matched_file": "doc3.txt",
  "status": "plagiarised",
  "matched_sentences": [
    {
      "source_sentence": "Machine learning is a type of artificial intelligence...",
      "matched_sentence": "Machine learning is a type of artificial intelligence...",
      "similarity": 95.2
    }
  ],
  "all_scores": [
    { "file": "doc3.txt", "score": 72.4 },
    { "file": "doc1.txt", "score": 31.1 }
  ]
}
```

---

## ☁️ Deployment Guide

### Deploy on Render (Free)

1. Push project to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your repo
4. **Build command:** `pip install -r requirements.txt`
5. **Start command:** `gunicorn app:app --bind 0.0.0.0:$PORT`
6. Add environment variables from `.env` in the Render dashboard
7. Click **Deploy**

### Deploy on Railway

1. Push to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Add environment variables in the Variables tab
4. Railway auto-detects the `Procfile`

### Deploy on PythonAnywhere

1. Upload project files via the Files tab
2. Create a new Web App → Manual Configuration → Python 3.11
3. Set the WSGI file to point to `app:app`
4. Install requirements in a Bash console:
   ```bash
   pip install -r requirements.txt --user
   ```
5. Reload the web app

### Deploy on Replit

1. Create a new Repl → Import from GitHub
2. Replit auto-detects Python; add a `.replit` file:
   ```
   run = "python app.py"
   ```
3. Set Secrets (environment variables) in the Replit sidebar

---

## 🎓 Viva Questions & Answers

**Q: What NLP techniques are used?**  
A: Tokenisation, stopword removal, stemming (Porter Stemmer), TF-IDF vectorisation with bigrams, and cosine similarity for document-level and sentence-level comparison.

**Q: Why TF-IDF instead of simple word count?**  
A: TF-IDF weighs words by how important they are to a document relative to the corpus, reducing the influence of common words and highlighting meaningful terms.

**Q: What is cosine similarity?**  
A: It measures the angle between two TF-IDF vectors in high-dimensional space. A cosine of 1.0 means identical direction (same content); 0 means no similarity.

**Q: Why use stemming?**  
A: Stemming reduces words to their root form (e.g., "learning" → "learn"), so variations of the same word are treated as identical during comparison.

**Q: How are sentence matches found?**  
A: Each sentence from the uploaded document is individually vectorised using TF-IDF and compared to every sentence in the best-matching dataset file using cosine similarity.

**Q: What is the plagiarism threshold?**  
A: Similarity ≥ 30% triggers a "Possible Plagiarism" warning. ≥ 70% is flagged as "High Plagiarism". These thresholds are adjustable in `utils.py`.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11, Flask 3.0 |
| NLP | NLTK (tokenise, stopwords, stemming) |
| ML | scikit-learn (TF-IDF, cosine similarity) |
| File reading | PyPDF2, python-docx |
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Fonts | Syne (Google Fonts), DM Sans |
| Security | python-dotenv, API key middleware |
| Deployment | Gunicorn, Procfile, runtime.txt |

---

## 👨‍💻 Author

**Mini Project — Text Processing & NLP**  
Subject: Natural Language Processing / Text Processing  
Technology: Python, Flask, NLTK, scikit-learn

---

## 📄 License

MIT License — Free to use for educational purposes.
