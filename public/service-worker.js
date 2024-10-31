const CACHE_NAME = "chat-app-cache-v1";
const urlsToCache = [
  "/",
  "/css/style.css",
  "/avatar.jpeg",
  "/doight.webp",
  "/favicon.ico",
  "/icon-512x512.png",
  "/manifest.json",
];

// Installation et mise en cache des ressources de base
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Cache ouvert");
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error("Échec d'ouverture du cache:", error);
      })
  );
});

// Gestion des requêtes pour servir depuis le cache
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return (
        response ||
        fetch(event.request).catch((error) => {
          console.error("Échec de récupération de ressource:", error);
        })
      );
    })
  );
});

// Activation et nettoyage des anciens caches
self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Gestion des notifications push et mise à jour du badge
let notificationCount = 0;
self.addEventListener("push", (event) => {
  const data = event.data.json();
  notificationCount++;
  const options = {
    body: data.message,
    icon: "/icon-512x512.png",
  };
  event.waitUntil(
    self.registration.showNotification(
      data.title || "Notification Push",
      options
    )
  );
  updateBadge(notificationCount);
});

// Mettre à jour le badge
function updateBadge(count) {
  if ("setAppBadge" in navigator) {
    navigator.setAppBadge(count).catch(console.error);
  }
}

// Effacer le badge
function clearBadge() {
  if ("clearAppBadge" in navigator) {
    navigator.clearAppBadge().catch(console.error);
  }
}

// Réinitialiser le compteur de notifications
self.addEventListener("message", (event) => {
  if (event.data === "reset-notifications") {
    notificationCount = 0;
    clearBadge();
  }
});

// Gestion du clic sur la notification pour ouvrir l'application
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Vérifier si une fenêtre de chat est déjà ouverte
        for (const client of clientList) {
          if (
            client.url.startsWith("http://localhost:4000/chat") &&
            "focus" in client
          ) {
            // Si la fenêtre existe déjà, vérifier si elle est visible
            if (client.visibilityState === "visible") {
              return client.focus();
            } else {
              // Si elle n'est pas visible, alors la focaliser
              return client.focus();
            }
          }
        }

        // Si aucune fenêtre n'est trouvée, ouvrir une nouvelle fenêtre
        return clients.openWindow("http://localhost:4000/chat");
      })
  );
});
