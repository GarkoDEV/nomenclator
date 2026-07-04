/*==================================================
    NOMENCLÁTOR DE TRÁFICO
    GarkoDEV
    app.js
==================================================*/


/*==================================================
    CONFIGURACIÓN
==================================================*/

const CONFIG = {

    VERSION: "1.0.0",

    STORAGE_THEME: "nomenclator_theme",

    STORAGE_FAVORITES: "nomenclator_favorites",

    MAX_PREVIEW: 110

};


/*==================================================
    BASE DE DATOS
==================================================*/

const DATABASE = [

    {

        norma: "RGC",

        articulo: "48",

        apartado: "1",

        opcion: "5A",

        texto: "Circular superando los límites de velocidad establecidos para la vía.",

        importe: 200,

        importe_reducido: 100,

        puntos: 2

    },

    {

        norma: "RGC",

        articulo: "18",

        apartado: "2",

        opcion: "1",

        texto: "Conducir utilizando manualmente el teléfono móvil.",

        importe: 200,

        importe_reducido: 100,

        puntos: 6

    },

    {

        norma: "RGV",

        articulo: "25",

        apartado: "1",

        opcion: "2",

        texto: "Circular con neumáticos en mal estado.",

        importe: 200,

        importe_reducido: 100,

        puntos: 0

    },

    {

        norma: "RGCOND",

        articulo: "3",

        apartado: "1",

        opcion: "A",

        texto: "Conducir careciendo del permiso correspondiente.",

        importe: 500,

        importe_reducido: 250,

        puntos: 4

    },

    {

        norma: "LSV",

        articulo: "76",

        apartado: "Z",

        opcion: "3",

        texto: "No utilizar el cinturón de seguridad.",

        importe: 200,

        importe_reducido: 100,

        puntos: 4

    }

];


/*==================================================
    VARIABLES
==================================================*/

let currentFilter = "TODOS";

let searchText = "";

let filteredData = [...DATABASE];

let favorites = [];

let darkMode = true;


/*==================================================
    DOM
==================================================*/

const results = document.getElementById("results");

const template = document.getElementById("cardTemplate");

const searchInput = document.getElementById("searchInput");

const filters = document.getElementById("filters");

const counter = document.getElementById("resultsCounter");

const empty = document.getElementById("emptyState");

const toast = document.getElementById("toast");

const themeButton = document.getElementById("themeButton");

const clearButton = document.getElementById("clearSearch");

const fab = document.getElementById("scrollTop");

/*==================================================
    CLASE PRINCIPAL
==================================================*/

class TrafficApp {

    constructor() {

        this.data = DATABASE;

        this.filtered = [...DATABASE];

        this.filter = "TODOS";

        this.search = "";

        this.init();

    }


    /*==============================================
        INICIO
    ==============================================*/

    init() {

        this.loadTheme();

        this.renderFilters();

        this.filterData();

        this.registerEvents();

        this.updateCounter();

    }


    /*==============================================
        NORMALIZAR TEXTO
    ==============================================*/

    normalize(text) {

        return String(text)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();

    }


    /*==============================================
        FILTRAR
    ==============================================*/

    filterData() {

        const search = this.normalize(this.search);

        this.filtered = this.data.filter(item => {

            const matchFilter =
                this.filter === "TODOS" ||
                item.norma === this.filter;

            const searchable = [

                item.norma,

                item.articulo,

                item.apartado,

                item.opcion,

                item.texto

            ].join(" ");

            const matchSearch =
                this.normalize(searchable).includes(search);

            return matchFilter && matchSearch;

        });

        this.renderCards();

        this.updateCounter();

        this.toggleEmpty();

    }


    /*==============================================
        CONTADOR
    ==============================================*/

    updateCounter() {

        counter.textContent =
            `${this.filtered.length} infracciones`;

    }


    /*==============================================
        EMPTY
    ==============================================*/

    toggleEmpty() {

        empty.classList.toggle(

            "hidden",

            this.filtered.length !== 0

        );

    }


    /*==============================================
        TOAST
    ==============================================*/

    showToast(message) {

        toast.textContent = message;

        toast.classList.add("show");

        clearTimeout(this.toastTimer);

        this.toastTimer = setTimeout(() => {

            toast.classList.remove("show");

        }, 2200);

    }
    /*==============================================
        RENDER CARDS
    ==============================================*/

    renderCards() {

        results.textContent = "";

        const fragment = document.createDocumentFragment();

        this.filtered.forEach(item => {

            const node = template.content.cloneNode(true);

            const card = node.querySelector(".card");

            const badge = node.querySelector(".badge");

            const article = node.querySelector(".article");

            const preview = node.querySelector(".preview");

            const price = node.querySelector(".price");

            const detailNorma = node.querySelector(".detailNorma");

            const detailArticulo = node.querySelector(".detailArticulo");

            const detailApartado = node.querySelector(".detailApartado");

            const detailOpcion = node.querySelector(".detailOpcion");

            const description = node.querySelector(".description");

            const importe = node.querySelector(".importe");

            const reducido = node.querySelector(".reducido");

            const puntos = node.querySelector(".puntos");


            /*==========================================
                CABECERA
            ==========================================*/

            badge.textContent = item.norma;

            badge.classList.add(

                item.norma.toLowerCase()

            );

            article.textContent =
                `Artículo ${item.articulo}`;

            preview.textContent =
                item.texto.substring(0, CONFIG.MAX_PREVIEW) + "...";

            price.textContent =
                item.importe + " €";


            /*==========================================
                DETALLE
            ==========================================*/

            detailNorma.textContent =
                item.norma;

            detailArticulo.textContent =
                item.articulo;

            detailApartado.textContent =
                item.apartado || "-";

            detailOpcion.textContent =
                item.opcion || "-";

            description.textContent =
                item.texto;

            importe.textContent =
                item.importe + " €";

            reducido.textContent =
                item.importe_reducido + " €";

            puntos.textContent =
                item.puntos;


            /*==========================================
                COLOR PUNTOS
            ==========================================*/

            if(item.puntos===0){

                puntos.parentElement.style.background="#16A34A";

                puntos.textContent="—";

            }


            /*==========================================
                ABRIR / CERRAR
            ==========================================*/

            node
            .querySelector(".card-header")
            .addEventListener("click",()=>{

                card.classList.toggle("open");

            });


            fragment.appendChild(node);

        });


        results.appendChild(fragment);

    }
