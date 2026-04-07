(function () {
    if (window.__hexaA11yLoaded) return;
    window.__hexaA11yLoaded = true;

    // BOTÃO
    const btn = document.createElement("div");
    btn.id = "hexa-btn";
    btn.innerHTML = "♿";

    // PAINEL
    const panel = document.createElement("div");
    panel.id = "hexa-panel";
    panel.innerHTML = `
        <button id="zoom-in">A+</button>
        <button id="zoom-out">A-</button>
        <button id="contrast">Contraste</button>
    `;

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    // EVENTOS
    btn.onclick = () => {
        panel.classList.toggle("open");
    };

    let zoom = 1;

    document.getElementById("zoom-in").onclick = () => {
        zoom += 0.1;
        document.body.style.zoom = zoom;
    };

    document.getElementById("zoom-out").onclick = () => {
        zoom -= 0.1;
        document.body.style.zoom = zoom;
    };

    document.getElementById("contrast").onclick = () => {
        document.body.classList.toggle("hexa-contrast");
    };

})();