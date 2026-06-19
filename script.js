/* ─────────────────────────────────────────────
   PlagCheck — script.js
───────────────────────────────────────────── */
(function () {
  'use strict';

  /* ── Index page logic ── */
  const dropzone   = document.getElementById('dropzone');
  const fileInput  = document.getElementById('fileInput');
  const filePreview = document.getElementById('filePreview');
  const fpName     = document.getElementById('fpName');
  const fpSize     = document.getElementById('fpSize');
  const fpIcon     = document.getElementById('fpIcon');
  const fpRemove   = document.getElementById('fpRemove');
  const btnCheck   = document.getElementById('btnCheck');
  const uploadForm = document.getElementById('uploadForm');
  const progressWrap = document.getElementById('progressWrap');
  const progressBar  = document.getElementById('progressBar');
  const errorBox   = document.getElementById('errorBox');
  const errMsg     = document.getElementById('errMsg');

  if (!dropzone) return; // not on index page

  /* ── File type icons ── */
  function fileIcon(name) {
    const ext = name.split('.').pop().toLowerCase();
    if (ext === 'pdf')  return '📕';
    if (ext === 'docx') return '📘';
    return '📄';
  }

  /* ── Format bytes ── */
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  /* ── Show selected file ── */
  function showFile(file) {
    fpName.textContent = file.name;
    fpSize.textContent = formatSize(file.size);
    fpIcon.textContent = fileIcon(file.name);
    filePreview.classList.remove('hidden');
    dropzone.classList.add('hidden');
    btnCheck.disabled = false;
  }

  /* ── Clear file ── */
  function clearFile() {
    fileInput.value = '';
    filePreview.classList.add('hidden');
    dropzone.classList.remove('hidden');
    btnCheck.disabled = true;
    hideError();
  }

  /* ── Drag & drop ── */
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      fileInput.files = files;
      showFile(files[0]);
    }
  });
  dropzone.addEventListener('click', () => fileInput.click());

  /* ── File input change ── */
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      showFile(fileInput.files[0]);
    }
  });

  /* ── Remove file ── */
  if (fpRemove) {
    fpRemove.addEventListener('click', clearFile);
  }

  /* ── Error helpers ── */
  function showError(msg) {
    errMsg.textContent = msg;
    errorBox.classList.remove('hidden');
  }
  function hideError() {
    errorBox.classList.add('hidden');
  }

  /* ── Step indicator ── */
  function setStep(n) {
    [1, 2, 3].forEach((i) => {
      const el = document.getElementById('step' + i);
      if (!el) return;
      el.classList.remove('active', 'done');
      if (i < n) el.classList.add('done');
      if (i === n) el.classList.add('active');
    });
  }

  /* ── Progress simulation ── */
  const psItems = [
    document.getElementById('ps1'),
    document.getElementById('ps2'),
    document.getElementById('ps3'),
    document.getElementById('ps4'),
    document.getElementById('ps5'),
  ].filter(Boolean);

  let progressInterval = null;
  let currentPsIndex = 0;
  let currentProgress = 0;

  function startProgress() {
    uploadForm.classList.add('hidden');
    progressWrap.classList.remove('hidden');
    hideError();
    setStep(2);

    currentPsIndex = 0;
    currentProgress = 0;
    progressBar.style.width = '0%';
    psItems.forEach((el) => el.classList.remove('active', 'done'));

    const durations = [400, 600, 700, 800, 500]; // ms per step
    let stepIndex = 0;

    function advanceStep() {
      if (stepIndex > 0) {
        psItems[stepIndex - 1].classList.remove('active');
        psItems[stepIndex - 1].classList.add('done');
      }
      if (stepIndex < psItems.length) {
        psItems[stepIndex].classList.add('active');
        const targetPct = Math.min(((stepIndex + 1) / psItems.length) * 85, 85);
        animateBar(targetPct);
        stepIndex++;
        if (stepIndex < psItems.length) {
          progressInterval = setTimeout(advanceStep, durations[stepIndex - 1]);
        }
      }
    }
    advanceStep();
  }

  function animateBar(target) {
    const start = currentProgress;
    const diff = target - start;
    const duration = 500;
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      currentProgress = start + diff * ease;
      progressBar.style.width = currentProgress.toFixed(1) + '%';
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function finishProgress(success) {
    clearTimeout(progressInterval);
    psItems.forEach((el) => {
      el.classList.remove('active');
      if (success) el.classList.add('done');
    });
    animateBar(success ? 100 : currentProgress);
    if (success) setStep(3);
  }

  /* ── Form submit via fetch (AJAX) ── */
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    if (!fileInput.files || fileInput.files.length === 0) {
      showError('Please select a file first.');
      return;
    }

    const formData = new FormData(uploadForm);
    startProgress();

    try {
      const res = await fetch('/upload', {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'X-API-Key': '123456',
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        finishProgress(false);
        progressWrap.classList.add('hidden');
        uploadForm.classList.remove('hidden');
        showError(data.error || 'Server error. Please try again.');
        setStep(1);
        return;
      }

      finishProgress(true);
      setTimeout(() => {
        window.location.href = data.redirect || '/report';
      }, 500);

    } catch (err) {
      finishProgress(false);
      progressWrap.classList.add('hidden');
      uploadForm.classList.remove('hidden');
      showError('Network error. Is the server running?');
      setStep(1);
    }
  });

  /* ────────────────────────────────────────────
     Report page animations
  ───────────────────────────────────────────── */
  // Animate score ring on load
  const ringFill = document.querySelector('.ring-fill');
  if (ringFill) {
    const originalDash = ringFill.getAttribute('stroke-dasharray');
    ringFill.setAttribute('stroke-dasharray', '0 314.16');
    requestAnimationFrame(() => {
      setTimeout(() => {
        ringFill.style.transition = 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)';
        ringFill.setAttribute('stroke-dasharray', originalDash);
      }, 200);
    });
  }

  // Animate bar fills
  const barFills = document.querySelectorAll('.bar-fill');
  barFills.forEach((bar) => {
    const targetW = bar.style.width;
    bar.style.width = '0%';
    requestAnimationFrame(() => {
      setTimeout(() => {
        bar.style.transition = 'width 0.9s cubic-bezier(0.4,0,0.2,1)';
        bar.style.width = targetW;
      }, 300);
    });
  });

  // Match badge colors based on similarity
  const badges = document.querySelectorAll('.match-badge');
  badges.forEach((badge) => {
    const score = parseFloat(badge.dataset.score || 0);
    if (score >= 70) {
      badge.style.color = 'var(--red)';
      badge.style.background = 'var(--red-soft)';
    } else if (score >= 45) {
      badge.style.color = 'var(--orange)';
      badge.style.background = 'var(--orange-soft)';
    } else {
      badge.style.color = 'var(--accent)';
      badge.style.background = 'var(--accent-soft)';
    }
  });

})();
