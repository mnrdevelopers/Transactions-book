let deferredPrompt;

window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;

    const installButton = document.createElement("button");
    installButton.textContent = "Install App";
    installButton.style.position = "fixed";
    installButton.style.bottom = "20px";
    installButton.style.right = "20px";
    document.body.appendChild(installButton);

    installButton.addEventListener("click", () => {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choice) => {
            if (choice.outcome === "accepted") {
                console.log("User installed the PWA");
            } else {
                console.log("User dismissed the install prompt");
            }
            installButton.remove();
        });
    });
});
