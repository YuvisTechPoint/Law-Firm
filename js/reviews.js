/* ============================================
   REVIEWS.JS — Google Reviews Plugin
   ============================================ */

const staticReviews = [
  { author: "Priya Sharma", rating: 5, text: "Exceptional legal guidance at every step. The team's professionalism and dedication to our case was truly outstanding. Got our property dispute resolved in record time.", date: "2 weeks ago", initials: "PS" },
  { author: "Arjun Mehta", rating: 5, text: "Got my complex property title dispute resolved quickly. The advocates were extremely knowledgeable and kept me informed throughout. Highly recommended for any legal matter.", date: "1 month ago", initials: "AM" },
  { author: "Sunita Rao", rating: 5, text: "Amazing service for my divorce case. They handled everything with utmost sensitivity and professionalism. The process was smooth and they secured best outcome for our children.", date: "3 weeks ago", initials: "SR" },
  { author: "Vikram Nair", rating: 5, text: "Best corporate law firm in the city. They incorporated our startup perfectly and provided invaluable counsel on our shareholder agreement. Very reasonable fees too!", date: "2 months ago", initials: "VN" },
  { author: "Ananya Bose", rating: 5, text: "The cyber crime team is exceptional. Within 48 hours of filing my complaint through them, the police registered an FIR and my money was recovered. True professionals.", date: "1 month ago", initials: "AB" },
  { author: "Rohit Kapoor", rating: 5, text: "Filed a consumer complaint against a builder through them. The RERA hearing went excellently. Got full refund with interest. Five stars without hesitation!", date: "6 weeks ago", initials: "RK" }
];

function loadGoogleReviews(placeId, apiKey) {
  // In production, use Google Places API
  // For now, fall back to static reviews
  renderReviews(staticReviews);
}

function renderReviews(reviews) {
  const container = document.getElementById('reviews-container');
  if (!container) return;
  container.innerHTML = reviews.map(r => `
    <div class="review-card reveal">
      <div class="review-header">
        <div class="avatar avatar-sm" style="background:linear-gradient(135deg,#C9A84C,#E8C97A)">${r.initials || r.author[0]}</div>
        <div class="review-meta">
          <div class="reviewer-name">${r.author}</div>
          <div class="review-date">${r.date}</div>
        </div>
      </div>
      <div class="stars" style="font-size:0.9rem;margin:6px 0">${'★'.repeat(r.rating)}</div>
      <p class="review-text">${r.text}</p>
      <div class="google-badge-icon">
        <span class="google-g">G</span> <span>Posted on Google</span>
      </div>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('reviews-container');
  if (container) {
    renderReviews(staticReviews);
  }
});
