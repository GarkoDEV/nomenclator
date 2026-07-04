/*==================================================
    NOMENCLÁTOR DE TRÁFICO
    GarkoDEV
    APP.JS v2
==================================================*/


/*==================================================
    CONFIGURACIÓN
==================================================*/

const CONFIG = {

    json: "data/nomenclator.json",

    previewLength: 120,

    animation: 180,

    storageTheme: "theme",

    storageFavorites: "favorites"

};



/*==================================================
    UTILIDADES
==================================================*/

function normalize(text){

    return String(text)

        .normalize("NFD")

        .replace(/[\u0300-\u036f]/g,"")

        .toLowerCase()

        .trim();

}



function createSearchIndex(item){

    return normalize([

        item.norma,

        item.articulo,

        item.apartado,

        item.opcion,

        item.texto

    ].join(" "));

}



/*==================================================
    APP
==================================================*/

class TrafficApp{

    constructor(){

        this.database=[];

        this.filtered=[];

        this.filter="TODOS";

        this.search="";



        this.results=document.getElementById("results");

        this.template=document.getElementById("cardTemplate");

        this.searchInput=document.getElementById("searchInput");

        this.filters=document.getElementById("filters");

        this.counter=document.getElementById("resultsCounter");

        this.empty=document.getElementById("emptyState");

        this.toast=document.getElementById("toast");

        this.themeButton=document.getElementById("themeButton");

        this.clearButton=document.getElementById("clearSearch");

        this.fab=document.getElementById("scrollTop");



        this.init();

    }



    async init(){

        await this.loadDatabase();

        this.restoreTheme();

        this.createFilters();

        this.filterData();

        this.events();

    }

    /*==============================================
        CARGAR BASE DE DATOS
    ==============================================*/

    async loadDatabase() {

        try {

            this.counter.textContent = "Cargando nomenclátor...";

            const response = await fetch(CONFIG.json);

            if (!response.ok) {

                throw new Error("No se pudo cargar el JSON.");

            }

            const data = await response.json();

            if (!Array.isArray(data)) {

                throw new Error("Formato JSON no válido.");

            }

            this.database = data.map(item => ({

                ...item,

                searchIndex: createSearchIndex(item),

                favorite: false

            }));

            this.filtered = [...this.database];

            this.counter.textContent =
                `${this.database.length} infracciones`;

            console.log(

                `✅ ${this.database.length} infracciones cargadas.`

            );

        }

        catch (error) {

            console.error(error);

            this.counter.textContent = "Error al cargar datos";

            this.showToast("No se pudo cargar el nomenclátor.");

        }

    }


    /*==============================================
        CREAR FILTROS
    ==============================================*/

    createFilters() {

        const normas = [

            "TODOS",

            ...new Set(

                this.database.map(item => item.norma)

            )

        ];

        this.filters.innerHTML = "";

        normas.forEach(norma => {

            const button = document.createElement("button");

            button.textContent = norma;

            button.dataset.filter = norma;

            if (norma === this.filter) {

                button.classList.add("active");

            }

            button.addEventListener("click", () => {

                this.filter = norma;

                this.filters
                    .querySelectorAll("button")
                    .forEach(btn => btn.classList.remove("active"));

                button.classList.add("active");

                this.filterData();

            });

            this.filters.appendChild(button);

        });

    }


    /*==============================================
        ACTUALIZAR CONTADOR
    ==============================================*/

    updateCounter() {

        this.counter.textContent =
            `${this.filtered.length} resultado${this.filtered.length !== 1 ? "s" : ""}`;

    }


    /*==============================================
        MOSTRAR / OCULTAR EMPTY STATE
    ==============================================*/

    toggleEmptyState() {

        this.empty.classList.toggle(

            "hidden",

            this.filtered.length > 0

        );

    }

    /*==============================================
        FILTRAR DATOS
    ==============================================*/

