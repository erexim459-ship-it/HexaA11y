(() => {
    if (window.hexaA11yLoaded) return;
    window.hexaA11yLoaded = true;

    let voices = [];
    let selectedVoiceName = localStorage.getItem("hexa_voice") || "";
    let selectedVoiceMode = localStorage.getItem("hexa_voice_mode") || "auto";
    let fontSizeOffset = Number(localStorage.getItem("hexa_font_offset") || "0");

    function applySavedFontSize() {
        const base = 16;
        const finalSize = Math.max(10, Math.min(28, base + fontSizeOffset));
        document.documentElement.style.fontSize = `${finalSize}px`;
    }

    function loadVoices() {
        if (!("speechSynthesis" in window)) return;

        voices = window.speechSynthesis.getVoices() || [];
        const select = document.getElementById("hexaVoiceSelect");
        if (!select) return;

        select.innerHTML = `<option value="">Automática do navegador</option>`;

        const preferred = voices.filter(v =>
            (v.lang || "").toLowerCase().includes("pt")
        );

        const list = preferred.length ? preferred : voices;

        list.forEach(voice => {
            const option = document.createElement("option");
            option.value = voice.name;
            option.textContent = `${voice.name} (${voice.lang})`;
            if (voice.name === selectedVoiceName) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }

    function getSelectedVoice() {
        if (!selectedVoiceName) return null;
        return voices.find(v => v.name === selectedVoiceName) || null;
    }

    function getReadablePageText() {
        if (!document.body) return "";

        const blockedTags = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "IFRAME", "SVG"]);
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                if (blockedTags.has(parent.tagName)) return NodeFilter.FILTER_REJECT;

                const text = (node.nodeValue || "").trim();
                if (!text) return NodeFilter.FILTER_REJECT;

                return NodeFilter.FILTER_ACCEPT;
            }
        });

        const parts = [];
        while (walker.nextNode()) {
            const text = walker.currentNode.nodeValue.trim();
            if (text) parts.push(text);
        }

        return parts.join(" ").replace(/\s+/g, " ").slice(0, 5000);
    }

    function updateAvatarSpeaking(isSpeaking) {
        const avatar = document.querySelector(".hexa-avatar");
        if (!avatar) return;

        if (isSpeaking) {
            avatar.classList.add("speaking");
        } else {
            avatar.classList.remove("speaking");
        }
    }

    function speakPage() {
        if (!("speechSynthesis" in window)) {
            setStatus("Leitura por voz não suportada neste navegador.");
            return;
        }

        const text = getReadablePageText();
        if (!text) {
            setStatus("Não encontrei texto suficiente para leitura.");
            return;
        }

        stopSpeech();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "pt-BR";
        utterance.rate = selectedVoiceMode === "slow" ? 0.9 : 1;
        utterance.pitch = 1;
        utterance.volume = 1;

        const selected = getSelectedVoice();
        if (selected) utterance.voice = selected;

        utterance.onstart = () => {
            updateAvatarSpeaking(true);
            setStatus("Lendo o conteúdo da página...");
        };

        utterance.onend = () => {
            updateAvatarSpeaking(false);
            setStatus("Leitura finalizada.");
        };

        utterance.onerror = () => {
            updateAvatarSpeaking(false);
            setStatus("Falha ao reproduzir a leitura.");
        };

        window.speechSynthesis.speak(utterance);
    }

    function stopSpeech() {
        if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
        }
        updateAvatarSpeaking(false);
        setStatus("Leitura interrompida.");
    }

    function increaseFont() {
        fontSizeOffset = Math.min(fontSizeOffset + 1, 12);
        localStorage.setItem("hexa_font_offset", String(fontSizeOffset));
        applySavedFontSize();
        setStatus("Fonte aumentada.");
    }

    function decreaseFont() {
        fontSizeOffset = Math.max(fontSizeOffset - 1, -6);
        localStorage.setItem("hexa_font_offset", String(fontSizeOffset));
        applySavedFontSize();
        setStatus("Fonte diminuída.");
    }

    function toggleContrast() {
        document.documentElement.classList.toggle("hexa-high-contrast");
        const enabled = document.documentElement.classList.contains("hexa-high-contrast");
        setStatus(enabled ? "Alto contraste ativado." : "Alto contraste desativado.");
    }

    function setStatus(message) {
        const status = document.getElementById("hexaStatusText");
        if (status) status.textContent = message;
    }

    function togglePanel(forceOpen = null) {
        const widget = document.getElementById("hexaWidget");
        if (!widget) return;

        const isHidden = widget.classList.contains("hexa-hidden");
        const shouldOpen = forceOpen === null ? isHidden : forceOpen;

        widget.classList.toggle("hexa-hidden", !shouldOpen);
    }

    function createWidget() {
        if (document.getElementById("hexaA11yRoot")) return;

        const root = document.createElement("div");
        root.id = "hexaA11yRoot";

        root.innerHTML = `
            <button id="hexaFloatingButton" class="hexa-floating-btn" aria-label="Abrir acessibilidade" title="Acessibilidade">
                ♿
            </button>

            <div id="hexaWidget" class="hexa-widget hexa-hidden">
                <div class="hexa-header">
                    <div class="hexa-avatar-wrap">
                        <div class="hexa-avatar-glow"></div>
                        <div class="hexa-avatar">
                            <div class="hexa-face">
                                <span class="hexa-eye left"></span>
                                <span class="hexa-eye right"></span>
                                <span class="hexa-mouth"></span>
                            </div>
                        </div>
                    </div>

                    <div class="hexa-title">
                        <h3>HexaA11y</h3>
                        <p>Assistente visual de acessibilidade</p>
                    </div>

                    <button id="hexaCloseButton" class="hexa-close-btn" aria-label="Fechar painel" title="Fechar painel">×</button>
                </div>

                <div class="hexa-content">
                    <div class="hexa-side-text">
                        <p id="hexaStatusText">Olá. Posso ajudar com leitura da página, contraste e ampliação visual.</p>
                    </div>

                    <div class="hexa-actions-panel">
                        <div class="hexa-group">
                            <label class="hexa-label" for="hexaVoiceMode">Modo de voz</label>
                            <select id="hexaVoiceMode" class="hexa-select">
                                <option value="auto">Automática</option>
                                <option value="slow">Mais suave</option>
                            </select>
                        </div>

                        <div class="hexa-group">
                            <label class="hexa-label" for="hexaVoiceSelect">Voz do navegador</label>
                            <select id="hexaVoiceSelect" class="hexa-select"></select>
                        </div>

                        <button class="hexa-action-btn" id="hexaReadButton">🔊 Ler página</button>
                        <button class="hexa-action-btn" id="hexaStopButton">⏹ Parar leitura</button>
                        <button class="hexa-action-btn" id="hexaIncreaseButton">🔎 Aumentar fonte</button>
                        <button class="hexa-action-btn" id="hexaDecreaseButton">🔽 Diminuir fonte</button>
                        <button class="hexa-action-btn" id="hexaContrastButton">🌙 Alto contraste</button>
                    </div>
                </div>

                <button class="hexa-resize-handle" id="hexaResizeHandle" aria-label="Redimensionar"></button>
            </div>

            <button id="hexaVlibrasButton" class="hexa-vlibras-btn" aria-label="Abrir VLibras" title="VLibras">
                🤟
            </button>
        `;

        document.body.appendChild(root);

        const floatingButton = document.getElementById("hexaFloatingButton");
        const closeButton = document.getElementById("hexaCloseButton");
        const voiceSelect = document.getElementById("hexaVoiceSelect");
        const voiceMode = document.getElementById("hexaVoiceMode");
        const vlibrasButton = document.getElementById("hexaVlibrasButton");

        floatingButton.addEventListener("click", () => togglePanel());
        closeButton.addEventListener("click", () => togglePanel(false));

        document.getElementById("hexaReadButton").addEventListener("click", speakPage);
        document.getElementById("hexaStopButton").addEventListener("click", stopSpeech);
        document.getElementById("hexaIncreaseButton").addEventListener("click", increaseFont);
        document.getElementById("hexaDecreaseButton").addEventListener("click", decreaseFont);
        document.getElementById("hexaContrastButton").addEventListener("click", toggleContrast);

        voiceSelect.addEventListener("change", () => {
            selectedVoiceName = voiceSelect.value;
            localStorage.setItem("hexa_voice", selectedVoiceName);
            setStatus("Voz do navegador atualizada.");
        });

        voiceMode.value = selectedVoiceMode;
        voiceMode.addEventListener("change", () => {
            selectedVoiceMode = voiceMode.value;
            localStorage.setItem("hexa_voice_mode", selectedVoiceMode);
            setStatus("Modo de voz atualizado.");
        });

        vlibrasButton.addEventListener("click", () => {
            loadVLibras();
        });

        loadVoices();

        if ("speechSynthesis" in window) {
            window.speechSynthesis.onvoiceschanged = () => {
                loadVoices();
            };
        }

        setupResize();
        applySavedFontSize();
    }

    function loadVLibras() {
        if (window.VLibras) {
            setStatus("VLibras já está disponível nesta página.");
            return;
        }

        if (document.getElementById("vlibras-plugin-script")) {
            setStatus("VLibras já está sendo carregado...");
            return;
        }

        setStatus("Carregando VLibras...");

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
                    setStatus("VLibras carregado com sucesso.");
                } else {
                    setStatus("O script do VLibras carregou, mas o widget não iniciou.");
                }
            } catch (error) {
                console.error(error);
                setStatus("Falha ao iniciar o VLibras.");
            }
        };

        script.onerror = () => {
            setStatus("Este site bloqueou o carregamento do VLibras.");
        };

        document.documentElement.appendChild(script);
    }

    function setupResize() {
        const widget = document.getElementById("hexaWidget");
        const handle = document.getElementById("hexaResizeHandle");
        if (!widget || !handle) return;

        let resizing = false;
        let startX = 0;
        let startY = 0;
        let startWidth = 0;
        let startHeight = 0;

        const move = (event) => {
            if (!resizing) return;

            const clientX = event.touches ? event.touches[0].clientX : event.clientX;
            const clientY = event.touches ? event.touches[0].clientY : event.clientY;

            const nextWidth = Math.max(320, Math.min(window.innerWidth - 20, startWidth + (clientX - startX)));
            const nextHeight = Math.max(420, Math.min(window.innerHeight - 20, startHeight + (clientY - startY)));

            widget.style.width = `${nextWidth}px`;
            widget.style.height = `${nextHeight}px`;
        };

        const end = () => {
            resizing = false;
            document.removeEventListener("mousemove", move);
            document.removeEventListener("mouseup", end);
            document.removeEventListener("touchmove", move);
            document.removeEventListener("touchend", end);
        };

        const start = (event) => {
            event.preventDefault();
            resizing = true;

            const clientX = event.touches ? event.touches[0].clientX : event.clientX;
            const clientY = event.touches ? event.touches[0].clientY : event.clientY;

            startX = clientX;
            startY = clientY;
            startWidth = widget.offsetWidth;
            startHeight = widget.offsetHeight;

            document.addEventListener("mousemove", move);
            document.addEventListener("mouseup", end);
            document.addEventListener("touchmove", move, { passive: false });
            document.addEventListener("touchend", end);
        };

        handle.addEventListener("mousedown", start);
        handle.addEventListener("touchstart", start, { passive: false });
    }

    function init() {
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

    init();
})();
