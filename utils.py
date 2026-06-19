"""
utils.py — NLP engine for PlagCheck
Supports: NLTK (preferred) or pure-Python fallback when NLTK is unavailable.
PDF reading: pypdf (v3+) or PyPDF2 — whichever is installed.
"""

import os
import re

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# ─────────────────────────────────────────────
# NLTK — optional but preferred
# ─────────────────────────────────────────────
try:
    import nltk
    for _pkg in ('punkt', 'stopwords', 'punkt_tab'):
        try:
            nltk.download(_pkg, quiet=True)
        except Exception:
            pass
    from nltk.corpus import stopwords as _sw
    from nltk.stem import PorterStemmer as _PS
    from nltk.tokenize import sent_tokenize as _sent_tok
    from nltk.tokenize import word_tokenize as _word_tok
    _STOP_WORDS = set(_sw.words('english'))
    _STEMMER    = _PS()
    _HAS_NLTK   = True
except ImportError:
    _HAS_NLTK = False
    _STOP_WORDS = {
        'a','an','the','and','or','but','in','on','at','to','for','of',
        'with','by','from','as','is','was','are','were','be','been','being',
        'have','has','had','do','does','did','will','would','could','should',
        'may','might','shall','can','it','its','this','that','these','those',
        'i','me','my','we','our','you','your','he','him','his','she','her',
        'they','them','their','what','which','who','when','where','why','how',
        'all','each','every','both','some','no','not','only','so','than',
        'too','very','just','also','about','after','again','before','between',
        'during','into','over','then','there','through','until','while','up',
        'if','any','out','off','down','even','here','such','other','more',
        'most','any','each','few','more','most','other','same',
    }

    class _SimpleStemmer:
        _sfx = ['ing','tion','tions','ness','ment','ments','ible','able',
                'ibly','ably','ful','ous','ive','ize','ise','ized','ised',
                'er','ed','ly','es','s']
        def stem(self, w):
            w = w.lower()
            if len(w) <= 4:
                return w
            for s in self._sfx:
                if w.endswith(s) and len(w)-len(s) >= 3:
                    return w[:len(w)-len(s)]
            return w

    _STEMMER = _SimpleStemmer()

    def _sent_tok(text):
        parts = re.split(r'(?<=[.!?])\s+', text.strip())
        return [s.strip() for s in parts if s.strip()]

    def _word_tok(text):
        return re.findall(r'\b\w+\b', text.lower())


# ─────────────────────────────────────────────
# FILE READERS
# ─────────────────────────────────────────────

def read_txt(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as fh:
        return fh.read()

def read_pdf(filepath):
    try:
        import pypdf
        parts = []
        with open(filepath, 'rb') as fh:
            reader = pypdf.PdfReader(fh)
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    parts.append(t)
        return '\n'.join(parts).strip()
    except ImportError:
        pass
    try:
        import PyPDF2
        parts = []
        with open(filepath, 'rb') as fh:
            reader = PyPDF2.PdfReader(fh)
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    parts.append(t)
        return '\n'.join(parts).strip()
    except ImportError:
        pass
    raise ValueError("No PDF library found. Install pypdf: pip install pypdf")

def read_docx(filepath):
    try:
        from docx import Document
        doc = Document(filepath)
        return '\n'.join(p.text for p in doc.paragraphs if p.text.strip())
    except ImportError:
        raise ValueError("python-docx not installed.")

def read_file(filepath):
    ext = os.path.splitext(filepath)[1].lower()
    if ext == '.txt':   return read_txt(filepath)
    elif ext == '.pdf': return read_pdf(filepath)
    elif ext == '.docx':return read_docx(filepath)
    else: raise ValueError(f"Unsupported format: '{ext}'. Use TXT, PDF or DOCX.")


# ─────────────────────────────────────────────
# NLP PIPELINE
# ─────────────────────────────────────────────

def clean_text(text, stem=True):
    text = text.lower()
    text = re.sub(r'[^\w\s]', ' ', text)
    text = re.sub(r'\d+', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    tokens = _word_tok(text)
    tokens = [t for t in tokens if t not in _STOP_WORDS and len(t) > 1]
    if stem:
        tokens = [_STEMMER.stem(t) for t in tokens]
    return ' '.join(tokens)


# ─────────────────────────────────────────────
# SENTENCE-LEVEL MATCHING
# ─────────────────────────────────────────────

def get_matched_sentences(text1, text2, threshold=0.45):
    sentences1 = _sent_tok(text1)
    sentences2 = _sent_tok(text2)
    if not sentences1 or not sentences2:
        return []
    matched = []
    for s1 in sentences1:
        if len(s1.split()) < 5:
            continue
        c1 = clean_text(s1, stem=False)
        best_score, best_s2 = 0.0, ''
        for s2 in sentences2:
            if len(s2.split()) < 5:
                continue
            c2 = clean_text(s2, stem=False)
            if not c1.strip() or not c2.strip():
                continue
            try:
                v = TfidfVectorizer(min_df=1)
                m = v.fit_transform([c1, c2])
                score = float(cosine_similarity(m[0], m[1])[0][0])
            except Exception:
                score = 0.0
            if score > best_score:
                best_score, best_s2 = score, s2
        if best_score >= threshold:
            matched.append({
                'source_sentence':  s1.strip(),
                'matched_sentence': best_s2.strip(),
                'similarity':       round(best_score * 100, 1),
            })
    return matched[:15]


# ─────────────────────────────────────────────
# CORE COMPARISON ENGINE
# ─────────────────────────────────────────────

def compare_text(uploaded_text, dataset_dir):
    if not uploaded_text.strip():
        raise ValueError("The uploaded document is empty or unreadable.")

    cleaned_upload = clean_text(uploaded_text)

    best = {
        'similarity': 0.0,
        'matched_file': None,
        'matched_sentences': [],
        'all_scores': [],
        'status': 'clean',
    }

    dataset_files = [
        f for f in os.listdir(dataset_dir)
        if f.lower().endswith(('.txt', '.pdf', '.docx'))
    ]
    if not dataset_files:
        raise ValueError("The dataset folder is empty. Add reference files to 'dataset/'.")

    all_scores = []
    for filename in dataset_files:
        filepath = os.path.join(dataset_dir, filename)
        try:
            dataset_text = read_file(filepath)
        except Exception:
            continue
        if not dataset_text.strip():
            continue

        cleaned_ds = clean_text(dataset_text)
        try:
            vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=1, sublinear_tf=True)
            tfidf  = vectorizer.fit_transform([cleaned_upload, cleaned_ds])
            score  = float(cosine_similarity(tfidf[0], tfidf[1])[0][0])
        except Exception:
            score = 0.0

        all_scores.append({'file': filename, 'score': round(score * 100, 2)})

        if score > (best['similarity'] / 100):
            sents = get_matched_sentences(uploaded_text, dataset_text, threshold=0.45)
            best = {
                'similarity':        round(score * 100, 2),
                'matched_file':      filename,
                'matched_sentences': sents,
                'all_scores':        [],
                'status':            'plagiarised' if score >= 0.30 else 'clean',
            }

    all_scores.sort(key=lambda x: x['score'], reverse=True)
    best['all_scores'] = all_scores
    return best
