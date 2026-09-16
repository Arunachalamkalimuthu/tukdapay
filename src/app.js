import { splitAmount } from './split.js';
import { isValidVpa } from './upi.js';
import { createPlan, breakdownText } from './plan.js';

const STORAGE_KEY = 'tukdapay/plan';
const $ = (id) => document.getElementById(id);

const els = {
  form: $('form'), total: $('total'), pa: $('pa'), pn: $('pn'), note: $('note'), max: $('max'),
  hint: $('amount-hint'), error: $('form-error'),
  result: $('result'), title: $('result-title'), payee: $('result-payee'),
  progress: $('progress'), fill: $('progress-fill'), progressText: $('progress-text'),
  parts: $('parts'), copy: $('copy'), reset: $('reset'),
};

const rupees = (n) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (s) => Number(String(s).replace(/[,\s₹]/g, ''));

// ---- persistence (best effort) -------------------------------------------
function loadPlan() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}
function savePlan(plan) {
  try { plan ? localStorage.setItem(STORAGE_KEY, JSON.stringify(plan)) : localStorage.removeItem(STORAGE_KEY); } catch {}
}

// ---- QR (loaded lazily, only on screens that show it) ---------------------
let qrModule;
async function drawQr(container, url) {
  if (getComputedStyle(container).display === 'none') return;
  try {
    qrModule ??= await import('https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm');
    const canvas = document.createElement('canvas');
    await qrModule.toCanvas(canvas, url, { width: 160, margin: 0 });
    container.replaceChildren(canvas);
  } catch {
    container.textContent = 'QR unavailable — use the link on your phone.';
  }
}

// ---- rendering --------------------------------------------------------------
let plan = null;

function renderProgress() {
  const n = plan.parts.length;
  const paid = plan.parts.filter((p) => p.paid).length;
  els.progress.setAttribute('aria-valuemax', n);
  els.progress.setAttribute('aria-valuenow', paid);
  els.fill.style.width = `${(paid / n) * 100}%`;
  els.progressText.textContent = paid === n ? `All ${n} paid` : `${paid} of ${n} paid`;
}

function renderPlan() {
  const { input, parts } = plan;
  els.title.textContent = `${parts.length} payment${parts.length === 1 ? '' : 's'} for ${rupees(input.total)}`;
  els.payee.textContent = input.pn ? `to ${input.pn} (${input.pa})` : `to ${input.pa}`;

  els.parts.replaceChildren(
    ...parts.map((p, i) => {
      const li = document.createElement('li');
      li.className = 'part' + (p.paid ? ' is-paid' : '');
      li.innerHTML = `
        <span class="part-amount"></span>
        <span class="part-label"></span>
        <a class="part-pay" rel="noopener"></a>
        <div class="part-qr"></div>
        <label class="part-paid"><input type="checkbox" /> <span>Paid</span></label>`;
      li.querySelector('.part-amount').textContent = rupees(p.amount);
      li.querySelector('.part-label').textContent = `Part ${i + 1} of ${parts.length}`;
      const a = li.querySelector('.part-pay');
      a.href = p.url;
      a.textContent = p.paid ? 'Pay again' : 'Pay';
      const cb = li.querySelector('input');
      cb.checked = p.paid;
      cb.addEventListener('change', () => {
        p.paid = cb.checked;
        li.classList.toggle('is-paid', p.paid);
        a.textContent = p.paid ? 'Pay again' : 'Pay';
        renderProgress();
        savePlan(plan);
      });
      return li;
    })
  );
  // QR containers are only visible on wide screens; check after they are in the DOM.
  els.parts.querySelectorAll('.part-qr').forEach((el, i) => drawQr(el, parts[i].url));
  renderProgress();
  els.result.hidden = false;
}

function showPlan(newPlan) {
  plan = newPlan;
  savePlan(plan);
  renderPlan();
  els.result.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---- form -------------------------------------------------------------------
function readForm() {
  return {
    total: num(els.total.value),
    pa: els.pa.value.trim(),
    pn: els.pn.value.trim(),
    note: els.note.value.trim(),
    maxPerTxn: num(els.max.value),
  };
}

function validate(input) {
  if (!Number.isFinite(input.total) || input.total <= 0) return 'Enter the amount you need to pay.';
  if (!Number.isFinite(input.maxPerTxn) || input.maxPerTxn <= 0) return 'Max per payment must be more than ₹0.';
  if (!isValidVpa(input.pa)) return 'Enter the merchant’s UPI ID, like shopname@okaxis.';
  return null;
}

function updateHint() {
  const total = num(els.total.value);
  const max = num(els.max.value);
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(max) || max <= 0) {
    els.hint.textContent = '';
    return;
  }
  const n = splitAmount(total, max).length;
  els.hint.textContent = n === 1 ? 'Under the limit — one payment' : `→ ${n} payments`;
}

els.total.addEventListener('input', updateHint);
els.max.addEventListener('input', updateHint);

els.form.addEventListener('submit', (e) => {
  e.preventDefault();
  const input = readForm();
  const problem = validate(input);
  els.error.hidden = !problem;
  els.error.textContent = problem ?? '';
  if (problem) return;
  showPlan(createPlan(input));
});

els.copy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(breakdownText(plan));
    els.copy.textContent = 'Copied';
  } catch {
    els.copy.textContent = 'Copy failed';
  }
  setTimeout(() => (els.copy.textContent = 'Copy breakdown'), 1500);
});

els.reset.addEventListener('click', () => {
  plan = null;
  savePlan(null);
  els.result.hidden = true;
  els.form.reset();
  updateHint();
  els.total.focus();
});

// ---- restore -----------------------------------------------------------------
const saved = loadPlan();
if (saved?.parts?.length) {
  plan = saved;
  els.total.value = saved.input.total;
  els.pa.value = saved.input.pa;
  els.pn.value = saved.input.pn ?? '';
  els.note.value = saved.input.note ?? '';
  els.max.value = saved.input.maxPerTxn;
  updateHint();
  renderPlan();
}
