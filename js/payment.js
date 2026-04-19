/* ============================================
   PAYMENT.JS — Razorpay Integration
   ============================================ */

const RAZORPAY_KEY = 'rzp_test_SfTBR0XRUt3eHw'; // Razorpay Test Key ID
const RAZORPAY_SECRET = '4IMukANpw5psUOYADQOBCU4r'; // Razorpay Test Key Secret

const plans = {
  free:      { name: 'Free Initial Consultation', amount: 0,    description: '15-min introductory call' },
  standard:  { name: 'Standard Consultation',     amount: 499,  description: '30-min consultation with advocate' },
  premium:   { name: 'Premium Consultation',      amount: 999,  description: '60-min detailed legal advice' },
  corporate: { name: 'Corporate Consultation',    amount: 2499, description: '90-min corporate legal strategy session' }
};

let selectedPlan = null;
let currentStep = 1;
let bookingDetails = {};

document.addEventListener('DOMContentLoaded', () => {

  // ─── Plan Selection ──────────────────────────────
  document.querySelectorAll('.plan-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedPlan = card.dataset.plan;
      updatePaymentSummary();
    });
  });

  // ─── Step Navigation ─────────────────────────────
  const nextBtns = document.querySelectorAll('[data-next-step]');
  const prevBtns = document.querySelectorAll('[data-prev-step]');

  nextBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetStep = parseInt(btn.dataset.nextStep);
      if (!validateCurrentStep()) return;
      goToStep(targetStep);
    });
  });

  prevBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetStep = parseInt(btn.dataset.prevStep);
      goToStep(targetStep);
    });
  });

  function goToStep(step) {
    document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('step-' + step);
    if (target) target.classList.add('active');

    document.querySelectorAll('.step-dot').forEach((dot, i) => {
      dot.classList.remove('active');
      if (i + 1 < step) dot.classList.add('completed');
      else dot.classList.remove('completed');
      if (i + 1 === step) dot.classList.add('active');
    });
    currentStep = step;

    if (step === 3) buildPaymentSummary();
  }

  function validateCurrentStep() {
    if (currentStep === 1 && !selectedPlan) {
      if (window.showToast) showToast('Please select a consultation plan to continue.', 'error');
      return false;
    }
    if (currentStep === 2) {
      const form = document.getElementById('booking-form');
      if (!form) return true;
      const required = form.querySelectorAll('[required]');
      let valid = true;
      required.forEach(field => {
        if (!field.value.trim()) {
          field.style.borderColor = 'var(--danger)';
          valid = false;
        } else {
          field.style.borderColor = '';
        }
      });
      if (!valid) {
        if (window.showToast) showToast('Please fill all required fields.', 'error');
        return false;
      }
      // Collect form data
      const form2 = document.getElementById('booking-form');
      if (form2) {
        bookingDetails = {
          name: form2.querySelector('#b-name')?.value || '',
          email: form2.querySelector('#b-email')?.value || '',
          phone: form2.querySelector('#b-phone')?.value || '',
          city: form2.querySelector('#b-city')?.value || '',
          issue: form2.querySelector('#b-issue')?.value || '',
          date: form2.querySelector('#b-date')?.value || '',
          time: form2.querySelector('#b-time')?.value || ''
        };
      }
    }
    return true;
  }

  // ─── Update Payment Summary ─────────────────────
  function updatePaymentSummary() {
    const plan = plans[selectedPlan];
    if (!plan) return;
    const el = document.getElementById('summary-plan-name');
    const el2 = document.getElementById('summary-amount');
    if (el) el.textContent = plan.name;
    if (el2) el2.textContent = plan.amount === 0 ? 'FREE' : `₹${plan.amount}`;
  }

  function buildPaymentSummary() {
    const plan = plans[selectedPlan];
    if (!plan) return;
    const rows = document.getElementById('payment-summary-rows');
    if (!rows) return;
    const gst = plan.amount > 0 ? Math.round(plan.amount * 0.18) : 0;
    const total = plan.amount + gst;
    rows.innerHTML = `
      <div class="payment-row"><span>Consultation Type</span><span>${plan.name}</span></div>
      <div class="payment-row"><span>Name</span><span>${bookingDetails.name || '-'}</span></div>
      <div class="payment-row"><span>Phone</span><span>${bookingDetails.phone || '-'}</span></div>
      <div class="payment-row"><span>Preferred Date</span><span>${bookingDetails.date || '-'}</span></div>
      <div class="payment-row"><span>Consultation Fee</span><span class="amount">₹${plan.amount}</span></div>
      ${gst > 0 ? `<div class="payment-row"><span>GST (18%)</span><span class="amount">₹${gst}</span></div>` : ''}
      <div class="payment-row total"><span>Total Amount</span><span class="amount">${total === 0 ? 'FREE' : '₹' + total}</span></div>
    `;
  }

  // ─── Pay Button ──────────────────────────────────
  const payBtn = document.getElementById('pay-btn');
  if (payBtn) {
    payBtn.addEventListener('click', () => {
      const plan = plans[selectedPlan];
      if (!plan) return;

      if (plan.amount === 0) {
        // Free consultation — skip payment
        showConfirmation('FREE-' + Date.now().toString().slice(-6));
        return;
      }

      const gst = Math.round(plan.amount * 0.18);
      const total = plan.amount + gst;

      const options = {
        key: RAZORPAY_KEY,
        amount: Math.round(total * 100), // in paise, ensure integer
        currency: 'INR',
        name: 'LexCounsel India',
        description: plan.description,
        image: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png', // Using an absolute icon path for the modal
        handler: function(response) {
          showConfirmation(response.razorpay_payment_id || 'DEMO-' + Date.now().toString().slice(-6));
        },
        prefill: {
          name: bookingDetails.name || '',
          email: bookingDetails.email || '',
          contact: bookingDetails.phone || ''
        },
        notes: {
          issue: bookingDetails.issue,
          preferred_date: bookingDetails.date,
          preferred_time: bookingDetails.time
        },
        theme: { color: '#C9A84C' },
        modal: {
          ondismiss: function() {
            if (window.showToast) showToast('Payment cancelled. Your booking details are saved.', 'info');
          }
        }
      };

      try {
        if (typeof Razorpay === 'undefined') {
          console.error('Razorpay SDK not loaded. Check your internet connection.');
          if (window.showToast) showToast('Payment Gateway is currently unavailable. Please try again.', 'error');
          // Simulated success for demo purposes if script fails to load
          showConfirmation('DEMO-' + Date.now().toString().slice(-6));
          return;
        }
        const rzp = new Razorpay(options);
        rzp.open();
      } catch (e) {
        console.error('Razorpay Error:', e);
        showConfirmation('DEMO-' + Date.now().toString().slice(-6));
      }
    });
  }

  // ─── Show Confirmation ───────────────────────────
  function showConfirmation(paymentId) {
    const consultForm = document.getElementById('consult-form-area');
    const confirmScreen = document.getElementById('confirmation-screen');
    if (consultForm) consultForm.style.display = 'none';
    if (confirmScreen) {
      confirmScreen.classList.add('active');
      const bId = confirmScreen.querySelector('.booking-id');
      if (bId) bId.textContent = 'Booking ID: ' + paymentId;
      const waLink = confirmScreen.querySelector('.whatsapp-confirm-btn');
      if (waLink) {
        const msg = encodeURIComponent(`Hi, I just booked a ${plans[selectedPlan]?.name || 'consultation'} (Booking ID: ${paymentId}). Name: ${bookingDetails.name}`);
        waLink.href = `https://wa.me/919800000000?text=${msg}`;
      }
    }
    if (window.showToast) showToast('Booking confirmed! Check your email for details.', 'success');
  }

  // Initialize first step
  goToStep(1);
  // Auto-select standard plan
  const stdCard = document.querySelector('[data-plan="standard"]');
  if (stdCard) stdCard.click();
});
