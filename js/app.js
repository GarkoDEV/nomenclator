/*==================================================
    NOMENCLÁTOR DE TRÁFICO
    GarkoDEV
    APP.JS v3.0 - IMPROVED UI & DARK MODE
==================================================*/

/*==================================================
    CONFIGURACIÓN
==================================================*/

const CONFIG = {
    json: "data/nomenclator.json",
    previewLength: 100,
    storageTheme: "theme",
    storageFavorites: "favorites"
};

/*==================================================
    UTILIDADES
==================================================*/

function normalize(text) {
    return String(text)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function createSearchIndex(item) {
    return normalize([
        item.norma,
        item.articulo,
        item.apartado,
        item.opcion,
        item.texto
    ].join(" "));
}

/*==================================================
    APLICACIÓN PRINCIPAL
==================================================*/

class TrafficApp {

    constructor() {
        this.database = [];
        this.filtered = [];
        this.filter = "TODOS";
        this.search = "";
        this.currentTheme = "dark";

        // Elementos del DOM
        this.results = document.getElementById("results");
        this.template = document.getElementById("cardTemplate");
        this.searchInput = document.getElementById("searchInput");
        this.filters = document.getElementById("filters");
        this.counter = document.getElementById("resultsCounter");
        this.empty = document.getElementById("emptyState");
        this.toast = document.getElementById("toast");
        this.themeButton = document.getElementById("themeButton");
        this.clearButton = document.getElementById("clearSearch");
        this.fab = document.getElementById("scrollTop");

        this.init();
    }

    async init() {
        await this.loadDatabase();
        this.restoreTheme();
        this.createFilters();
        this.filterData();
        this.attachEvents();
    }

    /*==============================================
        CARGAR BASE DE DATOS
    ==============================================*/

    async loadDatabase() {
        try {
            this.counter.textContent = "Cargando nomenclátor...";

            const response = await fetch(CONFIG.json);
            if (!response.ok) throw new Error("No se pudo cargar el JSON.");

            const data = await response.json();
            if (!Array.isArray(data)) throw new Error("Formato JSON no válido.");

            this.database = data.map(item => ({
                ...item,
                searchIndex: createSearchIndex(item),
                favorite: false
            }));

            this.filtered = [...this.database];
            this.updateCounter();

            console.log(`✅ ${this.database.length} infracciones cargadas.`);
        } catch (error) {
            console.error(error);
            this.counter.textContent = "Error al cargar datos";
            this.showToast("❌ No se pudo cargar el nomenclátor.");
        }
    }

    /*==============================================
        CREAR FILTROS
    ==============================================*/

    createFilters() {
        const normas = [
            "TODOS",
            ...new Set(this.database.map(item => item.norma))
        ];

        this.filters.innerHTML = "";

        normas.forEach(norma => {
            const button = document.createElement("button");
            button.textContent = norma;
            button.dataset.filter = norma;
            button.type = "button";

            if (norma === this.filter) {
                button.classList.add("active");
            }

            button.addEventListener("click", () => this.setFilter(norma, button));
            this.filters.appendChild(button);
        });
    }

    setFilter(norma, button) {
        this.filter = norma;
        this.filters.querySelectorAll("button").forEach(btn => {
            btn.classList.remove("active");
        });
        button.classList.add("active");
        this.filterData();
        // Scroll suave a los resultados en mobile
        if (window.innerWidth <= 768) {
            setTimeout(() => {
                this.results.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 100);
        }
    }

    /*==============================================
        ACTUALIZAR CONTADOR
    ==============================================*/

    updateCounter() {
        const count = this.filtered.length;
        this.counter.textContent = `${count} resultado${count !== 1 ? "s" : ""}`;
    }

    /*==============================================
        MOSTRAR/OCULTAR ESTADO VACÍO
    ==============================================*/

    toggleEmptyState() {
        const isEmpty = this.filtered.length === 0;
        this.empty.classList.toggle("hidden", !isEmpty);
    }

    /*==============================================
        FILTRAR DATOS
    ==============================================*/

    filterData() {
        const search = normalize(this.search);

        this.filtered = this.database.filter(item => {
            const matchFilter = this.filter === "TODOS" || item.norma === this.filter;
            const matchSearch = search === "" || item.searchIndex.includes(search);
            return matchFilter && matchSearch;
        });

        this.renderCards();
        this.updateCounter();
        this.toggleEmptyState();
    }

    /*==============================================
        RENDERIZAR TARJETAS
    ==============================================*/

    renderCards() {
        this.results.replaceChildren();
        const fragment = document.createDocumentFragment();

        this.filtered.forEach(item => {
            fragment.appendChild(this.renderCard(item));
        });

        this.results.appendChild(fragment);
    }

    /*==============================================
        CREAR TARJETA
    ==============================================*/

    renderCard(item) {
        const node = this.template.content.firstElementChild.cloneNode(true);
        const card = node;

        // Elementos
        const badge = card.querySelector(".badge");
        const severity = card.querySelector(".severity-indicator");
        const article = card.querySelector(".article");
        const preview = card.querySelector(".preview");
        const price = card.querySelector(".price");
        const detailNorma = card.querySelector(".detailNorma");
        const detailArticulo = card.querySelector(".detailArticulo");
        const detailApartado = card.querySelector(".detailApartado");
        const detailOpcion = card.querySelector(".detailOpcion");
        const description = card.querySelector(".description");
        const importe = card.querySelector(".importe");
        const reducido = card.querySelector(".reducido");
        const puntos = card.querySelector(".puntos");

        // CABECERA
        badge.textContent = item.norma;
        badge.classList.add(item.norma.toLowerCase());

        // Indicador de severidad (basado en puntos y importe)
        const severidad = this.getSeverity(item);
        severity.classList.add(severidad);

        article.textContent = `Artículo ${item.articulo}`;

        preview.textContent = item.texto.length > CONFIG.previewLength
            ? item.texto.substring(0, CONFIG.previewLength) + "…"
            : item.texto;

        price.textContent = `${item.importe} €`;

        // DETALLES
        detailNorma.textContent = item.norma;
        detailArticulo.textContent = item.articulo;
        detailApartado.textContent = item.apartado || "—";
        detailOpcion.textContent = item.opcion || "—";

        description.textContent = item.texto;

        importe.textContent = `${item.importe} €`;
        reducido.textContent = `${item.importe_reducido} €`;
        puntos.textContent = item.puntos === 0 ? "—" : item.puntos;

        // Color de puntos
        if (item.puntos > 0) {
            puntos.classList.add("danger");
        }

        // Evento para desplegar
        card.querySelector(".card-header").addEventListener("click", () => {
            card.classList.toggle("open");
        });

        return card;
    }

    getSeverity(item) {
        if (item.puntos >= 4) return "high";
        if (item.puntos >= 2) return "medium";
        return "low";
    }

    /*==============================================
        EVENTOS
    ==============================================*/

    attachEvents() {
        // Buscador con debounce
        let debounceTimer;
        this.searchInput.addEventListener("input", (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                this.search = e.target.value;
                this.filterData();
            }, 200);
        });

        // Limpiar búsqueda
        if (this.clearButton) {
            this.clearButton.addEventListener("click", () => {
                this.searchInput.value = "";
                this.search = "";
                this.filterData();
                this.searchInput.focus();
            });
        }

        // Botón flotante
        if (this.fab) {
            this.fab.addEventListener("click", () => {
                window.scrollTo({ top: 0, behavior: "smooth" });
            });
        }

        // Mostrar/ocultar botón flotante
        window.addEventListener("scroll", () => {
            if (!this.fab) return;
            this.fab.classList.toggle("hidden", window.scrollY < 300);
        });

        // Atajos de teclado
        document.addEventListener("keydown", (e) => {
            // Ctrl+F o Cmd+F para buscar
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
                e.preventDefault();
                this.searchInput.focus();
            }
            // Escape para limpiar
            if (e.key === "Escape" && this.searchInput.value) {
                this.searchInput.value = "";
                this.search = "";
                this.filterData();
            }
        });

        // Tema
        if (this.themeButton) {
            this.themeButton.addEventListener("click", () => this.toggleTheme());
        }
    }

    /*==============================================
        TEMA CLARO/OSCURO
    ==============================================*/

    restoreTheme() {
        const saved = localStorage.getItem(CONFIG.storageTheme);

        if (saved) {
            this.setTheme(saved);
            return;
        }

        // Detectar preferencia del sistema
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        this.setTheme(prefersDark ? "dark" : "light");
    }

    setTheme(theme) {
        this.currentTheme = theme;
        document.body.classList.remove("light", "dark");
        document.body.classList.add(theme);
        localStorage.setItem(CONFIG.storageTheme, theme);
        this.updateThemeIcon(theme);
    }

    toggleTheme() {
        const newTheme = this.currentTheme === "dark" ? "light" : "dark";
        this.setTheme(newTheme);
        this.showToast(
            newTheme === "dark"
                ? "🌙 Modo oscuro activado"
                : "☀️ Modo claro activado"
        );
    }

    updateThemeIcon(theme) {
        if (!this.themeButton) return;
        const icon = this.themeButton.querySelector("span");
        if (icon) {
            icon.textContent = theme === "dark" ? "☀️" : "🌙";
        }
    }

    /*==============================================
        TOAST
    ==============================================*/

    showToast(message, duration = 2200) {
        if (!this.toast) return;

        this.toast.textContent = message;
        this.toast.classList.add("show");

        clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => {
            this.toast.classList.remove("show");
        }, duration);
    }
}

/*==================================================
    SERVICE WORKER
==================================================*/

async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    try {
        await navigator.serviceWorker.register("sw.js");
        console.log("✅ Service Worker registrado.");
    } catch (error) {
        console.error("❌ Service Worker:", error);
    }
}

/*==================================================
    INICIALIZACIÓN
==================================================*/

document.addEventListener("DOMContentLoaded", async () => {
    window.app = new TrafficApp();
    await registerServiceWorker();
    console.log("🚔 Nomenclátor de Tráfico iniciado.");
});