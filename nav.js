// nav.js
document.addEventListener('DOMContentLoaded', function() {
  // Initialize nav elements
  const nav = document.querySelector('.offcanvas-nav');
  const toggle = document.querySelector('.nav-toggle');
  const close = document.querySelector('.nav-close');
  const overlay = document.querySelector('.nav-overlay');
  
  // Toggle nav function
  function toggleNav() {
    nav.classList.toggle('open');
  }
  
  // Event listeners
  toggle.addEventListener('click', toggleNav);
  close.addEventListener('click', toggleNav);
  overlay.addEventListener('click', toggleNav);
  
  // Highlight current page
  const currentPage = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('href') === currentPage) {
      link.parentElement.classList.add('active');
    }
  });
});
