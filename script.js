// script.js - html2pdf version with automatic calculations and EST#
(function () {
  // TAX rate (fixed) -> 8.875% NYC
  const TAX_RATE = 0.08875;

  // create rows
  const rowsContainer = document.getElementById('rows');
  const ROWS = 14;
  for (let r = 0; r < ROWS; r++) {
    const row = document.createElement('div');
    row.className = 'row-item';
    row.innerHTML = `
      <div><input class="col-ite" data-r="${r}" placeholder="${r+1}"></div>
      <div><input class="col-style" data-r="${r}"></div>
      <div><input class="col-size" data-r="${r}"></div>
      <div><input class="col-general" data-r="${r}"></div>
      <div><input class="col-ext" data-r="${r}"></div>
      <div><input class="col-item" data-r="${r}"></div>
      <div class="col-total"><input class="col-price" data-r="${r}" placeholder="0.00"></div>
    `;
    rowsContainer.appendChild(row);
  }

  // helper: parse float safe
  function parseMoney(val) {
    if (!val) return 0;
    // remove non-numeric except dot and minus
    val = String(val).replace(/[^0-9.\-]/g, '');
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  }
  // round to 2 decimals and format
  function fmt(n) {
    return (Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2);
  }

  // calculate totals
  function recalc() {
    const priceEls = document.querySelectorAll('.col-price');
    let subtotal = 0;
    priceEls.forEach((el, idx) => {
      const val = parseMoney(el.value || el.textContent || '');
      subtotal += val;
    });
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;

    document.getElementById('f_subtotal').innerText = fmt(subtotal);
    document.getElementById('f_tax').innerText = fmt(tax);
    document.getElementById('f_total').innerText = fmt(total);
  }

  // attach events to recalc on input change
  rowsContainer.addEventListener('input', function (e) {
    if (e.target && e.target.classList.contains('col-price')) {
      // normalize entry to numeric-ish
      const cleaned = e.target.value.replace(/[^0-9.]/g, '');
      e.target.value = cleaned;
      recalc();
    } else {
      // any input may affect layout but prices drive totals
      // recalc to be safe
      recalc();
    }
  });

  // also recalc when user leaves an input (to catch pasted values)
  rowsContainer.addEventListener('blur', function () { recalc(); }, true);

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
  const estDisplay = document.getElementById('estDisplay');
  function refreshEstDisplay() {
    const cur = getCurrentEst();
    estDisplay.textContent = cur ? `Last EST#: ${String(cur).padStart(4,'0')}` : `EST#: not generated yet`;
  }
  refreshEstDisplay();

  // Local save/load
  const saveKey = 'estimate_form_v1';
  function saveLocal() {
    const state = { fields: {}, rows: [] };
    document.querySelectorAll('input[id^="f_"], textarea[id^="f_"]').forEach(el => state.fields[el.id] = el.value || el.innerText);
    document.querySelectorAll('.row-item').forEach(row => {
      const rowData = [];
      row.querySelectorAll('input').forEach(cell => rowData.push(cell.value));
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
        if (el) el.value = state.fields[k];
      });
      const rows = document.querySelectorAll('.row-item');
      (state.rows || []).slice(0, rows.length).forEach((rData, i) => {
        const inputs = rows[i].querySelectorAll('input');
        rData.forEach((val, j) => { if (inputs[j]) inputs[j].value = val; });
      });
      recalc();
    } catch (e) {
      console.warn('Failed to load saved form', e);
    }
  }
  loadLocal();

  // Reset
  document.getElementById('resetForm').addEventListener('click', () => {
    if (!confirm('Clear the form?')) return;
    document.querySelectorAll('input').forEach(i => {
      // don't clear est if already set; user wants control maybe
      if (i.id === 'f_est') i.value = '';
      else i.value = '';
    });
    document.getElementById('f_note').value = '';
    recalc();
  });
  document.getElementById('saveLocal').addEventListener('click', saveLocal);

  // Generate PDF using html2pdf
  document.getElementById('generatePdf').addEventListener('click', async () => {
    // If est field empty, auto assign next
    const estField = document.getElementById('f_est');
    if (!estField.value.trim()) {
      const next = nextEst();
      estField.value = String(next).padStart(4, '0');
    }
    refreshEstDisplay();

    // blur active element to remove caret
    if (document.activeElement) document.activeElement.blur();

    const element = document.getElementById('print-area');

    // html2pdf options for letter size
    const opt = {
      margin:       [12, 12, 12, 12],        // top, left, bottom, right in mm (small margin)
      filename:     `Estimate-EST${(document.getElementById('f_est').value || '0000')}.pdf`,
      image:        { type: 'jpeg', quality: 1 },
      html2canvas:  { scale: 2, useCORS: true, logging: false, allowTaint: true },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    try {
      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('html2pdf error', err);
      alert('Failed to generate PDF. Try again.');
    }
  });

  // service worker registration for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(err => {
      console.warn('ServiceWorker registration failed:', err);
    });
  }

  // initial recalc
  recalc();

})();
