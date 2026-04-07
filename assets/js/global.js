(function () {
    function iniciarAcessibilidade() {
        if (!document.querySelector("[vw]")) {
            const wrapper = document.createElement("div");
            wrapper.setAttribute("vw", "");
            wrapper.className = "enabled";
            wrapper.innerHTML = `
                <div vw-access-button class="active"></div>
                <div vw-plugin-wrapper>
                    <div class="vw-plugin-top-wrapper"></div>
                </div>
            `;
            document.body.appendChild(wrapper);
        }

        if (!document.querySelector('script[src*="vlibras-plugin.js"]')) {
            const script = document.createElement("script");
            script.src = "https://vlibras.gov.br/app/vlibras-plugin.js";
            script.onload = function () {
                if (window.VLibras && !window.__vlibrasInicializado) {
                    window.__vlibrasInicializado = true;
                    new window.VLibras.Widget("https://vlibras.gov.br/app");
                }
            };
            document.body.appendChild(script);
        } else if (window.VLibras && !window.__vlibrasInicializado) {
            window.__vlibrasInicializado = true;
            new window.VLibras.Widget("https://vlibras.gov.br/app");
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciarAcessibilidade);
    } else {
        iniciarAcessibilidade();
    }
})();