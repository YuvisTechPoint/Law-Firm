/* ============================================
   PLUGINS.JS — Central Plugin Registry
   ============================================ */

const PluginSystem = {
  plugins: {},

  register(name, plugin) {
    this.plugins[name] = plugin;
  },

  init(name) {
    if (this.plugins[name] && this.plugins[name].init) {
      try {
        this.plugins[name].init();
      } catch (e) {
        console.error(`Plugin [${name}] failed:`, e);
      }
    }
  },

  initAll() {
    Object.keys(this.plugins).forEach(name => this.init(name));
  }
};

// ─── Plugin: Scroll Reveal ───────────────────────────────────
PluginSystem.register('scrollReveal', {
  init() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, .stagger-children')
      .forEach(el => observer.observe(el));
  }
});

// ─── Plugin: WhatsApp Float ──────────────────────────────────
PluginSystem.register('chatWidget', {
  init() {
    const existing = document.getElementById('whatsapp-float');
    if (existing) return;
    const btn = document.createElement('a');
    btn.id = 'whatsapp-float';
    btn.className = 'whatsapp-float';
    btn.href = 'https://wa.me/919800000000?text=Hello%2C%20I%20need%20legal%20assistance';
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.setAttribute('aria-label', 'Chat on WhatsApp');
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;
    document.body.appendChild(btn);
  }
});

// ─── Plugin: Back to Top ─────────────────────────────────────
PluginSystem.register('backToTop', {
  init() {
    const btn = document.getElementById('back-to-top');
    if (!btn) return;
    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 400);
    });
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
});

// ─── Plugin: Google Reviews ──────────────────────────────────
PluginSystem.register('googleReviews', {
  staticReviews: [
    { author: "Priya Sharma", rating: 5, text: "Exceptional legal guidance at every step. The team's professionalism and dedication to our case was truly outstanding. Got our property dispute resolved in record time.", date: "2 weeks ago", initials: "PS" },
    { author: "Arjun Mehta", rating: 5, text: "Got my complex property title dispute resolved quickly. The advocates were extremely knowledgeable and kept me informed throughout. Highly recommended for any legal matter.", date: "1 month ago", initials: "AM" },
    { author: "Sunita Rao", rating: 5, text: "Amazing service for my divorce case. They handled everything with utmost sensitivity and professionalism. The process was smooth and they got the best outcome for our children.", date: "3 weeks ago", initials: "SR" },
    { author: "Vikram Nair", rating: 5, text: "Best corporate law firm in the city. They incorporated our startup perfectly and provided invaluable counsel on our shareholder agreement. Very reasonable fees too!", date: "2 months ago", initials: "VN" },
    { author: "Ananya Bose", rating: 5, text: "The cyber crime team is exceptional. Within 48 hours of filing my complaint through them, the police registered an FIR and my money was recovered. True professionals.", date: "1 month ago", initials: "AB" },
    { author: "Rohit Kapoor", rating: 5, text: "Filed a consumer complaint against a builder. The RERA hearing went excellently. The advocates are well-prepared and argue brilliantly. Got full refund with interest!", date: "6 weeks ago", initials: "RK" }
  ],

  init() {
    const container = document.getElementById('reviews-container');
    if (!container) return;
    this.render(container);
  },

  render(container) {
    container.innerHTML = this.staticReviews.map(r => `
      <div class="review-card reveal">
        <div class="review-header">
          <div class="avatar avatar-sm">${r.initials}</div>
          <div class="review-meta">
            <div class="reviewer-name">${r.author}</div>
            <div class="review-date">${r.date}</div>
          </div>
        </div>
        <div class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
        <p class="review-text" style="margin-top:8px">${r.text}</p>
        <div class="google-badge-icon">
          <span class="google-g">G</span> <span>Google Review</span>
        </div>
      </div>
    `).join('');
  }
});

// ─── Plugin: Razor Pay ───────────────────────────────────────
PluginSystem.register('razorpay', {
  init() {
    // Razorpay setup is handled in payment.js
  }
});

// ─── Plugin: Toast Notifications ────────────────────────────
PluginSystem.register('toasts', {
  init() {
    if (!document.getElementById('toast-container')) {
      const container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    // Expose globally
    window.showToast = this.show;
  },

  show(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    toast.innerHTML = `<span>${icons[type] || icons.info}</span> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'toastSlideOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
});

// ─── Plugin: Custom Cursor ───────────────────────────────────
PluginSystem.register('customCursor', {
  init() {
    if (window.innerWidth < 768) return;
    const cursor = document.createElement('div');
    cursor.id = 'custom-cursor';
    cursor.style.cssText = `
      position: fixed; width: 20px; height: 20px;
      border: 2px solid var(--gold, #C9A84C); border-radius: 50%;
      pointer-events: none; z-index: 99999;
      transform: translate(-50%, -50%);
      transition: transform 0.1s ease, opacity 0.2s;
      mix-blend-mode: normal;
    `;
    document.body.appendChild(cursor);
    document.addEventListener('mousemove', (e) => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
    });
    document.addEventListener('mousedown', () => {
      cursor.style.transform = 'translate(-50%, -50%) scale(0.7)';
    });
    document.addEventListener('mouseup', () => {
      cursor.style.transform = 'translate(-50%, -50%) scale(1)';
    });
  }
});

// ─── Plugin: Scroll Progress Bar ────────────────────────────
PluginSystem.register('scrollProgress', {
  init() {
    const bar = document.getElementById('scroll-progress');
    if (!bar) return;
    window.addEventListener('scroll', () => {
      const scrolled = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      bar.style.width = Math.min(scrolled, 100) + '%';
    });
  }
});

// ─── Plugin: Q&A System ─────────────────────────────────────
PluginSystem.register('qaSystem', {
  init() {
    // Loaded and handled in qa.js
  }
});

// Initialize all plugins on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  PluginSystem.initAll();
});
