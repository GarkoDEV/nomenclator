/* ==========================================================
   NOMENCLÁTOR DE TRÁFICO
   Service Worker
   Versión 1.0
========================================================== */

const CACHE_NAME = "nomenclator-v1.0.0";

const FILES_TO_CACHE = [

    "./",

    "./index.html",

    "./styles.css",

    "./app.js",

    "./datos.json",

    "./manifest.json",

    "./icons/favicon.png",

    "./icons/icon-192.png",

    "./icons/icon-512.png"

];


/* ==========================================================
    INSTALACIÓN
========================================================== */

self.addEventListener("install", event => {

    event.waitUntil(

        caches.open(CACHE_NAME)

            .then(cache => cache.addAll(FILES_TO_CACHE))

    );

    self.skipWaiting();

});


/* ==========================================================
    ACTIVACIÓN
========================================================== */

self.addEventListener("activate", event => {

    event.waitUntil(

        caches.keys()

            .then(keys =>

                Promise.all(

                    keys.map(key => {

                        if (key !== CACHE_NAME) {

                            return caches.delete(key);

                        }

                    })

                )

            )

    );

    self.clients.claim();

});


/* ==========================================================
    FETCH
========================================================== */

self.addEventListener("fetch", event => {

    if (event.request.method !== "GET") return;

    event.respondWith(

        caches.match(event.request)

            .then(cacheResponse => {

                if (cacheResponse) {

                    return cacheResponse;

                }

                return fetch(event.request)

                    .then(networkResponse => {

                        const responseClone = networkResponse.clone();

                        caches.open(CACHE_NAME)

                            .then(cache => {

                                cache.put(event.request, responseClone);

                            });

                        return networkResponse;

                    })

                    .catch(() => {

                        if (event.request.mode === "navigate") {

                            return caches.match("./index.html");

                        }

                    });

            })

    );

});
