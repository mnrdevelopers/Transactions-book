// Show loading state during page transitions
document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.mobile-nav-btn, .fab');
    const navBar = document.querySelector('.mobile-bottom-nav');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Don't prevent default if it's an external link
            if (!this.href || this.target === '_blank') return;
            
            e.preventDefault();
            
            // Add loading state
            if (navBar) navBar.classList.add('hidden');
            document.body.classList.add('page-transition');
            
            // Delay navigation slightly for smooth transition
            setTimeout(() => {
                window.location.href = this.href;
            }, 300);
        });
    });
    
    // Show nav when page loads
    if (navBar) navBar.classList.remove('hidden');
});
