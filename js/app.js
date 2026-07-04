/*==================================================
    NOMENCLÁTOR DE TRÁFICO
    GarkoDEV
    APP.JS v5.0 - GRÁFICOS CON CHART.JS
==================================================*/

/*==================================================
    CONFIGURACIÓN
==================================================*/

const CONFIG = {
    json: "data/nomenclator.json",
    previewLength: 100,
    storageTheme: "theme",
    storageFavorites: "favorites",
    storageSearchHistory: "searchHistory",
    maxSearchHistory: 5
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

function getItemId(item) {
    return `${item.norma}-${item.articulo}-${item.apartado}-${item.opcion}`;
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
        this.favorites = [];
        this.searchHistory = [];
        this.advancedFilters = {
            maxPrice: 1000,
            maxPoints: 6,
            severeOnly: false
        };
        this.charts = {};

        // Elementos del DOM
        this.results = document.getElementById("results");
        this.template = document.getElementById("cardTemplate");
        this.searchInput = document.getElementById("searchInput");
        this.filters = document.getElementById("filters");
        this.counter = document.getElementById("resultsCounter");
        this.empty = document.getElementById("emptyState");
        this.toast = document.getElementById("toast");
        this.themeButton = document.getElementById("themeButton");
        this.chartsBtn = document.getElementById("chartsBtn");
        this.clearButton = document.getElementById("clearSearch");
        this.fab = document.getElementById("scrollTop");
        this.favoritesBtn = document.getElementById("favoritesBtn");
        this.chartsSection = document.getElementById("chartsSection");
        this.advancedToggle = document.getElementById("advancedToggle");
        this.advancedSearch = document.getElementById("advancedSearch");
        this.priceRange = document.getElementById("priceRange");
        this.pointsRange = document.getElementById("pointsRange");
        this.severeOnly = document.getElementById("severeOnly");
        this.resetAdvanced = document.getElementById("resetAdvanced");
        this.searchHistory = document.getElementById("searchHistory");
        this.historyChips = document.getElementById("historyChips");
        this.statsSection = document.getElementById("statsSection");

        this.init();
    }

    async init() {
        await this.loadDatabase();
        this.loadFavoritesFromStorage();
        this.loadSearchHistory();
        this.restoreTheme();
        this.createFilters();
        this.filterData();
        this.updateStats();
        this.initCharts();
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
                searchIndex: createSearchIndex(item)
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
    }

    /*==============================================
        FILTRAR DATOS
    ==============================================*/

    filterData() {
        const search = normalize(this.search);

        this.filtered = this.database.filter(item => {
            const matchFilter = this.filter === "TODOS" || item.norma === this.filter;
            const matchSearch = search === "" || item.searchIndex.includes(search);
            const matchPrice = item.importe <= this.advancedFilters.maxPrice;
            const matchPoints = item.puntos <= this.advancedFilters.maxPoints;
            const matchSevere = !this.advancedFilters.severeOnly || item.puntos > 4;

            return matchFilter && matchSearch && matchPrice && matchPoints && matchSevere;
        });

        this.renderCards();
        this.updateCounter();
        this.toggleEmptyState();
        this.updateStats();
        this.updateCharts();
    }

    /*==============================================
        RENDERIZAR TARJETAS
    ==============================================*/

    renderCards() {
        this.results.replaceChildren();
        const fragment = document.createDocumentFragment();

        this.filtered.forEach((item, index) => {
            const card = this.renderCard(item);
            card.style.animationDelay = `${index * 50}ms`;
            fragment.appendChild(card);
        });

        this.results.appendChild(fragment);
    }

    /*==============================================
        CREAR TARJETA
    ==============================================*/

    renderCard(item) {
        const node = this.template.content.firstElementChild.cloneNode(true);
        const card = node;
        const itemId = getItemId(item);
        const isFavorite = this.favorites.includes(itemId);

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
        const favoriteBtn = card.querySelector(".favorite-btn");
        const copyBtn = card.querySelector(".copy-btn");
        const shareBtn = card.querySelector(".share-btn");

        badge.textContent = item.norma;
        badge.classList.add(item.norma.toLowerCase());

        const severidad = this.getSeverity(item);
        severity.classList.add(severidad);

        article.textContent = `Artículo ${item.articulo}`;
        preview.textContent = item.texto.length > CONFIG.previewLength
            ? item.texto.substring(0, CONFIG.previewLength) + "…"
            : item.texto;
        price.textContent = `${item.importe} €`;

        detailNorma.textContent = item.norma;
        detailArticulo.textContent = item.articulo;
        detailApartado.textContent = item.apartado || "—";
        detailOpcion.textContent = item.opcion || "—";
        description.textContent = item.texto;
        importe.textContent = `${item.importe} €`;
        reducido.textContent = `${item.importe_reducido} €`;
        puntos.textContent = item.puntos === 0 ? "—" : item.puntos;

        if (item.puntos > 0) {
            puntos.classList.add("danger");
        }

        if (isFavorite) {
            favoriteBtn.classList.add("active");
        }

        favoriteBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.toggleFavorite(itemId, favoriteBtn);
        });

        copyBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.copyInfraction(item);
        });

        shareBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.shareInfraction(item);
        });

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
        GRÁFICOS
    ==============================================*/

    initCharts() {
        // Configurar opciones globales de Chart.js
        Chart.defaults.font.family = '"Inter", sans-serif';
        this.updateCharts();
    }

    updateCharts() {
        // Destruir gráficos previos
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.charts = {};

        if (this.chartsSection.classList.contains("hidden")) return;

        this.createNormaChart();
        this.createPriceChart();
    }

    createNormaChart() {
        const ctx = document.getElementById("normaChart");
        if (!ctx) return;

        // Datos por norma
        const normaData = {};
        this.filtered.forEach(item => {
            if (!normaData[item.norma]) {
                normaData[item.norma] = 0;
            }
            normaData[item.norma]++;
        });

        const labels = Object.keys(normaData);
        const data = Object.values(normaData);
        const colors = this.getNormaColors(labels);

        this.charts.norma = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderColor: this.currentTheme === "dark" ? "#162033" : "#FFFFFF",
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            color: this.currentTheme === "dark" ? "#F8FAFC" : "#111827",
                            padding: 15,
                            font: { weight: "600", size: 13 }
                        }
                    }
                }
            }
        });
    }

    createPriceChart() {
        const ctx = document.getElementById("priceChart");
        if (!ctx) return;

        // Importe promedio por norma
        const normaData = {};
        this.filtered.forEach(item => {
            if (!normaData[item.norma]) {
                normaData[item.norma] = { sum: 0, count: 0 };
            }
            normaData[item.norma].sum += item.importe;
            normaData[item.norma].count++;
        });

        const labels = Object.keys(normaData);
        const data = labels.map(label => Math.round(normaData[label].sum / normaData[label].count));
        const colors = this.getNormaColors(labels);

        this.charts.price = new Chart(ctx, {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: "Importe Promedio (€)",
                    data,
                    backgroundColor: colors,
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                indexAxis: "y",
                plugins: {
                    legend: {
                        labels: {
                            color: this.currentTheme === "dark" ? "#F8FAFC" : "#111827",
                            font: { weight: "600", size: 13 }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: this.currentTheme === "dark" ? "#CBD5E1" : "#6B7280",
                            callback: (v) => `${v}€`
                        },
                        grid: {
                            color: this.currentTheme === "dark" ? "#2D3B52" : "#E5E7EB"
                        }
                    },
                    y: {
                        ticks: {
                            color: this.currentTheme === "dark" ? "#CBD5E1" : "#6B7280"
                        },
                        grid: {
                            drawBorder: false,
                            color: this.currentTheme === "dark" ? "#2D3B52" : "#E5E7EB"
                        }
                    }
                }
            }
        });
    }

    getNormaColors(normas) {
        const colorMap = {
            "RGC": "rgba(59, 130, 246, 0.8)",
            "RGV": "rgba(139, 92, 246, 0.8)",
            "RGCOND": "rgba(236, 72, 153, 0.8)",
            "LSV": "rgba(249, 115, 22, 0.8)"
        };
        return normas.map(n => colorMap[n] || "rgba(100, 116, 139, 0.8)");
    }

    /*==============================================
        FAVORITOS
    ==============================================*/

    loadFavoritesFromStorage() {
        try {
            const stored = localStorage.getItem(CONFIG.storageFavorites);
            this.favorites = stored ? JSON.parse(stored) : [];
        } catch {
            this.favorites = [];
        }
    }

    toggleFavorite(itemId, btn) {
        const isFavorite = this.favorites.includes(itemId);

        if (isFavorite) {
            this.favorites = this.favorites.filter(id => id !== itemId);
            btn.classList.remove("active");
            this.showToast("💔 Eliminado de favoritos");
        } else {
            this.favorites.push(itemId);
            btn.classList.add("active");
            this.showToast("❤️ Añadido a favoritos");
        }

        localStorage.setItem(CONFIG.storageFavorites, JSON.stringify(this.favorites));
        this.updateStats();
        this.updateFavoritesButton();
    }

    updateFavoritesButton() {
        const count = this.favorites.length;
        this.favoritesBtn.querySelector(".badge-count").textContent = count;
        this.favoritesBtn.title = `Mis favoritos (${count})`;
    }

    /*==============================================
        COPIAR Y COMPARTIR
    ==============================================*/

    async copyInfraction(item) {
        const text = `${item.norma} - Artículo ${item.articulo}\n${item.texto}\nImporte: ${item.importe}€ | Puntos: ${item.puntos}`;
        try {
            await navigator.clipboard.writeText(text);
            this.showToast("📋 Copiado al portapapeles");
        } catch {
            this.showToast("❌ No se pudo copiar");
        }
    }

    async shareInfraction(item) {
        const text = `${item.norma} - Artículo ${item.articulo}\n${item.texto}\nImporte: ${item.importe}€ | Puntos: ${item.puntos}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: "Nomenclátor",
                    text
                });
            } catch {}
        } else {
            this.copyInfraction(item);
        }
    }

    /*==============================================
        ESTADÍSTICAS
    ==============================================*/

    updateStats() {
        const total = this.filtered.length;
        const avgPrice = total > 0
            ? Math.round(this.filtered.reduce((sum, item) => sum + item.importe, 0) / total)
            : 0;
        const maxPoints = total > 0
            ? Math.max(...this.filtered.map(item => item.puntos))
            : 0;
        const favCount = this.favorites.length;

        document.getElementById("statTotal").textContent = total;
        document.getElementById("statAvgPrice").textContent = `${avgPrice}€`;
        document.getElementById("statMaxPoints").textContent = maxPoints;
        document.getElementById("statFavorites").textContent = favCount;
    }

    /*==============================================
        HISTORIAL DE BÚSQUEDAS
    ==============================================*/

    loadSearchHistory() {
        try {
            const stored = localStorage.getItem(CONFIG.storageSearchHistory);
            this.searchHistory = stored ? JSON.parse(stored) : [];
        } catch {
            this.searchHistory = [];
        }
    }

    addToSearchHistory(term) {
        if (!term.trim() || this.searchHistory.includes(term)) return;

        this.searchHistory.unshift(term);
        if (this.searchHistory.length > CONFIG.maxSearchHistory) {
            this.searchHistory.pop();
        }
        localStorage.setItem(CONFIG.storageSearchHistory, JSON.stringify(this.searchHistory));
        this.renderSearchHistory();
    }

    renderSearchHistory() {
        if (this.searchHistory.length === 0) {
            this.searchHistory.classList.add("hidden");
            return;
        }

        this.searchHistory.classList.remove("hidden");
        this.historyChips.innerHTML = "";

        this.searchHistory.forEach(term => {
            const chip = document.createElement("button");
            chip.className = "history-chip";
            chip.textContent = term;
            chip.addEventListener("click", () => {
                this.searchInput.value = term;
                this.search = term;
                this.filterData();
            });
            this.historyChips.appendChild(chip);
        });
    }

    /*==============================================
        ACTUALIZAR CONTADOR
    ==============================================*/

    updateCounter() {
        const count = this.filtered.length;
        const total = this.database.length;
        this.counter.textContent = `${count}/${total} resultado${count !== 1 ? "s" : ""}`;
    }

    /*==============================================
        MOSTRAR/OCULTAR ESTADO VACÍO
    ==============================================*/

    toggleEmptyState() {
        const isEmpty = this.filtered.length === 0;
        this.empty.classList.toggle("hidden", !isEmpty);
    }

    /*==============================================
        EVENTOS
    ==============================================*/

    attachEvents() {
        // Buscador
        let debounceTimer;
        this.searchInput.addEventListener("input", (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                this.search = e.target.value;
                if (this.search.trim()) {
                    this.addToSearchHistory(this.search);
                }
                this.filterData();
            }, 200);
        });

        if (this.clearButton) {
            this.clearButton.addEventListener("click", () => {
                this.searchInput.value = "";
                this.search = "";
                this.filterData();
                this.searchInput.focus();
            });
        }

        // Gráficos
        if (this.chartsBtn) {
            this.chartsBtn.addEventListener("click", () => {
                this.chartsSection.classList.toggle("hidden");
                this.chartsBtn.classList.toggle("active");
                if (!this.chartsSection.classList.contains("hidden")) {
                    setTimeout(() => this.updateCharts(), 100);
                }
            });
        }

        // Favoritos
        if (this.favoritesBtn) {
            this.favoritesBtn.addEventListener("click", () => {
                if (this.favorites.length === 0) {
                    this.showToast("📌 No tienes favoritos aún");
                    return;
                }
                this.filtered = this.database.filter(item => {
                    return this.favorites.includes(getItemId(item));
                });
                this.renderCards();
                this.updateCounter();
                this.toggleEmptyState();
                this.updateStats();
            });
        }

        // Buscador avanzado
        if (this.advancedToggle) {
            this.advancedToggle.addEventListener("click", () => {
                this.advancedSearch.classList.toggle("hidden");
                this.advancedToggle.classList.toggle("active");
            });
        }

        if (this.priceRange) {
            this.priceRange.addEventListener("input", (e) => {
                this.advancedFilters.maxPrice = parseInt(e.target.value);
                document.getElementById("priceValue").textContent = `0€ - ${e.target.value}€`;
                this.filterData();
            });
        }

        if (this.pointsRange) {
            this.pointsRange.addEventListener("input", (e) => {
                this.advancedFilters.maxPoints = parseInt(e.target.value);
                document.getElementById("pointsValue").textContent = `0 - ${e.target.value}`;
                this.filterData();
            });
        }

        if (this.severeOnly) {
            this.severeOnly.addEventListener("change", (e) => {
                this.advancedFilters.severeOnly = e.target.checked;
                this.filterData();
            });
        }

        if (this.resetAdvanced) {
            this.resetAdvanced.addEventListener("click", () => {
                this.advancedFilters = { maxPrice: 1000, maxPoints: 6, severeOnly: false };
                this.priceRange.value = 1000;
                this.pointsRange.value = 6;
                this.severeOnly.checked = false;
                document.getElementById("priceValue").textContent = "0€ - 1000€";
                document.getElementById("pointsValue").textContent = "0 - 6";
                this.filterData();
            });
        }

        if (this.fab) {
            this.fab.addEventListener("click", () => {
                window.scrollTo({ top: 0, behavior: "smooth" });
            });
        }

        window.addEventListener("scroll", () => {
            if (!this.fab) return;
            this.fab.classList.toggle("hidden", window.scrollY < 300);
        });

        document.addEventListener("keydown", (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
                e.preventDefault();
                this.searchInput.focus();
            }
            if (e.key === "Escape" && this.searchInput.value) {
                this.searchInput.value = "";
                this.search = "";
                this.filterData();
            }
        });

        if (this.themeButton) {
            this.themeButton.addEventListener("click", () => this.toggleTheme());
        }

        this.renderSearchHistory();
        this.updateFavoritesButton();
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

        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        this.setTheme(prefersDark ? "dark" : "light");
    }

    setTheme(theme) {
        const normalizedTheme = theme === "light" ? "light" : "dark";
        this.currentTheme = normalizedTheme;

        document.body.classList.remove("light", "dark");
        document.body.classList.add(normalizedTheme);
        document.documentElement.setAttribute("data-theme", normalizedTheme);
        localStorage.setItem(CONFIG.storageTheme, normalizedTheme);

        this.updateThemeButton(normalizedTheme);

        // Actualizar gráficos si están visibles
        if (this.chartsSection && !this.chartsSection.classList.contains("hidden")) {
            setTimeout(() => this.updateCharts(), 100);
        }
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

    updateThemeButton(theme) {
        if (!this.themeButton) return;

        const icon = this.themeButton.querySelector("span");
        if (icon) {
            icon.textContent = theme === "dark" ? "light_mode" : "dark_mode";
            icon.classList.toggle("material-symbols-rounded", true);
        }

        this.themeButton.classList.toggle("active", theme === "light");
        this.themeButton.setAttribute("aria-pressed", String(theme === "light"));
        this.themeButton.setAttribute("aria-label", theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
        this.themeButton.setAttribute("title", theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
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
    INICIALIZACIÓN
==================================================*/

document.addEventListener("DOMContentLoaded", async () => {
    window.app = new TrafficApp();
    console.log("🚔 Nomenclátor de Tráfico iniciado.");
});