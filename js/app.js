/* ==========================================================
   NOMENCLÁTOR DE TRÁFICO
   GarkoDEV
   app.js
========================================================== */

"use strict";

/* ==========================================================
   BASE DE DATOS (TEMPORAL)
   Más adelante se cargará desde data/nomenclator.json
========================================================== */

const DATABASE = [

    {
        norma:"RGC",
        articulo:"48",
        apartado:"1",
        opcion:"5A",
        texto:"Circular superando la velocidad máxima permitida en vía urbana.",
        importe:200,
        importe_reducido:100,
        puntos:4
    },

    {
        norma:"RGC",
        articulo:"18",
        apartado:"2",
        opcion:"3B",
        texto:"Conducir utilizando manualmente un teléfono móvil.",
        importe:200,
        importe_reducido:100,
        puntos:6
    },

    {
        norma:"RGV",
        articulo:"15",
        apartado:"1",
        opcion:"1",
        texto:"Circular con neumáticos en mal estado.",
        importe:200,
        importe_reducido:100,
        puntos:0
    }

];

/* ==========================================================
   APLICACIÓN
========================================================== */

const App = {

    /* ---------------------------- */

    data:[],

    filtered:[],

    currentFilter:"TODOS",

    query:"",

    favorites:[],

    history:[],

    settings:{

        theme:"dark"

    },

    /* ---------------------------- */

    elements:{},

    /* ======================================================
       INICIO
    ====================================================== */

    init(){

        console.log("🚔 Nomenclátor iniciado");

        this.cacheDOM();

        this.loadSettings();

        this.loadData();

        this.bindEvents();

        this.updateStats();

    },

    /* ======================================================
       CACHE DOM
    ====================================================== */

    cacheDOM(){

        this.elements.results=
            document.getElementById("results");

        this.elements.search=
            document.getElementById("searchInput");

        this.elements.filters=
            document.getElementById("filters");

        this.elements.empty=
            document.getElementById("empty");

        this.elements.stats=
            document.getElementById("statsText");

        this.elements.theme=
            document.getElementById("themeButton");

        this.elements.toast=
            document.getElementById("toast");

    },

    /* ======================================================
       CARGAR DATOS
    ====================================================== */

    loadData(){

        this.data=[...DATABASE];

        this.filtered=[...DATABASE];

    },

    /* ======================================================
       AJUSTES
    ====================================================== */

    loadSettings(){

        const settings=

            localStorage.getItem("nomenclator-settings");

        if(settings){

            this.settings=JSON.parse(settings);

        }

        this.applyTheme();

    },

    saveSettings(){

        localStorage.setItem(

            "nomenclator-settings",

            JSON.stringify(this.settings)

        );

    },

    /* ======================================================
       TEMA
    ====================================================== */

    applyTheme(){

        if(this.settings.theme==="light"){

            document.body.classList.add("light");

        }else{

            document.body.classList.remove("light");

        }

        this.updateThemeIcon();

    },

    toggleTheme(){

        this.settings.theme=

            this.settings.theme==="dark"

            ? "light"

            : "dark";

        this.applyTheme();

        this.saveSettings();

        this.toast(

            this.settings.theme==="dark"

            ? "🌙 Tema oscuro"

            : "☀️ Tema claro"

        );

    },

    updateThemeIcon(){

        const icon=

            this.elements.theme.querySelector("span");

        icon.textContent=

            this.settings.theme==="dark"

            ? "light_mode"

            : "dark_mode";

    },

    /* ======================================================
       ESTADÍSTICAS
    ====================================================== */

    updateStats(){

        this.elements.stats.textContent=

            `${this.filtered.length} infracciones`;

    },

    /* ======================================================
       EVENTOS
    ====================================================== */

    bindEvents(){

        this.elements.theme.addEventListener(

            "click",

            ()=>this.toggleTheme()

        );

    },

    /* ======================================================
       TOAST
    ====================================================== */

    toast(message){

        const toast=this.elements.toast;

        toast.textContent=message;

        toast.classList.add("show");

        clearTimeout(this.toastTimer);

        this.toastTimer=setTimeout(()=>{

            toast.classList.remove("show");

        },2000);

    }

};

/* ==========================================================
   START
========================================================== */

document.addEventListener(

    "DOMContentLoaded",

    ()=>App.init()

);

