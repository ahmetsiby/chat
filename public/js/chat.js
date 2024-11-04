document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll("button");
  buttons.forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  });
  const socket = io();
  let isActive = document.visibilityState === "visible";
  let unreadMessages = 0;

  socket.emit("user connected", username, isActive);

  document.addEventListener("visibilitychange", () => {
    isActive = document.visibilityState === "visible";
    socket.emit("user activity", isActive);

    if (isActive) {
      unreadMessages = 0;
      afficherMessageNonLu();
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
      afficherMessageNonLu();
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
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  function afficherMessageNonLu() {
    const notif = document.querySelector(".notif");
    notif.style.display = unreadMessages > 0 ? "block" : "none";
    notif.textContent = unreadMessages;
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

  function updateUserLists(userList) {
    const connectedUserList = document.getElementById("connected-user-list");
    const nonConnectedUserList = document.getElementById(
      "non-connected-user-list"
    );

    connectedUserList.innerHTML = "";
    userList.connected.forEach((user) => {
      if (user !== username) {
        const li = document.createElement("li");
        li.textContent = user;
        li.prepend(createAvatar("/images/avatar.jpeg"));
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
  //Gestion des erreurs
  socket.on("error", (message) => {
    alert(`Erreur de connexion : ${message}. Vous allez être déconnecté.`);
    //socket.disconnect();
    window.location.href = "/login";
  });
});
