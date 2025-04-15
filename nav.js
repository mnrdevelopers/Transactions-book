// nav.js - Universal Navigation Handler
document.addEventListener('DOMContentLoaded', function() {
    // Only run if mobile nav exists on the page
    const navBar = document.querySelector('.mobile-bottom-nav');
    if (!navBar) return;

    // 1. Smooth transitions for navigation
    const handleNavigation = (e) => {
        const link = e.currentTarget;
        
        // Skip if it's an external link or anchor link
        if (link.target === '_blank' || link.href.includes('#') || !link.href.startsWith(window.location.origin)) {
            return;
        }

        e.preventDefault();
        navBar.classList.add('hidden');
        
        // Add loading indicator
        document.body.classList.add('page-transition');
        
        setTimeout(() => {
            window.location.href = link.href;
        }, 300);
    };

    // 2. Attach to all nav links
    document.querySelectorAll('.mobile-nav-btn').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });

    // 3. Initialize active state (redundant check)
    const currentPage = window.location.pathname.split('/').pop().toLowerCase();
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        const btnPage = btn.getAttribute('href').split('/').pop().toLowerCase();
        btn.classList.toggle('active', 
            currentPage === btnPage || 
            currentPage.startsWith(btnPage.replace('.html', '')) ||
            (btnPage === 'dashboard.html' && currentPage === 'index.html')
        );
    });

    // 4. Show nav when loaded
    navBar.classList.remove('hidden');
});