    filterData() {

        const search = normalize(this.search);

        this.filtered = this.database.filter(item => {

            const matchFilter =
                this.filter === "TODOS" ||
                item.norma === this.filter;

            const matchSearch =
                item.searchIndex.includes(search);

            return matchFilter && matchSearch;

        });

        this.renderCards();

        this.updateCounter();

        this.toggleEmptyState();

    }


    /*==============================================
        RENDERIZAR TODAS LAS TARJETAS
    ==============================================*/

    renderCards() {

        this.results.replaceChildren();

        const fragment = document.createDocumentFragment();

        this.filtered.forEach(item => {

            fragment.appendChild(

                this.renderCard(item)

            );

        });

        this.results.appendChild(fragment);

    }


    /*==============================================
        CREAR TARJETA
    ==============================================*/

    renderCard(item) {

        const node = this.template.content.firstElementChild.cloneNode(true);

        const card = node;

        const badge = card.querySelector(".badge");

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



        /*==========================================
            CABECERA
        ==========================================*/

        badge.textContent = item.norma;

        badge.classList.add(item.norma.toLowerCase());

        article.textContent = `Artículo ${item.articulo}`;

        preview.textContent =
            item.texto.length > CONFIG.previewLength
                ? item.texto.substring(0, CONFIG.previewLength) + "…"
                : item.texto;

        price.textContent = `${item.importe} €`;


        /*==========================================
            DETALLE
        ==========================================*/

        detailNorma.textContent = item.norma;

        detailArticulo.textContent = item.articulo;

        detailApartado.textContent = item.apartado || "—";

        detailOpcion.textContent = item.opcion || "—";

        description.textContent = item.texto;

        importe.textContent = `${item.importe} €`;

        reducido.textContent = `${item.importe_reducido} €`;

        puntos.textContent = item.puntos === 0 ? "—" : item.puntos;


        /*==========================================
            COLOR DE PUNTOS
        ==========================================*/

        const pointsContainer = puntos.closest(".points");

        if (pointsContainer) {

            if (item.puntos > 0) {

                pointsContainer.style.background = "var(--danger)";

            } else {

                pointsContainer.style.background = "var(--success)";

            }

        }


        /*==========================================
            DESPLEGAR
        ==========================================*/

        card.querySelector(".card-header").addEventListener("click", () => {

            card.classList.toggle("open");

        });

        return card;

    }

    /*==============================================
        REGISTRAR EVENTOS
    ==============================================*/

    events() {

        /*------------------------------------------
            BUSCADOR (Debounce)
        ------------------------------------------*/

        let debounce;

        this.searchInput.addEventListener("input", (event) => {

            clearTimeout(debounce);

            debounce = setTimeout(() => {

                this.search = event.target.value;

                this.filterData();

            }, 180);

        });


        /*------------------------------------------
            LIMPIAR BUSCADOR
        ------------------------------------------*/

        if (this.clearButton) {

            this.clearButton.addEventListener("click", () => {

                this.searchInput.value = "";

                this.search = "";

                this.filterData();

                this.searchInput.focus();

            });

        }


        /*------------------------------------------
            BOTÓN SCROLL ARRIBA
        ------------------------------------------*/

        if (this.fab) {

            this.fab.addEventListener("click", () => {

                window.scrollTo({

                    top: 0,

                    behavior: "smooth"

                });

            });

        }


        /*------------------------------------------
            MOSTRAR FAB AL HACER SCROLL
        ------------------------------------------*/

        window.addEventListener("scroll", () => {

            if (!this.fab) return;

            this.fab.classList.toggle(

                "show",

                window.scrollY > 350

            );

        });


        /*------------------------------------------
            ATAJOS DE TECLADO
        ------------------------------------------*/

        document.addEventListener("keydown", (event) => {

            /* Ctrl + F */

            if (event.ctrlKey && event.key.toLowerCase() === "f") {

                event.preventDefault();

                this.searchInput.focus();

            }

            /* Escape */

            if (event.key === "Escape") {

                this.searchInput.value = "";

                this.search = "";

                this.filterData();

            }

        });

    }


    /*==============================================
        COPIAR TEXTO
    ==============================================*/

