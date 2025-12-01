// script.js
// Uses html2canvas + jsPDF to produce a LETTER size PDF.
// Also creates editable rows and manages EST# via localStorage.

(function () {
  // Create 14 rows in the table
  const rowsContainer = document.getElementById('rows');
  const ROWS = 14;
  for (let r = 0; r < ROWS; r++) {
    const div = document.createElement('div');
    div.className = 'row-item';
    // 7 columns
    for (let c = 0; c < 7; c++) {
      const cell = document.createElement('div');
      cell.contentEditable = "true";
      cell.dataset.r = r;
      cell.dataset.c = c;
      // Price column align right
      if (c === 6) cell.style.textAlign = 'right';
      div.appendChild(cell);
    }
    rowsContainer.appendChild(div);
  }

  // EST number handling
  const estKey = 'estimate_number_v1';
  function nextEst() {
    let n = parseInt(localStorage.getItem(estKey) || '0', 10);
    n = n + 1;
    localStorage.setItem(estKey, n);
    return n;
  }
  function getCurrentEst() {
    return parseInt(localStorage.getItem(estKey) || '0', 10);
  }

  // Set initial EST displayed
  const estDisplay = document.getElementById('estDisplay');
  function refreshEstDisplay() {
    const cur = getCurrentEst();
    estDisplay.textContent = cur ? `Last EST#: ${cur}` : `EST#: not generated yet`;
  }
  refreshEstDisplay();

  // If there's saved form data, load it
  const saveKey = 'estimate_form_v1';
  function saveLocal() {
    const state = { fields: {}, rows: [] };
    document.querySelectorAll('[id^="f_"]').forEach(el => state.fields[el.id] = el.innerText);
    // rows
    document.querySelectorAll('.row-item').forEach(row => {
      const rowData = [];
      row.querySelectorAll('div').forEach(cell => rowData.push(cell.innerText));
      state.rows.push(rowData);
    });
    localStorage.setItem(saveKey, JSON.stringify(state));
    alert('Saved locally on this device.');
  }
  function loadLocal() {
    const raw = localStorage.getItem(saveKey);
    if (!raw) return;
    try {
      const state = JSON.parse(raw);
      Object.keys(state.fields || {}).forEach(k => {
        const el = document.getElementById(k);
        if (el) el.innerText = state.fields[k];
      });
      const rows = document.querySelectorAll('.row-item');
      (state.rows || []).slice(0, rows.length).forEach((rData, i) => {
        const cells = rows[i].querySelectorAll('div');
        rData.forEach((val, j) => { if (cells[j]) cells[j].innerText = val; });
      });
    } catch (e) {
      console.warn('Failed to load saved form', e);
    }
  }
  loadLocal();

  // Reset button
  document.getElementById('resetForm').addEventListener('click', () => {
    if (!confirm('Clear the form?')) return;
    document.querySelectorAll('[id^="f_"]').forEach(el => el.innerText = '');
    document.querySelectorAll('.row-item div').forEach(cell => cell.innerText = '');
  });
  document.getElementById('saveLocal').addEventListener('click', saveLocal);

  // Generate PDF
  document.getElementById('generatePdf').addEventListener('click', async () => {
    // If est field empty, auto assign next
    const estField = document.getElementById('f_est');
    if (!estField.innerText.trim()) {
      const next = nextEst();
      estField.innerText = String(next).padStart(4, '0');
    }

    // update est display
    refreshEstDisplay();

    // Use html2canvas to capture the print area
    const printArea = document.getElementById('print-area');

    // temporarily remove focus to avoid caret in screenshot
    document.activeElement.blur();

    // scale for high quality
    const scale = 2; // improve quality
    const opts = {
      scale,
      useCORS: true,
      logging: false,
      scrollY: -window.scrollY,
      width: printArea.offsetWidth,
      height: printArea.offsetHeight,
      windowWidth: document.documentElement.clientWidth
    };

    try {
      const canvas = await html2canvas(printArea, opts);
      // create jsPDF with letter size in pt units
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'letter'
      });

      const imgData = canvas.toDataURL('image/png');

      // page size in pts
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // calculate image dimensions to fit page
      const imgProps = { width: canvas.width, height: canvas.height };
      const ratio = Math.min(pageWidth / imgProps.width, pageHeight / imgProps.height);
      const imgWidth = imgProps.width * ratio;
      const imgHeight = imgProps.height * ratio;

      const x = (pageWidth - imgWidth) / 2;
      const y = (pageHeight - imgHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      const estVal = document.getElementById('f_est').innerText || '0000';
      pdf.save(`Estimate-EST${estVal}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF. Try again.');
    }
  });

  // Register service worker (PWA offline)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(err => {
      console.warn('ServiceWorker registration failed:', err);
    });
  }
})();
