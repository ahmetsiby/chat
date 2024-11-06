document.addEventListener("DOMContentLoaded", () => {
  const socket = io();

  let isActive = document.visibilityState === "visible";
  let unreadMessages = 0;

  socket.emit("user connected", username, isActive);

  document.addEventListener("visibilitychange", () => {
    isActive = document.visibilityState === "visible";
    socket.emit("user activity", isActive); // Met à jour côté serveur
    if (navigator.serviceWorker.controller) {
      // Envoyer l'état d'activité au Service Worker
      navigator.serviceWorker.controller.postMessage({
        type: "update-activity",
        isActive: isActive,
      });
    }
    if (isActive) {
      unreadMessages = 0;
      // afficherMessageNonLu();
    }
  });

  document.getElementById("chat-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("message-input");
    const message = `${username.toUpperCase()}: ${input.value.trim()}`;

    if (input.value.trim()) {
      socket.emit("chat message", message);
      input.value = "";
    }
  });

  document.getElementById("upload-icon").addEventListener("click", () => {
    document.getElementById("file-input").click();
  });

  document.getElementById("file-input").addEventListener("change", (e) => {
    const files = e.target.files;
    if (files.length === 0) {
      console.log("Aucun fichier sélectionné.");
      return;
    }

    [...files].forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        alert("Fichier trop volumineux");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const fileData = reader.result;

        // Envoyer le fichier au serveur via socket
        socket.emit("file-upload", {
          fileName: file.name,
          fileType: file.type,
          fileData: fileData,
          username,
        });

        // Afficher le fichier localement dans la liste des fichiers
        displayFile(file.name, fileData);
      };
      reader.readAsDataURL(file);
    });
  });

  const avatar = createAvatar("/images/avatar.jpeg");

  socket.on("chat message", (msg) => {
    const [userName, ...messageParts] = msg.split(":");
    const message = messageParts.join(":").trim();
    displayMessage(userName, message);

    if (!isActive) {
      unreadMessages++;
      // afficherMessageNonLu();
    }
  });

  socket.on("userList", (userList) => {
    updateUserLists(userList);
  });

  function displayFile(fileName, fileData, userName = "") {
    const messages = document.getElementById("messages");
    const li = document.createElement("li");
    const userSpan = document.createElement("span");
    userSpan.textContent = username[0].toUpperCase();

    if (userName) {
      userSpan.textContent = userName[0].toUpperCase();
      li.classList.add("file", "recu");
    } else {
      li.classList.add("file");
    }
    userSpan.appendChild(createAvatar("/images/avatar.jpeg"));
    li.appendChild(userSpan);
    const link = document.createElement("a");
    link.href = fileData;
    link.download = fileName;
    link.textContent = fileName;
    li.appendChild(link);
    messages.appendChild(li);
  }

  socket.on("file-shared", (data) =>
    displayFile(data.fileName, data.fileData, data.username)
  );

  const modal = document.querySelector(".modal");
  document.getElementById("messages").addEventListener("contextmenu", (e) => {
    e.preventDefault();
    modal.style.display = "flex";
  });
  document.addEventListener("click", (e) => {
    e.stopPropagation();
    if (e.target === modal) modal.style.display = "none";
  });

  document.getElementById("droite").addEventListener("click", (e) => {
    if (window.innerWidth < 768) {
      e.preventDefault();
      e.stopPropagation();
      document.getElementById("droite").classList.toggle("collapsed");
    }
  });

  const btns = document.querySelector(".fa-ellipsis-vertical");
  btns.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleUserOptions();
  });

  function toggleUserOptions() {
    document.querySelectorAll(".btn_user, .btn_admin").forEach((btn) => {
      if (btn) btn.classList.toggle("show");
    });
  }

  if ("serviceWorker" in navigator && "PushManager" in window) {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        Notification.requestPermission().then((result) => {
          if (result === "granted") subscribeUserToPush(registration);
        });
      })
      .catch((error) =>
        console.error(
          "Erreur lors de l'enregistrement du Service Worker:",
          error
        )
      );
  }

  function subscribeUserToPush(registration) {
    registration.pushManager.getSubscription().then((subscription) => {
      if (subscription) {
        subscription.unsubscribe().then(() => subscribe(registration));
      } else {
        subscribe(registration);
      }
    });
  }

  function subscribe(registration) {
    const applicationServerKey = urlBase64ToUint8Array(PUBLIC_VAPID_KEY);
    registration.pushManager
      .subscribe({ userVisibleOnly: true, applicationServerKey })
      .then((subscription) => {
        fetch("/subscribe", {
          method: "POST",
          body: JSON.stringify({ subscription, username }),
          headers: { "content-type": "application/json" },
        });
      });
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  function createAvatar(src) {
    const avatar = document.createElement("img");
    avatar.src = src;
    avatar.classList.add("avatar");
    avatar.style.width = "30px";
    avatar.style.height = "30px";
    avatar.style.borderRadius = "50%";
    return avatar;
  }

  function displayMessage(userName, message) {
    const messages = document.getElementById("messages");
    const messageElement = document.createElement("div");
    messageElement.textContent = message;
    messageElement.classList.add("message");

    const userSpan = document.createElement("span");
    userSpan.textContent = userName[0].toUpperCase();
    userSpan.appendChild(createAvatar("/images/avatar.jpeg"));
    if (userName.toUpperCase() === username.toUpperCase()) {
      userSpan.classList.add("present");
    }

    messages.append(userSpan, messageElement);
    messages.scrollTop = messages.scrollHeight;
  }

  const privateChatForm = document.getElementById("private-chat-form");
  const chatForm = document.getElementById("chat-form");
  const Messsages = document.getElementById("messages");
  const connectedUserList = document.getElementById("connected-user-list");
  privateChatForm.style.display = "none"; // Masquer le formulaire de chat privé par défaut
  let currentPrivateChatUser = null; // Variable pour stocker l'utilisateur cible du chat privé

  // Fonction pour ouvrir/fermer un chat privé (toggle)
  function togglePrivateChat(targetUsername) {
    const userElements = connectedUserList.querySelectorAll("li");

    if (currentPrivateChatUser === targetUsername) {
      // Si le chat privé est déjà ouvert pour cet utilisateur, le fermer
      closePrivateChat();
      userElements.forEach((el) => {
        el.classList.remove("user-selected");
        //el.querySelector(".count").textContent = "";
      });
    } else {
      // Sinon, ouvrir le chat privé pour cet utilisateur
      openPrivateChat(targetUsername);
      //ajouter la bordure à l'utilisateur sélectionné
      userElements.forEach((el) => {
        if (el.textContent === targetUsername) {
          el.classList.add("user-selected");
        } else {
          el.classList.remove("user-selected");
        }
      });
    }
  }
  // Fonction pour ouvrir un chat privé
  function openPrivateChat(targetUsername) {
    currentPrivateChatUser = targetUsername; // Définir le destinataire du message privé
    privateChatForm.style.display = "flex";
    privateMessages.style.display = "flex";
    chatForm.style.display = "none";
    Messsages.style.display = "none";
    document.getElementById("private-message-input").focus();
  }
  // Fonction pour fermer le chat privé et revenir au chat général
  function closePrivateChat() {
    currentPrivateChatUser = null; // Réinitialiser le destinataire du chat privé
    privateChatForm.style.display = "none";
    privateMessages.style.display = "none";
    chatForm.style.display = "flex";
    Messsages.style.display = "flex";
  }

  // Écouteur d'événement pour l'envoi de messages privés (ajouté une seule fois)
  privateChatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("private-message-input");
    const message = input.value.trim();

    if (message && currentPrivateChatUser) {
      socket.emit("private message", {
        content: message,
        to: currentPrivateChatUser,
      });
      input.value = ""; // Réinitialiser le champ de saisie
      displayPrivateMessageEnvoyer(username, message); // Afficher le message privé dans l'interface
    }
  });

  // Conteneur pour afficher les messages privés
  // Conteneur pour afficher les messages privés
  const privateMessages = document.getElementById("private-messages");
  privateMessages.style.display = "none"; // Masquer les messages privés par défaut

  // Fonction pour afficher le message privé envoyé (vous avez envoyé un message à quelqu'un)
  function displayPrivateMessageEnvoyer(to, message) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message-private");
    messageElement.textContent = `${to}: ${message}`; // Affiche "Vous" pour indiquer que c'est envoyé par vous
    privateMessages.appendChild(messageElement);
  }
  const titlePrivate = document.querySelector(".title_message_privée");
  const messageCounts = {};
  // Fonction pour afficher un message privé reçu (quelqu'un vous a envoyé un message)
  function displayPrivateMessage(from, message) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("private-message");

    // Met à jour le titre de la conversation privée
    if (!titlePrivate.textContent.includes(`${from}`)) {
      titlePrivate.textContent = `Message privé de ${from}`;
      console.log("Réévaluer");
    }

    // Affiche le message reçu
    messageElement.textContent = `${from}: ${message}`;
    privateMessages.appendChild(messageElement);

    // Gestion du compteur de messages non lus pour l'utilisateur `from`
    if (!messageCounts[from]) {
      messageCounts[from] = 0;
    }
    messageCounts[from]++; // Incrémente le compteur pour cet utilisateur

    // Sélectionne l'utilisateur qui a envoyé le message et met à jour le compteur
    const userElements = connectedUserList.querySelectorAll("li");
    userElements.forEach((el) => {
      if (el.textContent.includes(from)) {
        // Ajoute un élément `span` pour le compteur s'il n'existe pas déjà
        let countSpan = el.querySelector(".count");
        if (!countSpan) {
          countSpan = document.createElement("span");
          countSpan.classList.add("count");
          el.appendChild(countSpan);
        }

        // Met à jour le compteur avec le nombre de messages non lus
        countSpan.textContent = messageCounts[from];

        // Si le chat est ouvert, réinitialise le compteur pour cet utilisateur
        if (el.classList.contains("user-selected")) {
          messageCounts[from] = 0;
          countSpan.textContent = ""; // Masque le compteur
        }
      } else {
        // Supprime le compteur pour les autres utilisateurs
        const otherCount = el.querySelector(".count");
        if (otherCount) {
          otherCount.textContent = "";
        }
      }
    });
  }

  // Met à jour la liste des utilisateurs connectés et ajoute le toggle sur chaque utilisateur
  function updateUserLists(userList) {
    const nonConnectedUserList = document.getElementById(
      "non-connected-user-list"
    );

    connectedUserList.innerHTML = "";
    userList.connected.forEach((user) => {
      if (user !== username) {
        const li = document.createElement("li");
        li.textContent = user;
        li.prepend(createAvatar("/images/avatar.jpeg"));
        //craetion de notre compteurs
        // Ajoute un écouteur de clic avec le toggle
        li.addEventListener("click", () => {
          if (li.querySelector(".count")) {
            const count = li.querySelector(".count");
            count.innerText = "";
            console.log("click sur uesr");
          }
          togglePrivateChat(user);
          messageCounts[user] = 0;
        });

        connectedUserList.appendChild(li);
      }
    });

    nonConnectedUserList.innerHTML = "";
    userList.nonConnected.forEach((user) => {
      const li = document.createElement("li");
      li.textContent = user;
      li.prepend(createAvatar("/images/avatar.jpeg"));
      nonConnectedUserList.appendChild(li);
    });
  }

  // Écouter les messages privés
  socket.on("private message", ({ content, from }) => {
    console.log("Message privé reçu:", content, from);

    displayPrivateMessage(from, content);
  });

  // Exemple d'utilisation pour ouvrir un chat privé avec un utilisateur

  // Gestion des erreurs
  socket.on("error", (message) => {
    alert(message);
  });
});
