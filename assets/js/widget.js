(function () {
    "use strict";

    const CONFIG = {
        ttsEndpoint: (window.HexaA11yConfig && window.HexaA11yConfig.ttsEndpoint) || "/api/tts",
        ttsEnabled: true,
        maxTextLength: 5000,
        maxBrowserFallbackLength: 5000,
        buttonSize: 64,
        widgetGap: 14,
        screenMargin: 12,

        defaultFontPercent: 100,
        minFontPercent: 80,
        maxFontPercent: 140,
        fontStep: 10,

        defaultWidgetWidth: 340,
        defaultWidgetHeight: 560,
        minWidgetWidth: 300,
        minWidgetHeight: 320,

        designWidth: 340,
        designHeight: 560,
        minScale: 0.82,
        maxScale: 1.7,

        resizeHandleSize: 28,
        touchResizeHandleSize: 38,

        storageKeys: {
            mode: "hexa_voice_mode",
            browserVoice: "hexa_browser_voice",
            buttonLeft: "hexa_button_left",
            buttonTop: "hexa_button_top",
            widgetWidth: "hexa_widget_width",
            widgetHeight: "hexa_widget_height"
        }
    };

    let contrasteAtivo = false;
    let fonteAtual = CONFIG.defaultFontPercent;
    let lendoAgora = false;

    let arrastandoBotao = false;
    let moveuBotao = false;
    let ponteiroBotaoAtual = null;
    let offsetX = 0;
    let offsetY = 0;

    let redimensionandoWidget = false;
    let ponteiroResizeAtual = null;
    let resizeStartX = 0;
    let resizeStartY = 0;
    let resizeStartWidth = 0;
    let resizeStartHeight = 0;

    let vozesDisponiveis = [];
    let vozSelecionada = null;
    let filaFalas = [];
    let indiceFalaAtual = 0;
    let audioAtual = null;
    let abortControllerTts = null;

    let modoVoz = localStorage.getItem(CONFIG.storageKeys.mode) || "auto";
    let nomeVozSalva = localStorage.getItem(CONFIG.storageKeys.browserVoice) || "";

    const botao = document.createElement("button");
    botao.className = "hexa-btn";
    botao.setAttribute("aria-label", "Abrir acessibilidade");
    botao.setAttribute("type", "button");
    botao.innerHTML = "♿";

    const widget = document.createElement("section");
    widget.className = "hexa-widget";
    widget.setAttribute("aria-label", "Painel de acessibilidade");
    widget.innerHTML = `
        <div class="hexa-header">
            <div class="hexa-avatar-wrap">
                <div class="hexa-avatar-glow"></div>
                <div class="hexa-avatar" id="hexaAvatar">
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
        </div>

        <div class="hexa-body">
            <div class="hexa-status" id="hexaStatus">
                Olá. Posso ajudar com leitura da página, contraste e ampliação visual.
            </div>

            <div class="hexa-actions">
                <div class="hexa-voice-config">
                    <label class="hexa-label" for="hexaVoiceMode">Modo de voz</label>
                    <select class="hexa-select" id="hexaVoiceMode">
                        <option value="auto">Automática</option>
                        <option value="neural">Neural</option>
                        <option value="browser">Navegador</option>
                    </select>
                </div>

                <div class="hexa-voice-config">
                    <label class="hexa-label" for="hexaBrowserVoice">Voz do navegador</label>
                    <select class="hexa-select" id="hexaBrowserVoice">
                        <option value="">Carregando vozes...</option>
                    </select>
                </div>

                <button class="hexa-action" id="hexaLerPagina">🔊 Ler página</button>
                <button class="hexa-action" id="hexaPararLeitura">⏹️ Parar leitura</button>
                <button class="hexa-action" id="hexaAumentarFonte">🔎 Aumentar fonte</button>
                <button class="hexa-action" id="hexaDiminuirFonte">🔽 Diminuir fonte</button>
                <button class="hexa-action" id="hexaContraste">🌙 Alto contraste</button>
            </div>
        </div>

        <button class="hexa-resize-handle" type="button" aria-label="Redimensionar painel"></button>
    `;

    document.body.appendChild(botao);
    document.body.appendChild(widget);

    const avatar = document.getElementById("hexaAvatar");
    const status = document.getElementById("hexaStatus");
    const btnLerPagina = document.getElementById("hexaLerPagina");
    const btnPararLeitura = document.getElementById("hexaPararLeitura");
    const btnAumentarFonte = document.getElementById("hexaAumentarFonte");
    const btnDiminuirFonte = document.getElementById("hexaDiminuirFonte");
    const btnContraste = document.getElementById("hexaContraste");
    const selectVoiceMode = document.getElementById("hexaVoiceMode");
    const selectBrowserVoice = document.getElementById("hexaBrowserVoice");
    const resizeHandle = widget.querySelector(".hexa-resize-handle");

    selectVoiceMode.value = modoVoz;

    function atualizarStatus(texto) {
        status.textContent = texto;
    }

    function iniciarAnimacaoFala() {
        avatar.classList.add("speaking");
    }

    function pararAnimacaoFala() {
        avatar.classList.remove("speaking");
    }

    function clamp(valor, min, max) {
        return Math.min(Math.max(valor, min), max);
    }

    function isTouchDevice() {
        return window.matchMedia("(pointer: coarse)").matches;
    }

    function obterPosicaoBotao() {
        const rect = botao.getBoundingClientRect();

        return {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height
        };
    }

    function obterLimitesWidget() {
        const larguraMaxima = Math.max(CONFIG.minWidgetWidth, window.innerWidth - (CONFIG.screenMargin * 2));
        const alturaMaxima = Math.max(CONFIG.minWidgetHeight, window.innerHeight - (CONFIG.screenMargin * 2));

        return {
            larguraMaxima,
            alturaMaxima
        };
    }

    function calcularEscalaProporcional(largura, altura) {
        const escalaLargura = largura / CONFIG.designWidth;
        const escalaAltura = altura / CONFIG.designHeight;
        return clamp(Math.min(escalaLargura, escalaAltura), CONFIG.minScale, CONFIG.maxScale);
    }

    function aplicarEscalaInterna(largura, altura) {
        const escala = calcularEscalaProporcional(largura, altura);
        widget.style.setProperty("--hexa-scale", String(escala));
        widget.style.setProperty("--hexa-width", `${Math.round(largura)}px`);
        widget.style.setProperty("--hexa-height", `${Math.round(altura)}px`);
    }

    function aplicarTamanhoWidget(largura, altura) {
        const { larguraMaxima, alturaMaxima } = obterLimitesWidget();

        const larguraFinal = clamp(largura, CONFIG.minWidgetWidth, larguraMaxima);
        const alturaFinal = clamp(altura, CONFIG.minWidgetHeight, alturaMaxima);

        widget.style.width = `${larguraFinal}px`;
        widget.style.height = `${alturaFinal}px`;
        widget.style.maxWidth = `${larguraMaxima}px`;
        widget.style.maxHeight = `${alturaMaxima}px`;

        aplicarEscalaInterna(larguraFinal, alturaFinal);
    }

    function aplicarTamanhoSalvoWidget() {
        const larguraSalva = Number(localStorage.getItem(CONFIG.storageKeys.widgetWidth));
        const alturaSalva = Number(localStorage.getItem(CONFIG.storageKeys.widgetHeight));

        const largura = Number.isNaN(larguraSalva) ? CONFIG.defaultWidgetWidth : larguraSalva;
        const altura = Number.isNaN(alturaSalva) ? CONFIG.defaultWidgetHeight : alturaSalva;

        aplicarTamanhoWidget(largura, altura);
    }

    function salvarTamanhoWidget() {
        const rect = widget.getBoundingClientRect();

        localStorage.setItem(CONFIG.storageKeys.widgetWidth, String(Math.round(rect.width)));
        localStorage.setItem(CONFIG.storageKeys.widgetHeight, String(Math.round(rect.height)));
    }

    function limitarPosicaoWidgetAoViewport() {
        const rect = widget.getBoundingClientRect();
        let left = rect.left;
        let top = rect.top;

        const maxLeft = window.innerWidth - rect.width - CONFIG.screenMargin;
        const maxTop = window.innerHeight - rect.height - CONFIG.screenMargin;

        left = clamp(left, CONFIG.screenMargin, maxLeft);
        top = clamp(top, CONFIG.screenMargin, maxTop);

        widget.style.left = `${left}px`;
        widget.style.top = `${top}px`;
        widget.style.right = "auto";
        widget.style.bottom = "auto";
    }

    function posicionarWidget() {
        const rect = obterPosicaoBotao();

        aplicarTamanhoSalvoWidget();

        widget.style.left = "";
        widget.style.right = "";
        widget.style.top = "";
        widget.style.bottom = "";
        widget.style.display = "flex";

        const larguraWidget = widget.offsetWidth;
        const alturaWidget = widget.offsetHeight;

        let left = rect.left - (larguraWidget - rect.width);
        if (left < CONFIG.screenMargin) {
            left = CONFIG.screenMargin;
        }
        if (left + larguraWidget > window.innerWidth - CONFIG.screenMargin) {
            left = window.innerWidth - larguraWidget - CONFIG.screenMargin;
        }

        let top = rect.top - alturaWidget - CONFIG.widgetGap;
        if (top < CONFIG.screenMargin) {
            top = rect.bottom + CONFIG.widgetGap;
        }
        if (top + alturaWidget > window.innerHeight - CONFIG.screenMargin) {
            top = window.innerHeight - alturaWidget - CONFIG.screenMargin;
        }

        widget.style.left = `${left}px`;
        widget.style.top = `${top}px`;
    }

    function abrirOuFecharWidget() {
        if (widget.style.display === "flex") {
            widget.style.display = "none";
            return;
        }

        posicionarWidget();
    }

    function escolherMelhorVoz(vozes) {
        if (!vozes || !vozes.length) {
            return null;
        }

        const prioridades = [
            "microsoft francisca",
            "microsoft antonio",
            "microsoft maria",
            "microsoft helia",
            "microsoft luciana",
            "luciana",
            "francisca",
            "google português do brasil",
            "google portuguese",
            "portuguese brazil",
            "pt-br"
        ];

        const vozesPtBr = vozes.filter((voz) => {
            const lang = (voz.lang || "").toLowerCase();
            return lang.includes("pt-br") || lang.startsWith("pt");
        });

        if (!vozesPtBr.length) {
            return vozes[0] || null;
        }

        for (const prioridade of prioridades) {
            const encontrada = vozesPtBr.find((voz) =>
                (voz.name || "").toLowerCase().includes(prioridade)
            );

            if (encontrada) {
                return encontrada;
            }
        }

        const vozLocal = vozesPtBr.find((voz) => voz.localService);
        if (vozLocal) {
            return vozLocal;
        }

        return vozesPtBr[0];
    }

    function preencherSelectVozes() {
        selectBrowserVoice.innerHTML = "";

        if (!vozesDisponiveis.length) {
            const option = document.createElement("option");
            option.value = "";
            option.textContent = "Nenhuma voz encontrada";
            selectBrowserVoice.appendChild(option);
            vozSelecionada = null;
            return;
        }

        const vozesPt = vozesDisponiveis.filter((voz) => {
            const lang = (voz.lang || "").toLowerCase();
            return lang.includes("pt") || lang.includes("br");
        });

        const lista = vozesPt.length ? vozesPt : vozesDisponiveis;

        lista.forEach((voz) => {
            const option = document.createElement("option");
            option.value = voz.name;
            option.textContent = `${voz.name} (${voz.lang})`;
            selectBrowserVoice.appendChild(option);
        });

        let vozFinal = null;

        if (nomeVozSalva) {
            vozFinal = lista.find((voz) => voz.name === nomeVozSalva) || null;
        }

        if (!vozFinal) {
            vozFinal = escolherMelhorVoz(lista);
        }

        vozSelecionada = vozFinal || null;

        if (vozSelecionada) {
            selectBrowserVoice.value = vozSelecionada.name;
            nomeVozSalva = vozSelecionada.name;
            localStorage.setItem(CONFIG.storageKeys.browserVoice, nomeVozSalva);
        }
    }

    function carregarVozes() {
        vozesDisponiveis = window.speechSynthesis.getVoices() || [];
        preencherSelectVozes();
    }

    function limparTextoParaLeitura(texto) {
        return (texto || "")
            .replace(/\s+/g, " ")
            .replace(/[ ]+([,.!?;:])/g, "$1")
            .trim();
    }

    function extrairTextoLegivel() {
        const elementosIgnorados = [
            "script",
            "style",
            "noscript",
            "iframe",
            "svg",
            "canvas",
            "[aria-hidden='true']",
            ".hexa-widget",
            ".hexa-btn",
            "[vw]",
            "[vw-access-button]",
            ".vw-plugin-wrapper",
            ".vw-window"
        ];

        const encontrados = document.querySelectorAll(elementosIgnorados.join(", "));
        const removidos = [];

        encontrados.forEach((elemento) => {
            removidos.push({
                elemento,
                parent: elemento.parentNode,
                nextSibling: elemento.nextSibling
            });

            if (elemento.parentNode) {
                elemento.parentNode.removeChild(elemento);
            }
        });

        let texto = "";

        try {
            texto = document.body ? document.body.innerText : "";
        } finally {
            removidos.forEach((item) => {
                if (!item.parent) return;

                if (item.nextSibling && item.nextSibling.parentNode === item.parent) {
                    item.parent.insertBefore(item.elemento, item.nextSibling);
                } else {
                    item.parent.appendChild(item.elemento);
                }
            });
        }

        return limparTextoParaLeitura(texto).slice(0, CONFIG.maxTextLength);
    }

    function quebrarTextoEmBlocos(texto, tamanhoMaximo = 220) {
        const frases = texto.match(/[^.!?]+[.!?]?/g) || [texto];
        const blocos = [];
        let atual = "";

        for (const fraseBruta of frases) {
            const frase = fraseBruta.trim();
            if (!frase) continue;

            if ((atual + " " + frase).trim().length <= tamanhoMaximo) {
                atual = (atual + " " + frase).trim();
            } else {
                if (atual) {
                    blocos.push(atual);
                }
                atual = frase;
            }
        }

        if (atual) {
            blocos.push(atual);
        }

        return blocos.length ? blocos : [texto];
    }

    function criarFala(texto) {
        const fala = new SpeechSynthesisUtterance(texto);
        fala.lang = (vozSelecionada && vozSelecionada.lang) || "pt-BR";
        fala.voice = vozSelecionada || null;
        fala.rate = 0.95;
        fala.pitch = 1;
        fala.volume = 1;
        return fala;
    }

    function finalizarLeitura() {
        lendoAgora = false;
        pararAnimacaoFala();
        atualizarStatus("Leitura finalizada.");
    }

    function falarProximoBlocoFallback() {
        if (indiceFalaAtual >= filaFalas.length) {
            finalizarLeitura();
            return;
        }

        const bloco = filaFalas[indiceFalaAtual];
        const fala = criarFala(bloco);

        fala.onstart = () => {
            lendoAgora = true;
            iniciarAnimacaoFala();

            const nomeVoz = vozSelecionada && vozSelecionada.name
                ? ` com a voz ${vozSelecionada.name}`
                : "";

            atualizarStatus(`Usando voz do navegador${nomeVoz}.`);
        };

        fala.onend = () => {
            indiceFalaAtual += 1;
            falarProximoBlocoFallback();
        };

        fala.onerror = () => {
            lendoAgora = false;
            pararAnimacaoFala();
            atualizarStatus("Não foi possível realizar a leitura neste navegador.");
        };

        window.speechSynthesis.speak(fala);
    }

    function lerComFallbackNavegador(texto) {
        window.speechSynthesis.cancel();
        carregarVozes();

        const textoLimpo = limparTextoParaLeitura(texto).slice(0, CONFIG.maxBrowserFallbackLength);

        if (!textoLimpo) {
            atualizarStatus("Não encontrei conteúdo legível nesta página.");
            return;
        }

        filaFalas = quebrarTextoEmBlocos(textoLimpo, 220);
        indiceFalaAtual = 0;
        falarProximoBlocoFallback();
    }

    async function solicitarTtsNeural(texto) {
        if (!CONFIG.ttsEnabled) {
            throw new Error("TTS neural desativado.");
        }

        abortControllerTts = new AbortController();

        const response = await fetch(CONFIG.ttsEndpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "audio/mpeg,audio/wav,audio/ogg,application/json"
            },
            body: JSON.stringify({
                text: texto,
                lang: "pt-BR"
            }),
            signal: abortControllerTts.signal
        });

        if (!response.ok) {
            const erroTexto = await response.text().catch(() => "");
            throw new Error(`Falha ao gerar TTS neural. Status ${response.status}. ${erroTexto}`);
        }

        const contentType = (response.headers.get("content-type") || "").toLowerCase();

        if (contentType.startsWith("audio/")) {
            const audioBlob = await response.blob();

            if (!audioBlob || !audioBlob.size) {
                throw new Error("Áudio vazio retornado pelo TTS neural.");
            }

            return audioBlob;
        }

        if (contentType.includes("application/json")) {
            const data = await response.json();

            if (data.audioBase64) {
                const mimeType = data.mimeType || "audio/mpeg";
                const byteCharacters = atob(data.audioBase64);
                const byteNumbers = new Array(byteCharacters.length);

                for (let i = 0; i < byteCharacters.length; i += 1) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }

                const byteArray = new Uint8Array(byteNumbers);
                const audioBlob = new Blob([byteArray], { type: mimeType });

                if (!audioBlob.size) {
                    throw new Error("Áudio base64 retornado vazio.");
                }

                return audioBlob;
            }

            throw new Error(data.message || "JSON retornado sem audioBase64.");
        }

        const respostaTexto = await response.text().catch(() => "");
        throw new Error(`Resposta inesperada do TTS neural: ${contentType || "sem content-type"}. ${respostaTexto}`);
    }

    function tocarAudioBlob(audioBlob) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(audioBlob);

            if (audioAtual) {
                audioAtual.pause();
                audioAtual.currentTime = 0;
                audioAtual = null;
            }

            audioAtual = new Audio();
            audioAtual.preload = "auto";
            audioAtual.src = url;

            let finalizado = false;

            const limpar = () => {
                if (finalizado) return;
                finalizado = true;

                if (audioAtual) {
                    audioAtual.onplay = null;
                    audioAtual.onended = null;
                    audioAtual.onerror = null;
                }

                URL.revokeObjectURL(url);
            };

            audioAtual.onplay = () => {
                lendoAgora = true;
                iniciarAnimacaoFala();
                atualizarStatus("Usando voz neural.");
            };

            audioAtual.onended = () => {
                limpar();
                lendoAgora = false;
                pararAnimacaoFala();
                atualizarStatus("Leitura finalizada.");
                resolve();
            };

            audioAtual.onerror = () => {
                limpar();
                lendoAgora = false;
                pararAnimacaoFala();
                reject(new Error("Falha ao reproduzir o áudio gerado."));
            };

            audioAtual.play().catch((erro) => {
                limpar();
                lendoAgora = false;
                pararAnimacaoFala();
                reject(erro);
            });
        });
    }

    async function lerPagina() {
        pararLeituraSilenciosamente();

        const texto = extrairTextoLegivel();

        if (!texto) {
            atualizarStatus("Não encontrei conteúdo legível nesta página.");
            return;
        }

        if (modoVoz === "browser") {
            atualizarStatus("Usando voz do navegador.");
            lerComFallbackNavegador(texto);
            return;
        }

        if (modoVoz === "neural") {
            try {
                atualizarStatus("Gerando voz neural...");
                const audioBlob = await solicitarTtsNeural(texto);
                await tocarAudioBlob(audioBlob);
            } catch (erro) {
                console.error("Falha no modo neural.", erro);
                atualizarStatus("Voz neural indisponível. Usando voz do navegador.");
                lerComFallbackNavegador(texto);
            }
            return;
        }

        try {
            atualizarStatus("Tentando voz neural...");
            const audioBlob = await solicitarTtsNeural(texto);
            await tocarAudioBlob(audioBlob);
        } catch (erro) {
            console.error("Falha no TTS neural. Aplicando fallback.", erro);
            atualizarStatus("TTS neural indisponível. Usando voz do navegador.");
            lerComFallbackNavegador(texto);
        }
    }

    function pararLeituraSilenciosamente() {
        if (abortControllerTts) {
            abortControllerTts.abort();
            abortControllerTts = null;
        }

        if (audioAtual) {
            audioAtual.pause();
            audioAtual.currentTime = 0;
            audioAtual = null;
        }

        window.speechSynthesis.cancel();

        lendoAgora = false;
        filaFalas = [];
        indiceFalaAtual = 0;
        pararAnimacaoFala();
    }

    function pararLeitura() {
        pararLeituraSilenciosamente();
        atualizarStatus("Leitura interrompida.");
    }

    function aplicarFonte() {
        document.documentElement.style.fontSize = `${fonteAtual}%`;
    }

    function aumentarFonte() {
        if (fonteAtual < CONFIG.maxFontPercent) {
            fonteAtual += CONFIG.fontStep;
            aplicarFonte();
            atualizarStatus(`Fonte ajustada para ${fonteAtual}%.`);
        }
    }

    function diminuirFonte() {
        if (fonteAtual > CONFIG.minFontPercent) {
            fonteAtual -= CONFIG.fontStep;
            aplicarFonte();
            atualizarStatus(`Fonte ajustada para ${fonteAtual}%.`);
        }
    }

    function alternarContraste() {
        contrasteAtivo = !contrasteAtivo;
        document.body.classList.toggle("hexa-high-contrast", contrasteAtivo);

        atualizarStatus(
            contrasteAtivo
                ? "Modo de alto contraste ativado."
                : "Modo de alto contraste desativado."
        );
    }

    function definirPosicaoBotao(left, top) {
        const maxLeft = window.innerWidth - CONFIG.buttonSize - CONFIG.screenMargin;
        const maxTop = window.innerHeight - CONFIG.buttonSize - CONFIG.screenMargin;

        const leftFinal = clamp(left, CONFIG.screenMargin, maxLeft);
        const topFinal = clamp(top, CONFIG.screenMargin, maxTop);

        botao.style.left = `${leftFinal}px`;
        botao.style.top = `${topFinal}px`;
        botao.style.right = "auto";
        botao.style.bottom = "auto";

        localStorage.setItem(CONFIG.storageKeys.buttonLeft, String(leftFinal));
        localStorage.setItem(CONFIG.storageKeys.buttonTop, String(topFinal));

        if (widget.style.display === "flex" && !redimensionandoWidget) {
            posicionarWidget();
        }
    }

    function restaurarPosicaoBotao() {
        const leftSalvo = Number(localStorage.getItem(CONFIG.storageKeys.buttonLeft));
        const topSalvo = Number(localStorage.getItem(CONFIG.storageKeys.buttonTop));

        if (!Number.isNaN(leftSalvo) && !Number.isNaN(topSalvo)) {
            definirPosicaoBotao(leftSalvo, topSalvo);
        }
    }

    function iniciarArrasteBotao(event) {
        if (event.target === resizeHandle) return;

        arrastandoBotao = true;
        moveuBotao = false;
        ponteiroBotaoAtual = event.pointerId;

        const rect = botao.getBoundingClientRect();
        offsetX = event.clientX - rect.left;
        offsetY = event.clientY - rect.top;

        botao.classList.add("dragging");
        botao.setPointerCapture(event.pointerId);
    }

    function moverBotao(event) {
        if (!arrastandoBotao || event.pointerId !== ponteiroBotaoAtual) {
            return;
        }

        const novoLeft = event.clientX - offsetX;
        const novoTop = event.clientY - offsetY;

        definirPosicaoBotao(novoLeft, novoTop);
        moveuBotao = true;
    }

    function finalizarArrasteBotao(event) {
        if (event.pointerId !== ponteiroBotaoAtual) {
            return;
        }

        arrastandoBotao = false;
        botao.classList.remove("dragging");

        try {
            botao.releasePointerCapture(event.pointerId);
        } catch (erro) {
            console.warn("Não foi possível liberar o pointer capture.", erro);
        }

        setTimeout(() => {
            moveuBotao = false;
        }, 50);
    }

    function iniciarResizeWidget(event) {
        event.preventDefault();
        event.stopPropagation();

        redimensionandoWidget = true;
        ponteiroResizeAtual = event.pointerId;
        resizeStartX = event.clientX;
        resizeStartY = event.clientY;

        const rect = widget.getBoundingClientRect();
        resizeStartWidth = rect.width;
        resizeStartHeight = rect.height;

        widget.classList.add("resizing");
        resizeHandle.setPointerCapture(event.pointerId);
    }

    function moverResizeWidget(event) {
        if (!redimensionandoWidget || event.pointerId !== ponteiroResizeAtual) {
            return;
        }

        const dx = event.clientX - resizeStartX;
        const dy = event.clientY - resizeStartY;

        const novaLargura = resizeStartWidth + dx;
        const novaAltura = resizeStartHeight + dy;

        aplicarTamanhoWidget(novaLargura, novaAltura);
        limitarPosicaoWidgetAoViewport();
    }

    function finalizarResizeWidget(event) {
        if (event.pointerId !== ponteiroResizeAtual) {
            return;
        }

        redimensionandoWidget = false;
        widget.classList.remove("resizing");

        try {
            resizeHandle.releasePointerCapture(event.pointerId);
        } catch (erro) {
            console.warn("Não foi possível liberar o pointer capture do resize.", erro);
        }

        salvarTamanhoWidget();
        limitarPosicaoWidgetAoViewport();
    }

    selectVoiceMode.addEventListener("change", () => {
        modoVoz = selectVoiceMode.value;
        localStorage.setItem(CONFIG.storageKeys.mode, modoVoz);

        if (modoVoz === "neural") {
            atualizarStatus("Modo de voz neural selecionado.");
        } else if (modoVoz === "browser") {
            atualizarStatus("Modo de voz do navegador selecionado.");
        } else {
            atualizarStatus("Modo automático selecionado.");
        }
    });

    selectBrowserVoice.addEventListener("change", () => {
        const nomeSelecionado = selectBrowserVoice.value;
        nomeVozSalva = nomeSelecionado;
        localStorage.setItem(CONFIG.storageKeys.browserVoice, nomeVozSalva);

        const encontrada = vozesDisponiveis.find((voz) => voz.name === nomeSelecionado) || null;
        vozSelecionada = encontrada;

        atualizarStatus(
            vozSelecionada
                ? `Voz do navegador alterada para ${vozSelecionada.name}.`
                : "Voz do navegador atualizada."
        );
    });

    botao.addEventListener("pointerdown", iniciarArrasteBotao);
    botao.addEventListener("pointermove", moverBotao);
    botao.addEventListener("pointerup", finalizarArrasteBotao);
    botao.addEventListener("pointercancel", finalizarArrasteBotao);

    botao.addEventListener("click", (event) => {
        if (moveuBotao) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        abrirOuFecharWidget();
    });

    resizeHandle.addEventListener("pointerdown", iniciarResizeWidget);
    window.addEventListener("pointermove", moverResizeWidget);
    window.addEventListener("pointerup", finalizarResizeWidget);
    window.addEventListener("pointercancel", finalizarResizeWidget);

    btnLerPagina.addEventListener("click", lerPagina);
    btnPararLeitura.addEventListener("click", pararLeitura);
    btnAumentarFonte.addEventListener("click", aumentarFonte);
    btnDiminuirFonte.addEventListener("click", diminuirFonte);
    btnContraste.addEventListener("click", alternarContraste);

    document.addEventListener("click", (event) => {
        const clicouNoBotao = botao.contains(event.target);
        const clicouNoWidget = widget.contains(event.target);

        if (!clicouNoBotao && !clicouNoWidget && widget.style.display === "flex") {
            widget.style.display = "none";
        }
    });

    window.addEventListener("resize", () => {
        const rectBotao = botao.getBoundingClientRect();
        definirPosicaoBotao(rectBotao.left, rectBotao.top);

        if (widget.style.display === "flex") {
            limitarPosicaoWidgetAoViewport();
        }
    });

    if ("ResizeObserver" in window) {
        const observer = new ResizeObserver(() => {
            const rect = widget.getBoundingClientRect();
            aplicarEscalaInterna(rect.width, rect.height);
        });

        observer.observe(widget);
    }

    if ("speechSynthesis" in window) {
        window.speechSynthesis.onvoiceschanged = carregarVozes;
        carregarVozes();
    }

    widget.style.setProperty("--hexa-scale", "1");
    widget.style.setProperty("--hexa-resize-handle-size", `${isTouchDevice() ? CONFIG.touchResizeHandleSize : CONFIG.resizeHandleSize}px`);

    aplicarTamanhoSalvoWidget();
    restaurarPosicaoBotao();

    window.addEventListener("beforeunload", () => {
        pararLeituraSilenciosamente();
    });
})();// JavaScript source code
