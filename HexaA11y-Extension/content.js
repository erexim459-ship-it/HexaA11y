(() => {
    if (window.hexaA11yLoaded) return;
    window.hexaA11yLoaded = true;

    function criarWidget() {
        if (document.getElementById("hexaA11y-root")) return;

        const root = document.createElement("div");
        root.id = "hexaA11y-root";
        root.innerHTML = `
            <button id="hexaA11y-toggle" aria-label="Abrir acessibilidade">
                ♿
            </button>

            <div id="hexaA11y-panel" class="hexa-hidden">
                <div class="hexa-header">
                    <span>HexaA11y</span>
                    <button id="hexaA11y-close" aria-label="Fechar">×</button>
                </div>

                <div class="hexa-body">
                    <button class="hexa-btn" data-action="increase-text">A+</button>
                    <button class="hexa-btn" data-action="decrease-text">A-</button>
                    <button class="hexa-btn" data-action="contrast">Contraste</button>
                    <button class="hexa-btn" data-action="grayscale">Cinza</button>
                    <button class="hexa-btn" data-action="reading">Leitura</button>
                </div>
            </div>
        `;

        document.body.appendChild(root);

        const toggle = document.getElementById("hexaA11y-toggle");
        const panel = document.getElementById("hexaA11y-panel");
        const close = document.getElementById("hexaA11y-close");

        toggle.addEventListener("click", () => {
            panel.classList.toggle("hexa-hidden");
        });

        close.addEventListener("click", () => {
            panel.classList.add("hexa-hidden");
        });

        document.querySelectorAll(".hexa-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const action = btn.dataset.action;
                executarAcao(action);
            });
        });
    }

    function executarAcao(action) {
        const html = document.documentElement;
        const body = document.body;

        switch (action) {
            case "increase-text":
                alterarFonte(1);
                break;

            case "decrease-text":
                alterarFonte(-1);
                break;

            case "contrast":
                body.classList.toggle("hexa-contrast");
                break;

            case "grayscale":
                body.classList.toggle("hexa-grayscale");
                break;

            case "reading":
                lerTextoPagina();
                break;
        }
    }

    function alterarFonte(direcao) {
        const atual = parseFloat(
            window.getComputedStyle(document.documentElement).fontSize
        );
        const novo = Math.max(10, Math.min(24, atual + direcao));
        document.documentElement.style.fontSize = `${novo}px`;
    }

    function lerTextoPagina() {
        if (!("speechSynthesis" in window)) {
            alert("Leitura de voz não suportada neste navegador.");
            return;
        }

        const texto = document.body.innerText.slice(0, 4000).trim();
        if (!texto) return;

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(texto);
        utterance.lang = "pt-BR";
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;

        window.speechSynthesis.speak(utterance);
    }

    function iniciarQuandoBodyExistir() {
        if (document.body) {
            criarWidget();
            return;
        }

        const observer = new MutationObserver(() => {
            if (document.body) {
                observer.disconnect();
                criarWidget();
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    iniciarQuandoBodyExistir();
})();