    async copy(text) {

        try {

            await navigator.clipboard.writeText(text);

            this.showToast("Copiado al portapapeles");

        }

        catch {

            this.showToast("No se pudo copiar");

        }

    }


    /*==============================================
        COMPARTIR
    ==============================================*/

    async share(item) {

        const text =

`${item.norma}
Artículo ${item.articulo}

${item.texto}

Importe: ${item.importe} €
Puntos: ${item.puntos}`;

        if (navigator.share) {

            try {

                await navigator.share({

                    title: "Nomenclátor",

                    text

                });

            }

            catch {}

        }

        else {

            this.copy(text);

        }

    }

    /*==============================================
        TEMA
    ==============================================*/

    restoreTheme() {

        const savedTheme = localStorage.getItem(CONFIG.storageTheme);

        if (savedTheme) {

            document.body.classList.remove("light", "dark");

            document.body.classList.add(savedTheme);

            this.updateThemeIcon(savedTheme);

            return;

        }

        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

        const theme = prefersDark ? "dark" : "light";

        document.body.classList.add(theme);

        this.updateThemeIcon(theme);

    }


    toggleTheme() {

        const isDark = document.body.classList.contains("dark");

        const newTheme = isDark ? "light" : "dark";

        document.body.classList.remove("dark", "light");

        document.body.classList.add(newTheme);

        localStorage.setItem(

            CONFIG.storageTheme,

            newTheme

        );

        this.updateThemeIcon(newTheme);

        this.showToast(

            newTheme === "dark"

                ? "Modo oscuro activado"

                : "Modo claro activado"

        );

    }


    updateThemeIcon(theme) {

        if (!this.themeButton) return;

        const icon = this.themeButton.querySelector("span");

        if (!icon) return;

        icon.textContent =

            theme === "dark"

                ? "☀️"

                : "🌙";

    }


    /*==============================================
        FAVORITOS
    ==============================================*/

    loadFavorites() {

        try {

            return JSON.parse(

                localStorage.getItem(CONFIG.storageFavorites)

            ) || [];

        }

        catch {

            return [];

        }

    }


    saveFavorites(favorites) {

        localStorage.setItem(

            CONFIG.storageFavorites,

            JSON.stringify(favorites)

        );

    }


    toggleFavorite(item) {

        let favorites = this.loadFavorites();

        const id = `${item.norma}-${item.articulo}-${item.apartado}-${item.opcion}`;

        if (favorites.includes(id)) {

            favorites = favorites.filter(f => f !== id);

            this.showToast("Eliminado de favoritos");

        }

        else {

            favorites.push(id);

            this.showToast("Añadido a favoritos");

        }

        this.saveFavorites(favorites);

    }

/*==================================================
    TOAST
==================================================*/

TrafficApp.prototype.showToast = function (message, duration = 2200) {

    if (!this.toast) return;

    this.toast.textContent = message;

    this.toast.classList.add("show");

    clearTimeout(this.toastTimer);

    this.toastTimer = setTimeout(() => {

        this.toast.classList.remove("show");

    }, duration);

};


/*==================================================
    SERVICE WORKER
==================================================*/

async function registerServiceWorker() {

    if (!("serviceWorker" in navigator)) return;

    try {

        await navigator.serviceWorker.register("sw.js");

        console.log("✅ Service Worker registrado.");

    }

    catch (error) {

        console.error("Service Worker:", error);

    }

}


/*==================================================
    GODOT WEBVIEW
==================================================*/

function isGodotWebView() {

    return typeof window.godot !== "undefined"

        || typeof window.JavaScriptBridge !== "undefined";

}


/*==================================================
    APP
==================================================*/

document.addEventListener("DOMContentLoaded", async () => {

    window.app = new TrafficApp();

    await registerServiceWorker();

    if (isGodotWebView()) {

        console.log("🚔 Ejecutándose dentro de Godot.");

    }
    else {

        console.log("🌐 Ejecutándose en navegador.");

    }

});

