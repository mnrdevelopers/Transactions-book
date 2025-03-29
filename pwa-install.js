// Modified toggleInstallButton function
function toggleInstallButton() {
  const installButton = document.getElementById('installButton');
  const dismissed = localStorage.getItem('installButtonDismissed');
  
  if (!isAppInstalled() && window.deferredPrompt && !dismissed) {
    installButton.style.display = 'block';
  } else {
    installButton.style.display = 'none';
  }
}

// Add a close button to the install prompt
function addCloseButton() {
  const installButton = document.getElementById('installButton');
  if (!installButton) return;
  
  const closeButton = document.createElement('span');
  closeButton.innerHTML = '&times;';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '-8px';
  closeButton.style.right = '-8px';
  closeButton.style.background = 'white';
  closeButton.style.borderRadius = '50%';
  closeButton.style.width = '24px';
  closeButton.style.height = '24px';
  closeButton.style.display = 'flex';
  closeButton.style.alignItems = 'center';
  closeButton.style.justifyContent = 'center';
  closeButton.style.cursor = 'pointer';
  closeButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
  
  closeButton.addEventListener('click', (e) => {
    e.stopPropagation();
    installButton.style.display = 'none';
    localStorage.setItem('installButtonDismissed', 'true');
  });
  
  installButton.style.position = 'relative';
  installButton.appendChild(closeButton);
}

// Call this in your load event
window.addEventListener('load', () => {
  toggleInstallButton();
  addCloseButton();
});
