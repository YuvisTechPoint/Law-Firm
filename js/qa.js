/* ============================================
   QA.JS — Q&A Forum Logic
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {

  let questions = [];
  let activeCategory = 'All';
  let activeFilter = '';

  // Load questions from localStorage or JSON
  const stored = localStorage.getItem('lf_questions');
  if (stored) {
    questions = JSON.parse(stored);
  } else {
    try {
      const res = await fetch('../data/questions.json');
      questions = await res.json();
      localStorage.setItem('lf_questions', JSON.stringify(questions));
    } catch {
      questions = getSeedQuestions();
      localStorage.setItem('lf_questions', JSON.stringify(questions));
    }
  }

  renderSidebar();
  renderQuestions(questions);
  setupForm();
  setupSearch();

  // ─── Render Sidebar ──────────────────────────────
  function renderSidebar() {
    const sidebar = document.getElementById('qa-category-list');
    if (!sidebar) return;

    const categories = ['All', ...new Set(questions.map(q => q.category))];
    sidebar.innerHTML = categories.map(cat => {
      const count = cat === 'All' ? questions.length : questions.filter(q => q.category === cat).length;
      return `
        <div class="category-filter-item ${cat === 'All' ? 'active' : ''}" data-cat="${cat}">
          <span>${cat === 'All' ? '📋 All Questions' : cat}</span>
          <span class="category-count">${count}</span>
        </div>
      `;
    }).join('');

    sidebar.querySelectorAll('.category-filter-item').forEach(item => {
      item.addEventListener('click', () => {
        sidebar.querySelectorAll('.category-filter-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        activeCategory = item.dataset.cat;
        filterAndRender();
      });
    });
  }

  // ─── Render Questions ────────────────────────────
  function renderQuestions(list) {
    const container = document.getElementById('qa-questions-list');
    if (!container) return;

    if (!list.length) {
      container.innerHTML = `<div class="card" style="text-align:center;padding:3rem">
        <p style="color:var(--muted)">No questions found in this category yet.</p>
      </div>`;
      return;
    }

    container.innerHTML = list.map(q => `
      <div class="question-card reveal" data-id="${q.id}">
        <div class="question-top">
          <div class="question-badges">
            <span class="badge badge-gold">${q.category}</span>
            <span class="badge ${q.status === 'answered' ? 'badge-success' : 'badge-warning'}">
              ${q.status === 'answered' ? '✓ Answered' : '⏳ Pending'}
            </span>
          </div>
        </div>
        <div class="question-title">${escapeHtml(q.title)}</div>
        <div class="question-body">${escapeHtml(q.body)}</div>
        <div class="question-meta">
          <span>👤 ${escapeHtml(q.name)}</span>
          <span>📍 ${escapeHtml(q.city)}</span>
          <span>📅 ${formatDate(q.date)}</span>
        </div>
        <div class="question-actions">
          ${q.status === 'answered' ? `
            <button class="view-answer-btn" data-id="${q.id}">
              View Answer <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          ` : ''}
          <button class="helpful-btn" data-id="${q.id}" data-helpful="${q.helpful || 0}">
            👍 Helpful <span class="helpful-count">${q.helpful || 0}</span>
          </button>
        </div>
        ${q.status === 'answered' && q.reply ? `
          <div class="answer-section" id="answer-${q.id}">
            <div class="answer-header">
              <div class="avatar avatar-sm">${q.reply.advocate.charAt(5)}</div>
              <div>
                <div class="answer-advocate">${escapeHtml(q.reply.advocate)}</div>
                <div class="answer-designation">${escapeHtml(q.reply.designation)}</div>
                <div style="font-size:0.75rem;color:var(--muted)">${formatDate(q.reply.date)}</div>
              </div>
            </div>
            <div class="answer-text">${escapeHtml(q.reply.text)}</div>
          </div>
        ` : ''}
      </div>
    `).join('');

    // View answer toggle
    container.querySelectorAll('.view-answer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const answerSec = document.getElementById('answer-' + btn.dataset.id);
        if (answerSec) {
          answerSec.classList.toggle('visible');
          btn.textContent = answerSec.classList.contains('visible') ? 'Hide Answer ↑' : 'View Answer →';
        }
      });
    });

    // Helpful button
    container.querySelectorAll('.helpful-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('active')) return;
        btn.classList.add('active');
        const count = btn.querySelector('.helpful-count');
        const newVal = parseInt(count.textContent) + 1;
        count.textContent = newVal;
        const q = questions.find(q => q.id == btn.dataset.id);
        if (q) { q.helpful = newVal; saveQuestions(); }
      });
    });

    // Re-observe for scroll reveal
    document.querySelectorAll('.reveal').forEach(el => {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); obs.unobserve(e.target); } });
      }, { threshold: 0.08 });
      obs.observe(el);
    });
  }

  // ─── Filter & Render ────────────────────────────
  function filterAndRender() {
    let filtered = questions;
    if (activeCategory !== 'All') {
      filtered = filtered.filter(q => q.category === activeCategory);
    }
    if (activeFilter) {
      filtered = filtered.filter(q =>
        q.title.toLowerCase().includes(activeFilter) ||
        q.body.toLowerCase().includes(activeFilter)
      );
    }
    renderQuestions(filtered);
  }

  // ─── Setup Search ────────────────────────────────
  function setupSearch() {
    const searchInput = document.getElementById('qa-search');
    if (!searchInput) return;
    searchInput.addEventListener('input', (e) => {
      activeFilter = e.target.value.toLowerCase().trim();
      filterAndRender();
    });
  }

  // ─── Setup Submit Form ───────────────────────────
  function setupForm() {
    const form = document.getElementById('qa-submit-form');
    if (!form) return;

    // Character counters
    const titleInput = form.querySelector('#q-title');
    const bodyInput = form.querySelector('#q-body');
    const titleCount = form.querySelector('#title-count');
    const bodyCount = form.querySelector('#body-count');

    if (titleInput && titleCount) {
      titleInput.addEventListener('input', () => {
        titleCount.textContent = `${titleInput.value.length}/100`;
      });
    }
    if (bodyInput && bodyCount) {
      bodyInput.addEventListener('input', () => {
        bodyCount.textContent = `${bodyInput.value.length}/500`;
      });
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const newQ = {
        id: Date.now(),
        name: formData.get('name'),
        email: formData.get('email'),
        category: formData.get('category'),
        title: formData.get('title'),
        body: formData.get('body'),
        city: formData.get('city') || 'India',
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        helpful: 0,
        reply: null
      };
      questions.unshift(newQ);
      saveQuestions();
      renderSidebar();
      filterAndRender();
      form.reset();
      if (titleCount) titleCount.textContent = '0/100';
      if (bodyCount) bodyCount.textContent = '0/500';
      if (window.showToast) showToast('Your question has been submitted and is pending review by our advocates.', 'success');
    });
  }

  function saveQuestions() {
    localStorage.setItem('lf_questions', JSON.stringify(questions));
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function getSeedQuestions() {
    return [
      { id:1, name:"Rahul S.", email:"r@e.com", category:"Property", title:"Can landlord evict without notice?", body:"My landlord is threatening eviction without notice. We have a verbal agreement for 3 years. What are my rights?", date:"2024-03-15", city:"Kolkata", status:"answered", helpful:24, reply:{advocate:"Adv. Subhashis Paul",designation:"Senior Advocate",text:"Under the Transfer of Property Act, a landlord must give proper notice before eviction. Verbal agreements are recognized under Indian law.",date:"2024-03-16"}},
      { id:2, name:"Sunita M.", email:"s@e.com", category:"Family", title:"Divorce if husband is abroad?", body:"My husband works in UAE and we want mutual divorce. Can it be done if he cannot return to India?", date:"2024-03-18", city:"Mumbai", status:"answered", helpful:31, reply:{advocate:"Adv. Priya Sharma",designation:"Family Law Specialist",text:"Yes, mutual consent divorce is possible if your husband grants a Special Power of Attorney to someone in India.",date:"2024-03-19"}},
      { id:3, name:"Dev P.", email:"d@e.com", category:"Corporate", title:"How to register startup as LLP?", body:"I want to register my tech startup as an LLP. I have a co-founder. What documents are needed and how long does it take?", date:"2024-03-25", city:"Bangalore", status:"pending", helpful:9, reply:null}
    ];
  }
});
