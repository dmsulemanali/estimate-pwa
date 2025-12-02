// =============== CONFIG ===============
const TAX_RATE = 0.08875; // 8.875%

// =============== AUTO-GENERATE 25 ROWS ===============
const rowsContainer = document.getElementById("rows");

for (let i = 1; i <= 25; i++) {
  const row = document.createElement("div");
  row.className = "table-row";

  row.innerHTML = `
    <input class="cell itemno" data-row="${i}">
    <input class="cell style" data-row="${i}">
    <input class="cell size" data-row="${i}">
    <input class="cell general" data-row="${i}">
    <input class="cell ext" data-row="${i}">
    <input class="cell itemname" data-row="${i}">
    <input class="cell price" data-row="${i}" type="number" step="0.01">
  `;

  rowsContainer.appendChild(row);
}

// =============== TOTAL CALCULATIONS ===============
function calculateTotals() {
  let subtotal = 0;

  // Loop all rows
  document.querySelectorAll(".price").forEach((priceField) => {
    const val = parseFloat(priceField.value) || 0;
    subtotal += val;
  });

  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  document.getElementById("f_subtotal").innerText = subtotal.toFixed(2);
  document.getElementById("f_tax").innerText = tax.toFixed(2);
  document.getElementById("f_total").innerText = total.toFixed(2);
}

// Recalculate whenever price changes
document.addEventListener("input", (e) => {
  if (e.target.classList.contains("price")) calculateTotals();
});

// =============== ESTIMATE NUMBER AUTO-FILL ===============
function loadEstimateNumber() {
  let num = localStorage.getItem("estNumber");
  if (!num) num = 1;

  document.getElementById("f_est").value = num;
  document.getElementById("estDisplay").innerText = "Estimate #" + num;
}

function saveNextEstimate() {
  let num = parseInt(localStorage.getItem("estNumber") || "1");
  num++;
  localStorage.setItem("estNumber", num);
}

// =============== RESET FORM ===============
document.getElementById("resetForm").addEventListener("click", () => {
  if (!confirm("Clear all fields?")) return;
  window.location.reload();
});

// =============== SAVE LOCALLY ===============
document.getElementById("saveLocal").addEventListener("click", () => {
  const data = {
    name: f_name.value,
    date: f_date.value,
    address: f_address.value,
    note: f_note.value,
  };
  localStorage.setItem("savedEstimate", JSON.stringify(data));
  alert("Saved locally!");
});

// =============== PDF GENERATION ===============
function generatePDF() {

  const element = document.getElementById("printArea");

  const opt = {
    margin:       0,
    filename:     `estimate_${estCount}.pdf`,
    image:        { type: 'jpeg', quality: 1 },
    html2canvas:  { 
      scale: 2,
      useCORS: true,
      logging: false,
      letterRendering: true,
      dpi: 300
    },
    jsPDF:        { 
      unit: 'pt', 
      format: 'letter', 
      orientation: 'portrait'
    }
  };

  html2pdf().set(opt).from(element).save().then(() => {
    estCount++;
    localStorage.setItem("estCount", estCount);
    document.getElementById("estDisplay").innerText = "Last EST#: " + estCount;
  });
}

// =============== LOAD ON START ===============
loadEstimateNumber();
calculateTotals();
