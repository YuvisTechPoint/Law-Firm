/* ============================================
   ADMIN.JS — Admin Panel Logic
   ============================================ */

const ADMIN_PASSWORD = 'lexcounsel2024';
const ADMIN_USERNAME = 'admin';

document.addEventListener('DOMContentLoaded', () => {

  // ─── Login Gate ──────────────────────────────────
  const loginScreen = document.getElementById('admin-login');
  const dashboard = document.getElementById('admin-dashboard');
  const loginForm = document.getElementById('login-form');

  function checkAuth() {
    return sessionStorage.getItem('admin_auth') === 'true';
  }

  function showDashboard() {
    if (loginScreen) loginScreen.style.display = 'none';
    if (dashboard) dashboard.style.display = 'flex';
    initDashboard();
  }

  function showLogin() {
    if (loginScreen) loginScreen.style.display = 'flex';
    if (dashboard) dashboard.style.display = 'none';
  }

  if (checkAuth()) {
    showDashboard();
  } else {
    showLogin();
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const user = document.getElementById('admin-username')?.value;
      const pass = document.getElementById('admin-password')?.value;
      const errEl = document.getElementById('login-error');

      if (user === ADMIN_USERNAME && pass === ADMIN_PASSWORD) {
        sessionStorage.setItem('admin_auth', 'true');
        showDashboard();
        if (errEl) errEl.style.display = 'none';
      } else {
        if (errEl) {
          errEl.textContent = 'Invalid username or password.';
          errEl.style.display = 'block';
        }
      }
    });
  }

  // Toggle password visibility
  const togglePass = document.getElementById('toggle-pass');
  if (togglePass) {
    togglePass.addEventListener('click', () => {
      const passField = document.getElementById('admin-password');
      if (passField) {
        passField.type = passField.type === 'password' ? 'text' : 'password';
        togglePass.textContent = passField.type === 'password' ? '👁' : '🙈';
      }
    });
  }

  // Logout
  const logoutBtn = document.getElementById('admin-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('admin_auth');
      showLogin();
    });
  }

  // ─── Dashboard Init ──────────────────────────────
  function initDashboard() {
    setupNavigation();
    loadStats();
    loadQATable();
    loadQueriesTable();
    loadConsultations();
  }

  // ─── Sidebar Navigation ──────────────────────────
  function setupNavigation() {
    const navItems = document.querySelectorAll('.admin-nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        const section = item.dataset.section;
        document.querySelectorAll('.admin-panel-section').forEach(s => s.classList.remove('active'));
        const target = document.getElementById('section-' + section);
        if (target) target.classList.add('active');
        // Update page title
        const title = document.getElementById('admin-page-title');
        if (title) title.textContent = item.querySelector('span')?.textContent || 'Dashboard';
      });
    });
  }

  // ─── Load Stats ─────────────────────────────────
  function loadStats() {
    const questions = JSON.parse(localStorage.getItem('lf_questions') || '[]');
    const consultations = JSON.parse(localStorage.getItem('lf_consultations') || '[]');
    const pending = questions.filter(q => q.status === 'pending').length;
    const answered = questions.filter(q => q.status === 'answered').length;

    const stats = {
      'stat-total-queries': questions.length,
      'stat-pending-qa': pending,
      'stat-answered-qa': answered,
      'stat-consultations': consultations.length
    };

    Object.entries(stats).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    });

    // Update sidebar badge
    const badge = document.getElementById('qa-badge');
    if (badge) badge.textContent = pending;
  }

  // ─── Load Q&A Table ─────────────────────────────
  function loadQATable() {
    const questions = JSON.parse(localStorage.getItem('lf_questions') || '[]');
    const tbody = document.getElementById('qa-tbody');
    if (!tbody) return;

    if (!questions.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:2rem">No questions yet.</td></tr>';
      return;
    }

    tbody.innerHTML = questions.map(q => `
      <tr data-id="${q.id}">
        <td><strong>${escapeHtml(q.name)}</strong></td>
        <td><span class="badge badge-gold">${q.category}</span></td>
        <td style="max-width:250px">${escapeHtml(q.title)}</td>
        <td style="color:var(--muted);font-size:0.8rem">${q.date}</td>
        <td>
          <span class="badge ${q.status === 'answered' ? 'badge-success' : 'badge-warning'}">
            ${q.status === 'answered' ? 'Answered' : 'Pending'}
          </span>
        </td>
        <td>
          ${q.status === 'pending' ? `
            <button class="btn btn-gold btn-sm" onclick="openReplyBox(${q.id})">Reply</button>
          ` : `
            <button class="btn btn-outline btn-sm" onclick="viewReply(${q.id})">View</button>
          `}
        </td>
      </tr>
      <tr id="reply-row-${q.id}" style="display:none">
        <td colspan="6">
          <div class="reply-box open">
            <h5>Reply to: "${escapeHtml(q.title)}"</h5>
            <div class="form-group" style="margin-bottom:8px">
              <label>Question:</label>
              <p style="font-size:0.85rem;color:var(--muted);padding:8px;background:rgba(13,15,26,0.4);border-radius:6px">${escapeHtml(q.body)}</p>
            </div>
            ${q.status === 'answered' ? `
              <div class="form-group">
                <label>Existing Reply:</label>
                <p style="font-size:0.85rem;color:var(--gold);border-left:3px solid var(--gold);padding:8px">${escapeHtml(q.reply?.text || '')}</p>
              </div>
            ` : `
              <div class="form-group">
                <textarea class="form-control" id="reply-text-${q.id}" rows="4" placeholder="Type your reply here..."></textarea>
              </div>
              <button class="btn btn-gold btn-sm" onclick="submitReply(${q.id})">Publish Answer</button>
              <button class="btn btn-outline btn-sm" style="margin-left:8px" onclick="closeReplyBox(${q.id})">Cancel</button>
            `}
          </div>
        </td>
      </tr>
    `).join('');
  }

  window.openReplyBox = function(id) {
    const row = document.getElementById('reply-row-' + id);
    if (row) row.style.display = row.style.display === 'none' ? '' : 'none';
  };

  window.closeReplyBox = function(id) {
    const row = document.getElementById('reply-row-' + id);
    if (row) row.style.display = 'none';
  };

  window.viewReply = window.openReplyBox;

  window.submitReply = function(id) {
    const textarea = document.getElementById('reply-text-' + id);
    if (!textarea || !textarea.value.trim()) {
      if (window.showToast) showToast('Please enter a reply before publishing.', 'error');
      return;
    }
    const questions = JSON.parse(localStorage.getItem('lf_questions') || '[]');
    const q = questions.find(q => q.id == id);
    if (q) {
      q.status = 'answered';
      q.reply = {
        advocate: 'Adv. Subhashis Paul',
        designation: 'Senior Advocate',
        text: textarea.value.trim(),
        date: new Date().toISOString().split('T')[0]
      };
      localStorage.setItem('lf_questions', JSON.stringify(questions));
      loadQATable();
      loadStats();
      if (window.showToast) showToast('Reply published successfully!', 'success');
    }
  };

  // ─── Load Queries Table ──────────────────────────
  function loadQueriesTable() {
    const tbody = document.getElementById('queries-tbody');
    if (!tbody) return;
    // Simulated consultation queries
    const queries = JSON.parse(localStorage.getItem('lf_consult_queries') || JSON.stringify([
      { name: 'Anjali Singh', phone: '+91 98765 XXXXX', issue: 'Property Dispute', date: '2024-03-25', status: 'new' },
      { name: 'Mohan Das', phone: '+91 98765 XXXXX', issue: 'Cheque Bounce', date: '2024-03-26', status: 'in-progress' },
      { name: 'Rekha Sharma', phone: '+91 98765 XXXXX', issue: 'Divorce', date: '2024-03-27', status: 'resolved' }
    ]));
    tbody.innerHTML = queries.map((q, i) => `
      <tr>
        <td><strong>${q.name}</strong></td>
        <td style="color:var(--gold)">${q.phone}</td>
        <td>${q.issue}</td>
        <td style="color:var(--muted);font-size:0.8rem">${q.date}</td>
        <td><span class="badge ${q.status === 'resolved' ? 'badge-success' : q.status === 'new' ? 'badge-warning' : 'badge-gold'}">${q.status}</span></td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="markDone(${i})">✓ Done</button>
        </td>
      </tr>
    `).join('');
  }

  window.markDone = function(idx) {
    const queries = JSON.parse(localStorage.getItem('lf_consult_queries') || '[]');
    if (queries[idx]) {
      queries[idx].status = 'resolved';
      localStorage.setItem('lf_consult_queries', JSON.stringify(queries));
      loadQueriesTable();
      if (window.showToast) showToast('Query marked as resolved.', 'success');
    }
  };

  // ─── Load Consultations ──────────────────────────
  function loadConsultations() {
    const tbody = document.getElementById('consult-tbody');
    if (!tbody) return;
    const consultations = JSON.parse(localStorage.getItem('lf_consultations') || '[]');
    if (!consultations.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:2rem">No paid consultations yet.</td></tr>';
      return;
    }
    tbody.innerHTML = consultations.map(c => `
      <tr>
        <td><span class="badge badge-gold">${c.bookingId}</span></td>
        <td>${c.name}</td>
        <td><span class="badge badge-success">₹${c.amount}</span></td>
        <td style="color:var(--muted);font-size:0.8rem">${c.date}</td>
        <td><span class="badge badge-success">Paid</span></td>
      </tr>
    `).join('');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

});
