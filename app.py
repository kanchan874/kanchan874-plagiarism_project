import os
import uuid
import json
from flask import (
    Flask, request, jsonify, render_template,
    session, redirect, url_for
)
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from utils import read_file, compare_text

# ─────────────────────────────────────────────
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'plagchecker_secret_2024')

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
DATASET_DIR   = os.path.join(BASE_DIR, 'dataset')
ALLOWED_EXT   = {'txt', 'pdf', 'docx'}
MAX_FILE_MB   = 5

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_MB * 1024 * 1024

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(DATASET_DIR,   exist_ok=True)

API_KEY = os.getenv('API_KEY', '123456')


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXT

def check_api_key(req):
    """Check X-API-Key header."""
    key = req.headers.get('X-API-Key', '')
    return key == API_KEY


# ─────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/upload', methods=['POST'])
def upload():
    """
    Accepts multipart file upload.
    Reads text → runs NLP comparison → stores result in session → redirects to /report.
    Requires X-API-Key header OR form field api_key.
    """
    # API key check (header or form field)
    api_key = request.headers.get('X-API-Key') or request.form.get('api_key', '')
    if api_key != API_KEY:
        return jsonify({'error': 'Invalid or missing API key.'}), 401

    if 'file' not in request.files:
        return jsonify({'error': 'No file part in request.'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected.'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed. Use TXT, PDF, or DOCX.'}), 400

    # Save file
    filename  = secure_filename(file.filename)
    unique_id = uuid.uuid4().hex[:8]
    saved_name = f"{unique_id}_{filename}"
    filepath   = os.path.join(UPLOAD_FOLDER, saved_name)
    file.save(filepath)

    # Read text
    try:
        text = read_file(filepath)
    except Exception as e:
        os.remove(filepath)
        return jsonify({'error': str(e)}), 422

    if len(text.strip()) < 50:
        os.remove(filepath)
        return jsonify({'error': 'Document has too little text to analyse.'}), 422

    # Compare
    try:
        result = compare_text(text, DATASET_DIR)
    except Exception as e:
        os.remove(filepath)
        return jsonify({'error': f'Comparison failed: {str(e)}'}), 500

    # Clean up upload
    try:
        os.remove(filepath)
    except Exception:
        pass

    # Store result in session for the report page
    result['filename'] = filename
    result['word_count'] = len(text.split())
    result['char_count'] = len(text)
    session['result'] = json.dumps(result)

    # If AJAX request, return JSON
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return jsonify({'redirect': url_for('report')})

    return redirect(url_for('report'))


@app.route('/report')
def report():
    raw = session.get('result')
    if not raw:
        return redirect(url_for('index'))
    result = json.loads(raw)
    return render_template('report.html', result=result)


@app.route('/check', methods=['POST'])
def check():
    """
    JSON API endpoint (for programmatic use).
    Body: { "text": "...", "api_key": "..." }
    """
    data = request.get_json(silent=True) or {}
    key  = request.headers.get('X-API-Key') or data.get('api_key', '')
    if key != API_KEY:
        return jsonify({'error': 'Unauthorized'}), 401

    text = data.get('text', '').strip()
    if not text:
        return jsonify({'error': 'No text provided.'}), 400

    try:
        result = compare_text(text, DATASET_DIR)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/health')
def health():
    return jsonify({'status': 'ok', 'version': '1.0.0'})


# ─────────────────────────────────────────────
if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(debug=os.getenv('FLASK_DEBUG', 'false').lower() == 'true',
            host='0.0.0.0', port=port)
