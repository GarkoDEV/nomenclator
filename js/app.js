/* ==========================================================
   NOMENCLÁTOR DE TRÁFICO
   app.js
========================================================== */

let datos = [];

let filtroActual = "TODOS";

const resultados = document.getElementById("results");
const buscador = document.getElementById("searchInput");
const emptyState = document.getElementById("emptyState");

const botones = document.querySelectorAll(".filter");

/*==========================================================
    NORMALIZAR TEXTO
==========================================================*/

function normalizar(texto){

    return texto
        .toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g,"")
        .toLowerCase();

}


/*==========================================================
    CARGAR JSON
==========================================================*/

async function cargarDatos(){

    try{

        const respuesta = await fetch("datos.json");

        datos = await respuesta.json();

        render();

    }catch(error){

        console.error(error);

    }

}

cargarDatos();


/*==========================================================
    BUSCADOR
==========================================================*/

buscador.addEventListener("input",render);


/*==========================================================
    FILTROS
==========================================================*/

botones.forEach(boton=>{

    boton.addEventListener("click",()=>{

        botones.forEach(b=>b.classList.remove("active"));

        boton.classList.add("active");

        filtroActual=boton.dataset.filter;

        render();

    });

});


/*==========================================================
    RENDER
==========================================================*/

function render(){

    resultados.innerHTML="";

    const texto=normalizar(buscador.value);

    const fragment=document.createDocumentFragment();

    const lista=datos.filter(item=>{

        const coincideFiltro=

            filtroActual==="TODOS"

            ||

            item.norma===filtroActual;

        const contenido=normalizar(

            item.norma+" "+

            item.articulo+" "+

            item.apartado+" "+

            item.opcion+" "+

            item.texto+" "+

            item.importe+" "+

            item.puntos

        );

        return coincideFiltro && contenido.includes(texto);

    });

    emptyState.classList.toggle(

        "hidden",

        lista.length>0

    );

    lista.forEach(item=>{

        fragment.appendChild(

            crearCard(item)

        );

    });

    resultados.appendChild(fragment);

}


/*==========================================================
    CREAR TARJETA
==========================================================*/

function crearCard(item){

    const card=document.createElement("article");

    card.className="card";

    card.innerHTML=`

        <button class="card-header">

            <div>

                <span class="badge">

                    ${item.norma}

                </span>

                <span class="article">

                    Art. ${item.articulo}

                </span>

            </div>

            <strong>

                ${item.importe} €

            </strong>

        </button>

        <div class="card-body">

            <p class="description">

                ${item.texto}

            </p>

            <div class="details">

                <div>

                    <span>Importe</span>

                    <strong>

                        ${item.importe} €

                    </strong>

                </div>

                <div>

                    <span>Reducido</span>

                    <strong>

                        ${item.importe_reducido} €

                    </strong>

                </div>

                <div>

                    <span>Puntos</span>

                    <strong class="puntos">

                        ${item.puntos}

                    </strong>

                </div>

            </div>

        </div>

    `;

    card
    .querySelector(".card-header")
    .addEventListener("click",()=>{

        card.classList.toggle("open");

    });

    return card;

}


/*==========================================================
    PWA
==========================================================*/

if("serviceWorker" in navigator){

    window.addEventListener("load",()=>{

        navigator.serviceWorker.register("sw.js");

    });

}
