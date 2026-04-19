/* ============================================
   PAYMENT.JS — Razorpay Integration
   ============================================ */

const RAZORPAY_KEY = 'rzp_test_SfTBR0XRUt3eHw'; // Razorpay Test Key ID

const plans = {
  free:      { name: 'Free Initial Consultation', amount: 0,    description: '15-min introductory call' },
  standard:  { name: 'Standard Consultation',     amount: 499,  description: '30-min consultation with advocate' },
  premium:   { name: 'Premium Consultation',      amount: 999,  description: '60-min detailed legal advice' },
  corporate: { name: 'Corporate Consultation',    amount: 2499, description: '90-min corporate legal strategy session' }
};

let selectedPlan = null;
let currentStep = 1;
let bookingDetails = {};

// ─── Toast Notification Function ─────────────────
function showToast(message, type = 'info') {
  console.log(`[${type.toUpperCase()}] ${message}`);
  
  // Create toast element if it doesn't exist
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      font-family: var(--font-body, 'Inter', sans-serif);
    `;
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const bgColor = type === 'success' ? 'rgba(46, 204, 113, 0.9)' : 
                  type === 'error' ? 'rgba(231, 76, 60, 0.9)' : 
                  'rgba(52, 152, 219, 0.9)';
  
  toast.style.cssText = `
    background: ${bgColor};
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    margin-bottom: 10px;
    animation: slideIn 0.3s ease-out;
    font-size: 14px;
  `;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('Payment.js initialized - Razorpay Key:', RAZORPAY_KEY.slice(0, 15) + '...');

  // ─── Plan Selection ──────────────────────────────
  document.querySelectorAll('.plan-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedPlan = card.dataset.plan;
      console.log('Plan selected:', selectedPlan);
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
    console.log('Going to step:', step);
    document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('step-' + step);
    if (target) {
      target.classList.add('active');
      target.style.display = 'block';
    }

    document.querySelectorAll('.step-dot').forEach((dot, i) => {
      dot.classList.remove('active', 'completed');
      if (i + 1 < step) dot.classList.add('completed');
      if (i + 1 === step) dot.classList.add('active');
    });
    currentStep = step;

    if (step === 3) buildPaymentSummary();
  }

  function validateCurrentStep() {
    if (currentStep === 1 && !selectedPlan) {
      showToast('Please select a consultation plan to continue.', 'error');
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
        showToast('Please fill all required fields.', 'error');
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
      console.log('Pay button clicked');
      const plan = plans[selectedPlan];
      if (!plan) {
        showToast('Please select a plan first', 'error');
        return;
      }

      if (plan.amount === 0) {
        // Free consultation — skip payment
        console.log('Free consultation selected');
        showConfirmation('FREE-' + Date.now().toString().slice(-6));
        return;
      }

      const gst = Math.round(plan.amount * 0.18);
      const total = plan.amount + gst;
      console.log('Opening Razorpay with amount:', total);

      const options = {
        key: RAZORPAY_KEY,
        amount: Math.round(total * 100), // in paise, ensure integer
        currency: 'INR',
        name: 'LexCounsel India',
        description: plan.description,
        image: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
        handler: function(response) {
          console.log('Payment successful:', response);
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
        theme: { color: '#D4AF37' },
        modal: {
          ondismiss: function() {
            console.log('Payment dismissed');
            showToast('Payment cancelled. Your booking details are saved.', 'info');
          }
        }
      };

      try {
        if (typeof Razorpay === 'undefined') {
          console.error('Razorpay SDK not loaded');
          showToast('Payment Gateway loading... please try again in 2 seconds', 'error');
          setTimeout(() => {
            // Retry
            const rzp = new Razorpay(options);
            rzp.open();
          }, 2000);
          return;
        }
        console.log('Creating Razorpay instance...');
        const rzp = new Razorpay(options);
        rzp.open();
      } catch (e) {
        console.error('Razorpay Error:', e);
        showToast('Error opening payment gateway: ' + e.message, 'error');
      }
    });
  }

  // ─── Show Confirmation ───────────────────────────
  function showConfirmation(paymentId) {
    console.log('Showing confirmation with ID:', paymentId);
    const consultForm = document.getElementById('consult-form-area');
    const confirmScreen = document.getElementById('confirmation-screen');
    if (consultForm) consultForm.style.display = 'none';
    if (confirmScreen) {
      confirmScreen.classList.add('active');
      confirmScreen.style.display = 'block';
      const bId = confirmScreen.querySelector('.booking-id');
      if (bId) bId.textContent = 'Booking ID: ' + paymentId;
      const waLink = confirmScreen.querySelector('.whatsapp-confirm-btn');
      if (waLink) {
        const msg = encodeURIComponent(`Hi, I just booked a ${plans[selectedPlan]?.name || 'consultation'} (Booking ID: ${paymentId}). Name: ${bookingDetails.name}`);
        waLink.href = `https://wa.me/919800000000?text=${msg}`;
      }
    }
    showToast('✓ Booking confirmed! Check your email for details.', 'success');
  }

  // Initialize first step
  goToStep(1);
  // Auto-select standard plan
  const stdCard = document.querySelector('[data-plan="standard"]');
  if (stdCard) stdCard.click();
});
