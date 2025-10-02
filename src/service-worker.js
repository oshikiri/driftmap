const CACHE_VERSION = "v0.1.0";
const CACHE_NAME = `driftmap-${CACHE_VERSION}`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./main.js",
  "./style.css",
  "./CompassElement.js",
  "./PedometerElement.js",
  "./compass.js",
  "./editor/index.js",
  "./editor/constants.js",
  "./editor/coords.js",
  "./editor/interaction.js",
  "./editor/pins.js",
  "./editor/renderer.js",
  "./editor/state.js",
  "./editor/styles.js",
  "./editor/template.js",
  "./editor/popovers/lineInputPopover.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const requestURL = new URL(request.url);
  if (requestURL.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return cache.match(request);
  }
}

async function handleNavigationRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const networkResponse = await fetch(request);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    const cachedHome = await cache.match("./index.html");
    if (cachedHome) {
      return cachedHome;
    }
    throw error;
  }
}
