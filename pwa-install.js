// Check if the app is already installed
function isAppInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.navigator.standalone ||
         document.referrer.includes('android-app://');
}

// Show/hide install button based on installation status
function toggleInstallButton() {
  const installButton = document.getElementById('installButton');
  
  if (!isAppInstalled() && window.deferredPrompt) {
    installButton.style.display = 'block';
  } else {
    installButton.style.display = 'none';
  }
}

// Initialize PWA install prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  // Update UI to notify the user they can install the PWA
  toggleInstallButton();
});

window.addEventListener('appinstalled', () => {
  // Hide the install button
  toggleInstallButton();
  // Clear the deferredPrompt so it can be garbage collected
  deferredPrompt = null;
  // Optionally show a success message
  alert('Thank you for installing RK Fashions Bill Book!');
});

// Handle install button click
document.getElementById('installButton')?.addEventListener('click', async () => {
  if (deferredPrompt) {
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    // Optionally send analytics about the installation
    console.log(`User response to the install prompt: ${outcome}`);
    // We've used the prompt, and can't use it again
    deferredPrompt = null;
    // Hide the install button regardless of outcome
    toggleInstallButton();
  }
});

// Check installation status on page load
window.addEventListener('load', () => {
  toggleInstallButton();
  
  // Also check periodically in case installation happens while the app is open
  setInterval(toggleInstallButton, 3000);
});

// Check installation status when the page becomes visible again
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    toggleInstallButton();
  }
});
