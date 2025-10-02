import "./CompassElement.js";
import "./PedometerElement.js";
import "./editor/index.js";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const serviceWorkerUrl = new URL("./service-worker.js", import.meta.url);
    navigator.serviceWorker.register(serviceWorkerUrl).catch((error) => {
      console.error("Service worker registration failed", error);
    });
  });
}
