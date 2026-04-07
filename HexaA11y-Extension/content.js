(() => {
    if (window.hexaA11yLoaded) return;
    window.hexaA11yLoaded = true;

    let fontScale = 0;
    let voices = [];
    let selectedVoiceName = localStorage.getItem("hexa_voice") || "";

    function loadVoices() {
        voices = window.speechSynthesis.getVoices() || [];
        const voiceSelect = document.getElementById("hexaVoiceSelect");
        if (!voiceSelect) return;

        voiceSelect.innerHTML = `<option value="">Voz padrão do navegador</option>`;

        const ptVoices = voices.filter(v =>
            (v.lang || "").toLowerCase().includes("pt")
        );

        const list = ptVoices.length ? ptVoices : voices;

        list.forEach(v => {
            const option = document.createElement("option");
            option.value = v.name;
            option.textContent = `${v.name} (${v.lang})`;
            if (v.name === selectedVoiceName) option.selected = true;
            voiceSelect.appendChild(option);
        });
    }

    function getSelectedVoice() {
        if (!selectedVoiceName) return null;
        return voices.find(v => v.name === selectedVoiceName) || null;
    }

    function speakText(text) {
        if (!("speechSynthesis" in window)) {
            alert("Este navegador não suporta leitura por voz.");
            return;
        }

        if (!text || !text.trim()) {
            alert("Não há texto suficiente para leitura nesta página.");
            return;
        }

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "pt-BR";
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;

        const voice = getSelectedVoice();
        if (voice) utterance.voice = voice;

        window.speechSynthesis.speak(utterance);
    }

    function stopSpeech() {
        if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
        }
    }

    function getPageText() {
        const blacklist = ["script", "style", "noscript"];
        const texts = [];

        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode(node) {
                    if (!node.parentElement) return NodeFilter.FILTER_REJECT;
                    const tag = node.parentElement.tagName.toLowerCase();
                    if (blacklist.includes(tag)) return NodeFilter.FILTER_REJECT;
                    const value = node.nodeValue.trim();
                    if (!value) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        while (walker.nextNode()) {
            texts.push(walker.currentNode.nodeValue.trim());
        }

        return texts.join(" ").replace(/\s+/g, " ").slice(0, 5000);
    }

    function increaseFont() {
        fontScale += 1;
        document.documentElement.style.fontSize = `${16 + fontScale}px`;
    }

    function decreaseFont() {
        fontScale -= 1;
        const size = Math.max(10, 16 + fontScale);
        document.documentElement.style.fontSize = `${size}px`;
    }

    function toggleContrast() {
        document.documentElement.classList.toggle("hexa-contrast");
    }

    function createWidget() {
        if (document.getElementById("hexaA11y-root")) return;

        const root = document.createElement("div");
        root.id = "hexaA11y-root";

        root.innerHTML = `
            <button id="hexaA11y-toggle" title="Abrir acessibilidade">♿</button>

            <div id="hexaA11y-panel" class="hexa-hidden">
                <div class="hexa-header">
                    <span>HexaA11y</span>
                    <button id="hexaA11y-close" title="Fechar">×</button>
                </div>

                <div class="hexa-body">
                    <button class="hexa-btn" id="hexaIncrease">A+</button>
                    <button class="hexa-btn" id="hexaDecrease">A-</button>
                    <button class="hexa-btn" id="hexaContrast">Contraste</button>
                    <button class="hexa-btn" id="hexaRead">Ler página</button>
                    <button class="hexa-btn" id="hexaStop">Parar voz</button>

                    <label class="hexa-label" for="hexaVoiceSelect">Selecionar voz</label>
                    <select id="hexaVoiceSelect" class="hexa-select"></select>

                    <div class="hexa-status" id="hexaStatus">
                        VLibras: tentando carregar...
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(root);

        const toggle = document.getElementById("hexaA11y-toggle");
        const panel = document.getElementById("hexaA11y-panel");
        const close = document.getElementById("hexaA11y-close");
        const voiceSelect = document.getElementById("hexaVoiceSelect");

        toggle.addEventListener("click", () => {
            panel.classList.toggle("hexa-hidden");
        });

        close.addEventListener("click", () => {
            panel.classList.add("hexa-hidden");
        });

        document.getElementById("hexaIncrease").addEventListener("click", increaseFont);
        document.getElementById("hexaDecrease").addEventListener("click", decreaseFont);
        document.getElementById("hexaContrast").addEventListener("click", toggleContrast);
        document.getElementById("hexaRead").addEventListener("click", () => {
            speakText(getPageText());
        });
        document.getElementById("hexaStop").addEventListener("click", stopSpeech);

        voiceSelect.addEventListener("change", () => {
            selectedVoiceName = voiceSelect.value;
            localStorage.setItem("hexa_voice", selectedVoiceName);
        });

        loadVoices();

        if ("speechSynthesis" in window) {
            window.speechSynthesis.onvoiceschanged = () => {
                loadVoices();
            };
        }

        tryLoadVLibras();
    }

    function tryLoadVLibras() {
        const status = document.getElementById("hexaStatus");
        if (document.getElementById("vlibras-plugin-script")) {
            if (status) status.textContent = "VLibras: já carregado.";
            return;
        }

        const script = document.createElement("script");
        script.id = "vlibras-plugin-script";
        script.src = "https://vlibras.gov.br/app/vlibras-plugin.js";
        script.async = true;

        script.onload = () => {
            try {
                const vw = document.createElement("div");
                vw.setAttribute("vw", "");
                vw.className = "enabled";

                const accessButton = document.createElement("div");
                accessButton.setAttribute("vw-access-button", "");
                accessButton.className = "active";

                const pluginWrapper = document.createElement("div");
                pluginWrapper.setAttribute("vw-plugin-wrapper", "");

                const pluginTopWrapper = document.createElement("div");
                pluginTopWrapper.className = "vw-plugin-top-wrapper";

                pluginWrapper.appendChild(pluginTopWrapper);
                vw.appendChild(accessButton);
                vw.appendChild(pluginWrapper);
                document.body.appendChild(vw);

                if (window.VLibras && typeof window.VLibras.Widget === "function") {
                    new window.VLibras.Widget("https://vlibras.gov.br/app");
                    if (status) status.textContent = "VLibras: carregado.";
                } else {
                    if (status) status.textContent = "VLibras: script carregou, mas o widget não iniciou.";
                }
            } catch (e) {
                if (status) status.textContent = "VLibras: falhou ao iniciar.";
                console.error("Erro ao iniciar VLibras:", e);
            }
        };

        script.onerror = () => {
            if (status) {
                status.textContent = "VLibras: bloqueado neste site ou não carregou.";
            }
        };

        document.documentElement.appendChild(script);
    }

    function start() {
        if (!document.body) {
            const observer = new MutationObserver(() => {
                if (document.body) {
                    observer.disconnect();
                    createWidget();
                }
            });

            observer.observe(document.documentElement, {
                childList: true,
                subtree: true
            });

            return;
        }

        createWidget();
    }

    start();
})();
