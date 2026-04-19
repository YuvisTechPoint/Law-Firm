/* ============================================
   DOCUMENTS.JS — Documents Section + PDF Export
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {

  let docsData = [];

  // Load documents data
  try {
    const res = await fetch('../data/documents.json');
    docsData = await res.json();
  } catch {
    docsData = getDefaultDocs();
  }

  // Check whether fallback path needed
  if (!docsData.length) {
    try {
      const res = await fetch('data/documents.json');
      docsData = await res.json();
    } catch {}
  }

  renderDocTabs();
  renderAllDocs();
  setupCheckboxes();

  function renderDocTabs() {
    const tabsEl = document.getElementById('doc-tabs');
    if (!tabsEl) return;
    tabsEl.innerHTML = `
      <button class="doc-tab active" data-cat="All">All Categories</button>
      ${docsData.map(d => `<button class="doc-tab" data-cat="${d.category}">${d.category}</button>`).join('')}
    `;
    tabsEl.querySelectorAll('.doc-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        tabsEl.querySelectorAll('.doc-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const cat = tab.dataset.cat;
        if (cat === 'All') renderAllDocs();
        else renderFilteredDocs(cat);
      });
    });
  }

  function renderAllDocs() {
    const grid = document.getElementById('docs-grid');
    if (!grid) return;
    grid.innerHTML = docsData.map(doc => renderDocCard(doc)).join('');
    setupCheckboxes();
  }

  function renderFilteredDocs(cat) {
    const grid = document.getElementById('docs-grid');
    if (!grid) return;
    const filtered = docsData.filter(d => d.category === cat);
    grid.innerHTML = filtered.map(doc => renderDocCard(doc)).join('');
    setupCheckboxes();
  }

  function renderDocCard(doc) {
    return `
      <div class="doc-category-card reveal">
        <div class="doc-card-header">
          <div class="doc-icon-wrap">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <div>
            <h3>${doc.category}</h3>
            <p>${doc.description}</p>
          </div>
        </div>
        <div class="doc-progress">
          <div class="doc-progress-bar" id="progress-${doc.id}" style="width:0%"></div>
        </div>
        <div class="doc-progress-text" id="progress-text-${doc.id}">0/${doc.documents.length} completed</div>
        <ul class="doc-list" id="doc-list-${doc.id}">
          ${doc.documents.map((item, idx) => `
            <li id="doc-item-${doc.id}-${idx}">
              <input type="checkbox" id="chk-${doc.id}-${idx}" data-docid="${doc.id}" data-idx="${idx}">
              <label for="chk-${doc.id}-${idx}">${item}</label>
            </li>
          `).join('')}
        </ul>
        <div class="doc-card-footer">
          <button class="btn btn-outline btn-sm" onclick="downloadChecklist(${doc.id})">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download Checklist
          </button>
          <a href="lawyers.html?service=${encodeURIComponent(doc.category)}" class="btn btn-gold btn-sm">
            Find a Lawyer →
          </a>
        </div>
      </div>
    `;
  }

  function setupCheckboxes() {
    document.querySelectorAll('.doc-list input[type="checkbox"]').forEach(chk => {
      chk.addEventListener('change', () => {
        const docId = chk.dataset.docid;
        const idx = chk.dataset.idx;
        const li = document.getElementById(`doc-item-${docId}-${idx}`);
        if (li) li.classList.toggle('checked', chk.checked);
        updateProgress(docId);
      });
    });
  }

  function updateProgress(docId) {
    const doc = docsData.find(d => d.id == docId);
    if (!doc) return;
    const total = doc.documents.length;
    const checked = document.querySelectorAll(`[data-docid="${docId}"]:checked`).length;
    const pct = Math.round((checked / total) * 100);
    const bar = document.getElementById(`progress-${docId}`);
    const txt = document.getElementById(`progress-text-${docId}`);
    if (bar) bar.style.width = pct + '%';
    if (txt) txt.textContent = `${checked}/${total} completed`;
  }

  // ─── Download Checklist (Print-style) ───────────
  window.downloadChecklist = function(docId) {
    const doc = docsData.find(d => d.id == docId);
    if (!doc) return;
    const printWindow = window.open('', '_blank');
    const checkedItems = [];
    const uncheckedItems = [];
    doc.documents.forEach((item, idx) => {
      const chk = document.getElementById(`chk-${docId}-${idx}`);
      if (chk?.checked) checkedItems.push(item);
      else uncheckedItems.push(item);
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Documents Checklist - ${doc.category}</title>
        <style>
          body { font-family: 'Georgia', serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; }
          h1 { font-size: 1.8rem; border-bottom: 3px solid #C9A84C; padding-bottom: 10px; }
          h2 { font-size: 1.1rem; color: #666; margin-bottom: 5px; }
          h3 { font-size: 1rem; margin: 20px 0 10px; }
          ul { list-style: none; padding: 0; }
          li { padding: 8px 0; border-bottom: 1px solid #f0e8d0; display: flex; align-items: flex-start; gap: 10px; }
          .check { width: 18px; height: 18px; border: 2px solid #C9A84C; border-radius: 3px; flex-shrink: 0; margin-top: 1px; display: flex; align-items: center; justify-content: center; }
          .check.done { background: #C9A84C; color: white; font-weight: bold; }
          .firm { color: #C9A84C; font-weight: bold; font-size: 1.2rem; margin-bottom: 5px; }
          .footer { margin-top: 30px; font-size: 0.75rem; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <div class="firm">⚖ LexCounsel India</div>
        <h1>${doc.category} — Documents Checklist</h1>
        <h2>${doc.description}</h2>
        <p style="font-size:0.85rem;color:#666">Generated on: ${new Date().toLocaleDateString('en-IN')}</p>
        <h3>Required Documents (${doc.documents.length} total):</h3>
        <ul>
          ${doc.documents.map((item, idx) => {
            const chk = document.getElementById(`chk-${docId}-${idx}`);
            const done = chk?.checked;
            return `<li><div class="check ${done ? 'done' : ''}">${done ? '✓' : ''}</div><span>${item}</span></li>`;
          }).join('')}
        </ul>
        <div class="footer">
          <p>This checklist is for reference only. Requirements may vary case-by-case. Consult an advocate for specific advice.</p>
          <p>LexCounsel India | +91 XXXXX XXXXX | info@lexcounsel.in</p>
        </div>
        <br><button onclick="window.print()" style="padding:10px 20px;background:#C9A84C;border:none;border-radius:20px;font-weight:600;cursor:pointer">🖨 Print / Save as PDF</button>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  function getDefaultDocs() {
    return [
      { id: 1, category: "Divorce & Matrimonial", description: "Documents for filing divorce petition", documents: ["Marriage Certificate", "Aadhaar Card (both parties)", "Address Proof", "Income Proof", "Passport-size photographs", "Children's birth certificates", "Property documents (if applicable)", "Any prior court orders"] }
    ];
  }
});
