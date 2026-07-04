/*==================================================
    NOMENCLÁTOR DE TRÁFICO
    APP.JS v6.0 - UI SINCRONIZADA
==================================================*/

/*==================================================
    CONFIGURACIÓN
==================================================*/

const CONFIG = {
    json: "data/nomenclator.json",
    previewLength: 110,
    storageTheme: "theme",
    storageFavorites: "favorites",
    storageSearchHistory: "searchHistory",
    maxSearchHistory: 5
};

/*==================================================
    UTILIDADES
==================================================*/

function normalize(text) {
    return String(text ?? "")
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
    return `${item.norma}-${item.articulo}-${item.apartado || ""}-${item.opcion || ""}`;
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
        this.showFavoritesOnly = false;
        this.maxPriceAvailable = 1000;
        this.maxPointsAvailable = 6;
        this.advancedFilters = {
            maxPrice: 1000,
            maxPoints: 6,
            severeOnly: false
        };
        this.charts = {};
        this.toastTimer = null;

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
        this.priceValue = document.getElementById("priceValue");
        this.pointsValue = document.getElementById("pointsValue");
        this.severeOnly = document.getElementById("severeOnly");
        this.resetAdvanced = document.getElementById("resetAdvanced");
        this.searchHistorySection = document.getElementById("searchHistory");
        this.historyChips = document.getElementById("historyChips");

        this.init();
    }

    async init() {
        this.restoreTheme();
        this.loadFavoritesFromStorage();
        this.loadSearchHistory();
        this.attachEvents();
        await this.loadDatabase();
        this.configureAdvancedControls();
        this.createFilters();
        this.renderSearchHistory();
        this.updateFavoritesButton();
        this.initCharts();
        this.filterData();
    }

    /*==============================================
        CARGAR BASE DE DATOS
    ==============================================*/

    async loadDatabase() {
        try {
            this.counter.textContent = "Cargando nomenclátor...";

            const response = await fetch(CONFIG.json);
            if (!response.ok) {
                throw new Error("No se pudo cargar el nomenclátor.");
            }

            const data = await response.json();
            if (!Array.isArray(data)) {
                throw new Error("Formato de datos no válido.");
            }

            this.database = data.map(item => ({
                ...item,
                articulo: String(item.articulo ?? ""),
                apartado: String(item.apartado ?? ""),
                opcion: String(item.opcion ?? ""),
                texto: String(item.texto ?? ""),
                importe: Number(item.importe ?? 0),
                importe_reducido: Number(item.importe_reducido ?? 0),
                puntos: Number(item.puntos ?? 0),
                searchIndex: createSearchIndex(item)
            }));

            this.maxPriceAvailable = Math.max(0, ...this.database.map(item => item.importe));
            this.maxPointsAvailable = Math.max(0, ...this.database.map(item => item.puntos));
            this.advancedFilters.maxPrice = this.maxPriceAvailable;
            this.advancedFilters.maxPoints = this.maxPointsAvailable;

            console.log(`✅ ${this.database.length} infracciones cargadas.`);
        } catch (error) {
            console.error(error);
            this.database = [];
            this.filtered = [];
            this.counter.textContent = "Error al cargar los datos";
            this.showToast("❌ No se pudo cargar el nomenclátor.");
            this.toggleEmptyState();
        }
    }

    configureAdvancedControls() {
        if (this.priceRange) {
            this.priceRange.min = "0";
            this.priceRange.max = String(this.maxPriceAvailable);
            this.priceRange.value = String(this.advancedFilters.maxPrice);
        }

        if (this.pointsRange) {
            this.pointsRange.min = "0";
            this.pointsRange.max = String(this.maxPointsAvailable);
            this.pointsRange.value = String(this.advancedFilters.maxPoints);
        }

        this.updateAdvancedLabels();
    }

    updateAdvancedLabels() {
        if (this.priceValue) {
            this.priceValue.textContent = `0€ - ${this.advancedFilters.maxPrice}€`;
        }

        if (this.pointsValue) {
            this.pointsValue.textContent = `0 - ${this.advancedFilters.maxPoints}`;
        }
    }

    /*==============================================
        CREAR FILTROS
    ==============================================*/

    createFilters() {
        if (!this.filters) return;

        const normas = [
            "TODOS",
            ...new Set(this.database.map(item => item.norma))
        ];

        this.filters.innerHTML = "";

        normas.forEach(norma => {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = norma;
            button.dataset.filter = norma;
            button.classList.toggle("active", norma === this.filter);
            button.addEventListener("click", () => this.setFilter(norma));
            this.filters.appendChild(button);
        });
    }

    setFilter(norma) {
        this.filter = norma;

        if (this.filters) {
            this.filters.querySelectorAll("button").forEach(button => {
                button.classList.toggle("active", button.dataset.filter === norma);
            });
        }

        this.filterData();
    }

    /*==============================================
        FILTRADO
    ==============================================*/

    filterData() {
        const search = normalize(this.search);

        let data = this.database.filter(item => {
            const matchFilter = this.filter === "TODOS" || item.norma === this.filter;
            const matchSearch = search === "" || item.searchIndex.includes(search);
            const matchPrice = item.importe <= this.advancedFilters.maxPrice;
            const matchPoints = item.puntos <= this.advancedFilters.maxPoints;
            const matchSevere = !this.advancedFilters.severeOnly || item.puntos >= 4;

            return matchFilter && matchSearch && matchPrice && matchPoints && matchSevere;
        });

        if (this.showFavoritesOnly) {
            data = data.filter(item => this.favorites.includes(getItemId(item)));
        }

        this.filtered = data;
        this.renderCards();
        this.updateCounter();
        this.toggleEmptyState();
        this.updateStats();
        this.updateCharts();
    }

    /*==============================================
        RENDERIZADO
    ==============================================*/

    renderCards() {
        if (!this.results) return;

        this.results.replaceChildren();

        if (!this.template) return;

        const fragment = document.createDocumentFragment();

        this.filtered.forEach((item, index) => {
            const card = this.renderCard(item);
            card.style.animationDelay = `${index * 40}ms`;
            fragment.appendChild(card);
        });

        this.results.appendChild(fragment);
    }

    renderCard(item) {
        const card = this.template.content.firstElementChild.cloneNode(true);
        const itemId = getItemId(item);
        const isFavorite = this.favorites.includes(itemId);
        const severityLevel = this.getSeverity(item);

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
        const headerBtn = card.querySelector(".card-header");

        badge.textContent = item.norma;
        badge.classList.add(normalize(item.norma));
        severity.classList.add(severityLevel);

        article.textContent = `Artículo ${item.articulo}${item.apartado ? `.${item.apartado}` : ""}`;
        preview.textContent = item.texto.length > CONFIG.previewLength
            ? `${item.texto.slice(0, CONFIG.previewLength).trim()}…`
            : item.texto;
        price.textContent = `${item.importe} €`;

        detailNorma.textContent = item.norma;
        detailArticulo.textContent = item.articulo || "—";
        detailApartado.textContent = item.apartado || "—";
        detailOpcion.textContent = item.opcion || "—";
        description.textContent = item.texto || "Sin descripción";
        importe.textContent = `${item.importe} €`;
        reducido.textContent = `${item.importe_reducido} €`;
        puntos.textContent = item.puntos > 0 ? String(item.puntos) : "—";
        puntos.classList.toggle("danger", item.puntos > 0);

        favoriteBtn.classList.toggle("active", isFavorite);
        favoriteBtn.setAttribute("aria-pressed", String(isFavorite));
        favoriteBtn.setAttribute("aria-label", isFavorite ? "Quitar de favoritos" : "Añadir a favoritos");
        favoriteBtn.setAttribute("title", isFavorite ? "Quitar de favoritos" : "Añadir a favoritos");

        favoriteBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            this.toggleFavorite(itemId);
        });

        copyBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            this.copyInfraction(item);
        });

        shareBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            this.shareInfraction(item);
        });

        headerBtn.addEventListener("click", () => {
            const isOpen = card.classList.toggle("open");
            headerBtn.setAttribute("aria-expanded", String(isOpen));
        });

        return card;
    }

    getSeverity(item) {
        if (item.puntos >= 4) return "high";
        if (item.puntos >= 2) return "medium";
        return "low";
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

    saveFavoritesToStorage() {
        localStorage.setItem(CONFIG.storageFavorites, JSON.stringify(this.favorites));
    }

    toggleFavorite(itemId) {
        const isFavorite = this.favorites.includes(itemId);

        if (isFavorite) {
            this.favorites = this.favorites.filter(id => id !== itemId);
            this.showToast("💔 Eliminado de favoritos");
        } else {
            this.favorites.push(itemId);
            this.showToast("❤️ Añadido a favoritos");
        }

        if (this.showFavoritesOnly && this.favorites.length === 0) {
            this.showFavoritesOnly = false;
        }

        this.saveFavoritesToStorage();
        this.updateFavoritesButton();
        this.filterData();
    }

    toggleFavoritesView() {
        if (this.favorites.length === 0) {
            this.showToast("📌 No tienes favoritos todavía");
            return;
        }

        this.showFavoritesOnly = !this.showFavoritesOnly;
        this.updateFavoritesButton();
        this.filterData();
        this.showToast(this.showFavoritesOnly ? "⭐ Mostrando favoritos" : "📚 Mostrando todas las infracciones");
    }

    updateFavoritesButton() {
        if (!this.favoritesBtn) return;

        const count = this.favorites.length;
        const badge = this.favoritesBtn.querySelector(".badge-count");

        if (badge) {
            badge.textContent = count;
        }

        this.favoritesBtn.classList.toggle("active", this.showFavoritesOnly);
        this.favoritesBtn.setAttribute("aria-pressed", String(this.showFavoritesOnly));
        this.favoritesBtn.setAttribute("title", this.showFavoritesOnly ? `Ver todas (${count} favoritos guardados)` : `Mis favoritos (${count})`);
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

    saveSearchHistory() {
        localStorage.setItem(CONFIG.storageSearchHistory, JSON.stringify(this.searchHistory));
    }

    addToSearchHistory(term) {
        const cleanTerm = String(term ?? "").trim();
        if (!cleanTerm) return;

        this.searchHistory = this.searchHistory.filter(item => normalize(item) !== normalize(cleanTerm));
        this.searchHistory.unshift(cleanTerm);
        this.searchHistory = this.searchHistory.slice(0, CONFIG.maxSearchHistory);
        this.saveSearchHistory();
        this.renderSearchHistory();
    }

    renderSearchHistory() {
        if (!this.searchHistorySection || !this.historyChips) return;

        this.historyChips.innerHTML = "";

        if (this.searchHistory.length === 0) {
            this.searchHistorySection.classList.add("hidden");
            return;
        }

        this.searchHistorySection.classList.remove("hidden");

        this.searchHistory.forEach(term => {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "history-chip";
            chip.textContent = term;
            chip.addEventListener("click", () => {
                this.search = term;
                if (this.searchInput) {
                    this.searchInput.value = term;
                    this.searchInput.focus();
                }
                this.filterData();
            });
            this.historyChips.appendChild(chip);
        });
    }

    /*==============================================
        ESTADÍSTICAS Y CONTADOR
    ==============================================*/

    updateCounter() {
        if (!this.counter) return;

        const count = this.filtered.length;
        const total = this.database.length;
        const suffix = this.showFavoritesOnly ? " en favoritos" : "";

        this.counter.textContent = `${count}/${total} resultado${count !== 1 ? "s" : ""}${suffix}`;
    }

    updateStats() {
        const total = this.filtered.length;
        const statTotal = document.getElementById("statTotal");
        const statFavorites = document.getElementById("statFavorites");

        if (statTotal) {
            statTotal.textContent = total;
        }

        if (statFavorites) {
            statFavorites.textContent = this.favorites.length;
        }
    }

    toggleEmptyState() {
        if (!this.empty) return;
        this.empty.classList.toggle("hidden", this.filtered.length > 0);
    }

    /*==============================================
        COPIAR Y COMPARTIR
    ==============================================*/

    async copyInfraction(item) {
        const text = [
            `${item.norma} · Artículo ${item.articulo}${item.apartado ? `.${item.apartado}` : ""}${item.opcion ? ` · Opción ${item.opcion}` : ""}`,
            item.texto,
            `Importe: ${item.importe}€`,
            `Importe reducido: ${item.importe_reducido}€`,
            `Puntos: ${item.puntos}`
        ].join("\n");

        try {
            await navigator.clipboard.writeText(text);
            this.showToast("📋 Infracción copiada");
        } catch {
            this.showToast("❌ No se pudo copiar");
        }
    }

    async shareInfraction(item) {
        const text = `${item.norma} · Artículo ${item.articulo}\n${item.texto}\nImporte: ${item.importe}€ · Puntos: ${item.puntos}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: "Nomenclátor de Tráfico",
                    text
                });
                return;
            } catch {
                // Si el usuario cancela, no hacemos nada.
            }
        }

        this.copyInfraction(item);
    }

    /*==============================================
        GRÁFICOS
    ==============================================*/

    initCharts() {
        if (!window.Chart) return;
        Chart.defaults.font.family = '"Inter", sans-serif';
        this.updateCharts();
    }

    destroyCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === "function") {
                chart.destroy();
            }
        });
        this.charts = {};
    }

    updateCharts() {
        if (!window.Chart || !this.chartsSection) return;

        this.destroyCharts();

        if (this.chartsSection.classList.contains("hidden") || this.filtered.length === 0) {
            return;
        }

        this.createNormaChart();
        this.createPriceChart();
    }

    createNormaChart() {
        const ctx = document.getElementById("normaChart");
        if (!ctx) return;

        const normaData = {};
        this.filtered.forEach(item => {
            normaData[item.norma] = (normaData[item.norma] || 0) + 1;
        });

        const labels = Object.keys(normaData);
        const data = Object.values(normaData);

        this.charts.norma = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: this.getNormaColors(labels),
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

        const grouped = {};

        this.filtered.forEach(item => {
            if (!grouped[item.norma]) {
                grouped[item.norma] = { sum: 0, count: 0 };
            }
            grouped[item.norma].sum += item.importe;
            grouped[item.norma].count += 1;
        });

        const labels = Object.keys(grouped);
        const data = labels.map(label => Math.round(grouped[label].sum / grouped[label].count));

        this.charts.price = new Chart(ctx, {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: "Importe promedio (€)",
                    data,
                    backgroundColor: this.getNormaColors(labels),
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
                            callback: value => `${value}€`
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
            RGC: "rgba(59, 130, 246, 0.8)",
            RGV: "rgba(139, 92, 246, 0.8)",
            RGCOND: "rgba(236, 72, 153, 0.8)",
            LSV: "rgba(249, 115, 22, 0.8)"
        };

        return normas.map(norma => colorMap[norma] || "rgba(100, 116, 139, 0.8)");
    }

    /*==============================================
        EVENTOS
    ==============================================*/

    attachEvents() {
        let debounceTimer = null;

        if (this.searchInput) {
            this.searchInput.addEventListener("input", event => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.search = event.target.value;
                    if (this.search.trim().length >= 2) {
                        this.addToSearchHistory(this.search);
                    }
                    this.filterData();
                }, 180);
            });
        }

        if (this.clearButton) {
            this.clearButton.addEventListener("click", () => {
                this.search = "";
                if (this.searchInput) {
                    this.searchInput.value = "";
                    this.searchInput.focus();
                }
                this.filterData();
            });
        }

        if (this.chartsBtn && this.chartsSection) {
            this.chartsBtn.addEventListener("click", () => {
                const isHidden = this.chartsSection.classList.toggle("hidden");
                this.chartsBtn.classList.toggle("active", !isHidden);

                if (!isHidden) {
                    setTimeout(() => this.updateCharts(), 100);
                } else {
                    this.destroyCharts();
                }
            });
        }

        if (this.favoritesBtn) {
            this.favoritesBtn.addEventListener("click", () => this.toggleFavoritesView());
        }

        if (this.advancedToggle && this.advancedSearch) {
            this.advancedToggle.addEventListener("click", () => {
                const isHidden = this.advancedSearch.classList.toggle("hidden");
                this.advancedToggle.classList.toggle("active", !isHidden);
                this.advancedToggle.setAttribute("aria-expanded", String(!isHidden));
            });
        }

        if (this.priceRange) {
            this.priceRange.addEventListener("input", event => {
                this.advancedFilters.maxPrice = Number(event.target.value);
                this.updateAdvancedLabels();
                this.filterData();
            });
        }

        if (this.pointsRange) {
            this.pointsRange.addEventListener("input", event => {
                this.advancedFilters.maxPoints = Number(event.target.value);
                this.updateAdvancedLabels();
                this.filterData();
            });
        }

        if (this.severeOnly) {
            this.severeOnly.addEventListener("change", event => {
                this.advancedFilters.severeOnly = event.target.checked;
                this.filterData();
            });
        }

        if (this.resetAdvanced) {
            this.resetAdvanced.addEventListener("click", () => {
                this.advancedFilters = {
                    maxPrice: this.maxPriceAvailable,
                    maxPoints: this.maxPointsAvailable,
                    severeOnly: false
                };

                if (this.priceRange) {
                    this.priceRange.value = String(this.maxPriceAvailable);
                }

                if (this.pointsRange) {
                    this.pointsRange.value = String(this.maxPointsAvailable);
                }

                if (this.severeOnly) {
                    this.severeOnly.checked = false;
                }

                this.updateAdvancedLabels();
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

        document.addEventListener("keydown", event => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f" && this.searchInput) {
                event.preventDefault();
                this.searchInput.focus();
            }

            if (event.key === "Escape" && this.searchInput && this.searchInput.value) {
                this.search = "";
                this.searchInput.value = "";
                this.filterData();
            }
        });

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

        if (this.chartsSection && !this.chartsSection.classList.contains("hidden")) {
            setTimeout(() => this.updateCharts(), 100);
        }
    }

    toggleTheme() {
        const newTheme = this.currentTheme === "dark" ? "light" : "dark";
        this.setTheme(newTheme);
        this.showToast(newTheme === "dark" ? "🌙 Modo oscuro activado" : "☀️ Modo claro activado");
    }

    updateThemeButton(theme) {
        if (!this.themeButton) return;

        const icon = this.themeButton.querySelector(".material-symbols-rounded");
        if (icon) {
            icon.textContent = theme === "dark" ? "light_mode" : "dark_mode";
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

document.addEventListener("DOMContentLoaded", () => {
    window.app = new TrafficApp();
    console.log("🚔 Nomenclátor de Tráfico iniciado.");
});
