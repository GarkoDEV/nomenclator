"use strict";

/*==================================================
    NOMENCLÁTOR DE TRÁFICO v3
    GarkoDEV
==================================================*/

/*==================================================
    ESTADO GLOBAL
==================================================*/

const STATE = {

    data: [],

    results: [],

    search: "",

    filter: "TODOS",

    favorites: [],

    history: [],

    settings: {

        theme: "dark"

    }

};

/*==================================================
    DOM
==================================================*/

const DOM = {

    search: document.querySelector("#searchInput"),

    results: document.querySelector("#results"),

    filters: document.querySelector("#filters"),

    stats: document.querySelector("#statsText"),

    empty: document.querySelector("#empty"),

    toast: document.querySelector("#toast"),

    theme: document.querySelector("#themeButton")

};

/*==================================================
    BASE DE DATOS (Temporal)
==================================================*/

const DATABASE = [

    {

        norma:"RGC",

        articulo:"48",

        apartado:"1",

        opcion:"5A",

        texto:"Circular superando la velocidad máxima permitida.",

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

        norma:"LSV",

        articulo:"76",

        apartado:"Z3",

        opcion:"1",

        texto:"No utilizar el cinturón de seguridad.",

        importe:200,

        importe_reducido:100,

        puntos:4

    }

];

/*==================================================
    NORMALIZAR TEXTO
==================================================*/

function normalize(text){

    return String(text)

        .normalize("NFD")

        .replace(/[\u0300-\u036f]/g,"")

        .toLowerCase()

        .trim();

}

/*==================================================
    INDEXAR DATOS
==================================================*/

function buildIndex(){

    STATE.data = DATABASE.map(item=>{

        return{

            ...item,

            searchIndex:normalize(

                [

                    item.norma,

                    item.articulo,

                    item.apartado,

                    item.opcion,

                    item.texto,

                    item.importe,

                    item.puntos

                ].join(" ")

            )

        };

    });

    STATE.results=[...STATE.data];

}

document.addEventListener(

    "DOMContentLoaded",

    init

);

