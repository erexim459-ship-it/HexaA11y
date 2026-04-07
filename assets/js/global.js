document.addEventListener("DOMContentLoaded", () => {

    // ===============================
    // BOTÃO + CONTAINER VLibras
    // ===============================
    const container = document.createElement("div");
    container.setAttribute("vw", "");
    container.classList.add("enabled");

    container.innerHTML = `
        <div vw-access-button class="active"></div>
        <div vw-plugin-wrapper>
            <div class="vw-plugin-top-wrapper"></div>
        </div>
    `;

    document.body.appendChild(container);

    // ===============================
    // SCRIPT VLibras
    // ===============================
    const script = document.createElement("script");
    script.src = "https://vlibras.gov.br/app/vlibras-plugin.js";

    script.onload = () => {
        if (window.VLibras) {
            new window.VLibras.Widget("https://vlibras.gov.br/app");
            console.log("VLibras ativo em todas as páginas");
        } else {
            console.error("VLibras não carregou");
        }
    };

    document.body.appendChild(script);

});