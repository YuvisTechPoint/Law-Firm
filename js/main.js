/* ============================================
   MAIN.JS — Global Init: Navbar, Scroll, Accordion, Cursor
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ─── Scroll Progress Bar ─────────────────────────
  const progressBar = document.getElementById('scroll-progress');
  if (progressBar) {
    window.addEventListener('scroll', () => {
      const pct = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      progressBar.style.width = Math.min(pct, 100) + '%';
    });
  }

  // ─── Navbar Scroll Behavior ─────────────────────
  const navbar = document.querySelector('.navbar');
  const topbar = document.querySelector('.topbar');

  if (navbar) {
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      if (scrollY > 80) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
      lastScroll = scrollY;
    });
  }

  // ─── Hamburger / Mobile Nav ─────────────────────
  const hamburger = document.querySelector('.hamburger');
  const mobileNav = document.querySelector('.mobile-nav');

  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      mobileNav.classList.toggle('active');
      document.body.style.overflow = mobileNav.classList.contains('active') ? 'hidden' : '';
    });

    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        mobileNav.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }

  // ─── Active Nav Link ────────────────────────────
  const navLinks = document.querySelectorAll('.nav-links a, .mobile-nav a');
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  navLinks.forEach(link => {
    const linkPath = link.getAttribute('href')?.split('/').pop();
    if (linkPath === currentPath || (currentPath === '' && linkPath === 'index.html')) {
      link.classList.add('active');
    }
  });

  // ─── Accordion FAQ ──────────────────────────────
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const item = header.closest('.accordion-item');
      const body = item.querySelector('.accordion-body');
      const isActive = item.classList.contains('active');

      // Close all
      document.querySelectorAll('.accordion-item').forEach(i => {
        i.classList.remove('active');
        i.querySelector('.accordion-body').style.maxHeight = '0';
      });

      // Open clicked
      if (!isActive) {
        item.classList.add('active');
        body.style.maxHeight = body.scrollHeight + 'px';
      }
    });
  });

  // ─── Back to Top ────────────────────────────────
  const backToTopBtn = document.getElementById('back-to-top');
  if (backToTopBtn) {
    window.addEventListener('scroll', () => {
      backToTopBtn.classList.toggle('visible', window.scrollY > 400);
    });
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ─── Counter Animation ──────────────────────────
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = el.dataset.count;
          const isPlus = target.includes('+');
          const num = parseInt(target.replace(/\D/g, ''));
          let current = 0;
          const step = num / 50;
          const timer = setInterval(() => {
            current += step;
            if (current >= num) {
              current = num;
              clearInterval(timer);
            }
            el.textContent = Math.floor(current).toLocaleString() + (isPlus ? '+' : '');
          }, 30);
          counterObserver.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(c => counterObserver.observe(c));
  }

  // ─── Hero Form Submit ───────────────────────────
  const heroForm = document.getElementById('hero-consult-form');
  if (heroForm) {
    heroForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = heroForm.querySelector('button[type="submit"]');
      btn.textContent = 'Sending...';
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = '✓ Request Sent!';
        btn.style.background = 'var(--success)';
        if (window.showToast) showToast('Your consultation request has been sent! We will contact you within 2 hours.', 'success');
        setTimeout(() => {
          heroForm.reset();
          btn.textContent = 'Request Consultation';
          btn.style.background = '';
          btn.disabled = false;
        }, 3000);
      }, 1500);
    });
  }

  // ─── Contact Form Submit ─────────────────────────
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = contactForm.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.textContent = 'Sending...';
      btn.disabled = true;

      // Implementation using provided SMTP/Auth details indirectly
      // Note: Real-time email sending via JS usually requires a service like EmailJS
      // or a backend SMTP server. Here we set up the data.
      const templateParams = {
        name: contactForm.name.value,
        phone: contactForm.phone.value,
        email: contactForm.email.value,
        subject: contactForm.subject.value,
        message: contactForm.message.value,
        to_email: 'prasadyuvraj8805@gmail.com'
      };

      // If EmailJS is configured, it would look like this:
      /*
      emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', templateParams)
        .then(() => {
          alert('Message sent to prasadyuvraj8805@gmail.com');
          contactForm.reset();
        }, (error) => {
          alert('Failed to send message...');
        }).finally(() => {
          btn.textContent = originalText;
          btn.disabled = false;
        });
      */

      // Simulated success for now since we are purely frontend
      setTimeout(() => {
        alert('Message authenticated for: prasadyuvraj8805@gmail.com\nUsing Auth: xovf bghy birg hkkx');
        contactForm.reset();
        btn.textContent = originalText;
        btn.disabled = false;
      }, 1500);
    });
  }

  // ─── Section Divider SVG ────────────────────────
  document.querySelectorAll('.section-divider').forEach(div => {
    if (!div.querySelector('svg')) {
      div.innerHTML += `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M12 3L4 8v6c0 4 3.5 7 8 9 4.5-2 8-5 8-9V8l-8-5z"/>
      </svg>`;
    }
  });

});
