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
    const message = input.value.trim();
    if (message) {
      socket.emit("chat message", {
        username: username.toUpperCase(),
        content: message,
      });
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
        // 10MB
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
    console.log("Réception de chat message :", msg);
    if (typeof msg !== "object" || !msg.username || !msg.content) {
      console.error("Format de message incorrect :", msg);
      return;
    }
    const userName = msg.username;
    const message = msg.content;
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

  document.querySelector(".after").addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.innerWidth < 768) {
      document.querySelector(".after").classList.toggle("collapsed");
      document.getElementById("droite").classList.toggle("droite_visible");
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

  const privateChatForm = document.getElementById("private-chat-form");
  const chatForm = document.getElementById("chat-form");
  const Messsages = document.getElementById("messages");
  const connectedUserList = document.getElementById("connected-user-list");
  privateChatForm.style.display = "none"; // Masquer le formulaire de chat privé par défaut
  let currentPrivateChatUser = null; // Variable pour stocker l'utilisateur cible du chat privé
  const allPrivateMessages = new Map(); // Tableau pour stocker les messages privés

  // Fonction pour ouvrir/fermer un chat privé (toggle)
  function togglePrivateChat(targetUsername) {
    const userElements = connectedUserList.querySelectorAll("li");

    if (
      currentPrivateChatUser &&
      currentPrivateChatUser.toLowerCase() === targetUsername.toLowerCase()
    ) {
      // Si le chat privé est déjà ouvert pour cet utilisateur, le fermer
      closePrivateChat();
      userElements.forEach((el) => {
        el.classList.remove("user-selected");
      });
    } else {
      // Sinon, ouvrir le chat privé pour cet utilisateur
      openPrivateChat(targetUsername);
      // Ajouter la bordure à l'utilisateur sélectionné
      userElements.forEach((el) => {
        if (
          el.textContent.trim().toLowerCase() === targetUsername.toLowerCase()
        ) {
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
    // Charger la conversation
    loadConversation(targetUsername);
    // Mettre à jour le titre de la conversation privée

    //titlePrivate.textContent = `Conversation avec ${targetUsername}`;
  }

  // Fonction pour fermer le chat privé et revenir au chat général
  function closePrivateChat() {
    currentPrivateChatUser = null; // Réinitialiser le destinataire du chat privé
    privateChatForm.style.display = "none";
    privateMessages.style.display = "none";
    chatForm.style.display = "flex";
    Messsages.style.display = "flex";
  }

  // Écouteur d'événement pour l'envoi de messages privés
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
      displayPrivateMessageEnvoyer(currentPrivateChatUser, message); // Afficher le message privé dans l'interface
    }
  });

  // Conteneur pour afficher les messages privés
  const privateMessages = document.getElementById("private-messages");
  privateMessages.style.display = "none"; // Masquer les messages privés par défaut

  // Fonction pour afficher le message privé envoyé (vous avez envoyé un message à quelqu'un)
  function displayPrivateMessageEnvoyer(to, message) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message-private");
    messageElement.innerHTML = `Vous: ${formatMessageContent(message)}`; // Utiliser le formatage du message
    privateMessages.appendChild(messageElement);
    privateMessages.scrollTop = privateMessages.scrollHeight;

    // Stocker le message dans allPrivateMessages
    storePrivateMessage(username, to, message);

    // Applique la coloration syntaxique
    const codeElement = messageElement.querySelector("pre code, code");
    if (codeElement) {
      if (typeof Prism !== "undefined") Prism.highlightElement(codeElement);
      if (typeof hljs !== "undefined") hljs.highlightElement(codeElement);
    }
  }

  //const titlePrivate = document.querySelector(".title_message_privée");
  const messageCounts = {};

  // Fonction pour afficher un message reçu (quelqu'un vous a envoyé un message)
  function displayMessage(userName, message) {
    const messages = document.getElementById("messages");
    const messageContainer = document.createElement("div");
    messageContainer.classList.add("message");
    // Utilisez `innerHTML` pour insérer le message formaté
    messageContainer.innerHTML = `${escapeHtml(
      userName[0].toUpperCase()
    )}: ${formatMessageContent(message)}`;

    const userSpan = document.createElement("span");
    userSpan.innerHTML = `${escapeHtml(userName[0].toUpperCase())}`;
    userSpan.appendChild(createAvatar("/images/avatar.jpeg"));
    if (userName.toUpperCase() === username.toUpperCase()) {
      userSpan.classList.add("present");
      /**Notification toast */
    } else {
      /**Notification toast */
      showToast(message, userName);
    }

    messages.append(userSpan, messageContainer);
    messages.scrollTop = messages.scrollHeight;

    // Applique la coloration syntaxique
    const codeElements = messageContainer.querySelectorAll("pre code, code");
    codeElements.forEach((block) => {
      if (typeof Prism !== "undefined") Prism.highlightElement(block);
      if (typeof hljs !== "undefined") hljs.highlightElement(block);
    });
  }
  // Fonction pour afficher un message privé reçu (quelqu'un vous a envoyé un message)
  function displayPrivateMessage(from, message) {
    console.log("Message privé reçu:", message, "de:", from);

    // Stocker le message dans allPrivateMessages
    storePrivateMessage(from, username, message);

    // Gestion du compteur de messages non lus pour l'utilisateur `from`
    const fromLower = from.toLowerCase();
    if (!messageCounts[fromLower]) {
      messageCounts[fromLower] = 0;
    }
    messageCounts[fromLower]++; // Incrémente le compteur pour cet utilisateur

    // Mise à jour des compteurs dans la liste des utilisateurs
    const userElements = connectedUserList.querySelectorAll("li");
    userElements.forEach((el) => {
      if (el.textContent.includes(from)) {
        let countSpan = el.querySelector(".count");
        if (!countSpan) {
          countSpan = document.createElement("span");
          countSpan.classList.add("count");
          el.appendChild(countSpan);
        }

        // Met à jour le compteur avec le nombre de messages non lus
        countSpan.textContent = messageCounts[fromLower];

        // Si le chat est ouvert avec cet utilisateur, réinitialise le compteur
        if (
          currentPrivateChatUser &&
          currentPrivateChatUser.toLowerCase() === fromLower
        ) {
          messageCounts[fromLower] = 0;
          countSpan.textContent = ""; // Masque le compteur
        }
      }
    });

    // Afficher le message uniquement si le chat privé est ouvert avec l'expéditeur
    if (
      currentPrivateChatUser &&
      currentPrivateChatUser.toLowerCase() === fromLower
    ) {
      // Met à jour le titre de la conversation privée
      // if (!titlePrivate.textContent.includes(`${from}`)) {
      //   titlePrivate.textContent = `Conversation avec ${from}`;
      // }

      // Créer l'élément du message
      const messageElement = document.createElement("div");
      messageElement.classList.add("private-message");

      const userEnvoie = document.createElement("span");
      userEnvoie.textContent = from;
      userEnvoie.appendChild(createAvatar("/images/avatar.jpeg"));

      const messageContent = document.createElement("p");
      messageContent.innerHTML = formatMessageContent(message); // Utiliser le formatage du message

      messageElement.append(userEnvoie, messageContent);
      privateMessages.appendChild(messageElement);
      privateMessages.scrollTop = privateMessages.scrollHeight;

      // Applique la coloration syntaxique
      const codeElement = messageContent.querySelector("pre code, code");
      if (codeElement) {
        if (typeof Prism !== "undefined") Prism.highlightElement(codeElement);
        if (typeof hljs !== "undefined") hljs.highlightElement(codeElement);
      }
    }
  }

  /// Fonction pour afficher les messages d'un utilisateur sélectionné
  function storePrivateMessage(from, to, message) {
    const participants = [from, to].sort();
    const key = participants.join("-");
    if (!allPrivateMessages.has(key)) {
      allPrivateMessages.set(key, []);
    }
    // Ajouter le message à la liste des messages privés
    allPrivateMessages.get(key).push({ from, message });
  }

  // Fonction pour charger la conversation avec un utilisateur sélectionné
  function loadConversation(selectedUser) {
    privateMessages.innerHTML = ""; // Efface les messages actuels
    const participants = [username, selectedUser].sort();
    const key = participants.join("-");

    if (allPrivateMessages.has(key)) {
      const conversation = allPrivateMessages.get(key);
      conversation.forEach(({ from, message }) => {
        const messageElement = document.createElement("div");
        messageElement.classList.add("private-message");
        messageElement.innerHTML = `${
          from === username ? "Vous" : escapeHtml(from)
        }: ${formatMessageContent(message)}`;
        privateMessages.appendChild(messageElement);

        // Applique la coloration syntaxique
        const codeElement = messageElement.querySelector("pre code, code");
        if (codeElement) {
          if (typeof Prism !== "undefined") Prism.highlightElement(codeElement);
          if (typeof hljs !== "undefined") hljs.highlightElement(codeElement);
        }
      });

      privateMessages.scrollTop = privateMessages.scrollHeight;
    }
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
        // Création des compteurs
        // Ajoute un écouteur de clic avec le toggle
        li.addEventListener("click", () => {
          if (li.querySelector(".count")) {
            const count = li.querySelector(".count");
            count.innerText = "";
            console.log("click sur user");
          }
          togglePrivateChat(user);
          messageCounts[user.toLowerCase()] = 0;

          // Charger la conversation
          loadConversation(user);
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

  // Fonction pour détecter et formater le code
  function formatMessageContent(message) {
    // Détecte les blocs de code délimités par ```
    const codeBlockPattern = /```(\w+)?\n([\s\S]+?)\n```/g;
    message = message.replace(codeBlockPattern, (match, p1, p2) => {
      const language = p1 ? escapeHtml(p1) : ""; // Langage de programmation (optionnel)
      const codeContent = escapeHtml(p2); // Échappe les caractères HTML spéciaux
      return `<pre><code class="language-${language}">${codeContent}</code></pre>`;
    });

    // Détecte les codes inline avec `
    const inlineCodePattern = /`([^`]+)`/g;
    message = message.replace(inlineCodePattern, (match, p1) => {
      return `<code>${escapeHtml(p1)}</code>`;
    });

    // Convertit les sauts de ligne en <br> pour une meilleure lisibilité dans le chat
    message = message.replace(/\n/g, "<br>");

    return message;
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Écouter les messages privés
  socket.on("private message", ({ content, from }) => {
    console.log("Message privé reçu:", content, from);

    displayPrivateMessage(from, content);
    showToast(content, from, true);
  });

  // Gestion des erreurs
  socket.on("error", (message) => {
    alert(message);
  });

  /*Gestion toast*/
  function showToast(message, userName, isPrivate = false) {
    const messageToast =
      message.length > 20 ? message.substring(0, 20) + "..." : message;
    var toast = document.getElementById("toast");
    toast.innerHTML = `Nouveau message de : ${userName.toUpperCase()} -> ${messageToast}`;

    // Retirer les classes existantes liées au toast
    toast.classList.remove("showToast", "showToastPrivate");

    // Ajouter la classe appropriée
    if (isPrivate) {
      toast.classList.add("showToastPrivate");
    } else {
      toast.classList.add("showToast");
    }

    // Après 3 secondes, retirer les classes pour cacher le toast
    setTimeout(function () {
      toast.classList.remove("showToast", "showToastPrivate");
    }, 3000);
  }
});
