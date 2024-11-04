require("dotenv").config();

const express = require("express");
const session = require("express-session");
const flash = require("connect-flash");
const webpush = require("web-push");
const bodyParser = require("body-parser");
const path = require("path");

const UserModel = require("./models/userModel"); // Votre modèle utilisateur
const authController = require("./controllers/authController");
const chatController = require("./controllers/chatController");
const adminController = require("./controllers/adminController");

const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  maxHttpBufferSize: 1e7,
});

// Middleware pour servir des fichiers statiques
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(flash());

// Configuration des clés VAPID pour les notifications push
webpush.setVapidDetails(
  "mailto:ahmet.siby@hotmail.fr",
  process.env.PUBLIC_VAPID_KEY,
  process.env.PRIVATE_VAPID_KEY
);

// Session Config
const sessionConfig = require("./config/sessionConfig");
app.use(session(sessionConfig));

// Middleware flash pour les messages
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

// Définir EJS comme moteur de template
app.set("view engine", "ejs");

// Routes d'authentification
app.get("/", authController.showLoginPage);
app.post("/login", authController.login);
app.get("/register", authController.showRegisterPage);
app.post("/register", authController.register);
app.post("/logout", authController.logout);

// Route pour mot de passe oublié
app.get("/remove", authController.showRemovePage);

// Route du chat
app.get("/chat", chatController.showChatPage);

// Routes admin
app.get("/admin", adminController.showAdminPage);
app.post("/admin/approve/:id", adminController.approveUser);
app.post("/admin/delete/:id", adminController.deleteUser);
app.post("/admin/remove/:id", adminController.removeUser);

// Gestion des utilisateurs connectés
const connectedUsers = {};
let subscriptions = []; //tableau pour stocker les abonnements
// WebSocket (Socket.io)
io.on("connection", async (socket) => {
  // Utilisateur rejoint le chat
  socket.on("user connected", async (username, isActive) => {
    //vérifier si l'utilisateur est deja connecter
    const existingUser = Object.values(connectedUsers).find(
      (user) => user.username === username
    );
    if (existingUser) {
      //Envoyer un message d'erreur à l'utilisateur
      socket.emit("error", "Vous êtes déjà connecté");
      socket.disconnect();
    } else {
      //Enregistrer la nouvelle connexion
      connectedUsers[socket.id] = { username, isActive };
      const userList = await getSeparateUsers();
      io.emit("userList", userList);
    }
  });

  // Mise à jour de l'état d'activité
  socket.on("user activity", (isActive) => {
    if (connectedUsers[socket.id]) {
      connectedUsers[socket.id].isActive = isActive;
    }
  });

  // Réception des fichiers partagés
  socket.on("file-upload", (data) => {
    console.log(`Fichier reçu : ${data.username} - ${data.fileName}`);
    socket.broadcast.emit("file-shared", data);
    envoyerNotificationAuxInactifs("Nouveau fichier partagé", data.fileName);
  });

  // Réception d'un message de chat
  socket.on("chat message", async (msg) => {
    io.emit("chat message", msg);
    envoyerNotificationAuxInactifs("Nouveau message", msg);
  });

  // Gérer la déconnexion
  socket.on("disconnect", async () => {
    if (connectedUsers[socket.id]) delete connectedUsers[socket.id];
    const userList = await getSeparateUsers();
    io.emit("userList", userList);
  });
});

// Fonction pour récupérer la liste des utilisateurs connectés et non connectés
async function getSeparateUsers() {
  const allUsers = await UserModel.getAllUser({}, "username -_id");
  const allUsernames = allUsers.map((user) => user.username);
  const connectedUsernames = Object.values(connectedUsers).map(
    (user) => user.username
  );
  const nonConnectedUsers = allUsernames.filter(
    (username) => !connectedUsernames.includes(username)
  );
  return { connected: connectedUsernames, nonConnected: nonConnectedUsers };
}

// Fonction pour filtrer les utilisateurs inactifs
function getInactiveUsers() {
  return Object.values(connectedUsers).filter((user) => !user.isActive);
}

// Fonction d'envoi des notifications push
async function envoyerNotificationPush(title, message, subscription) {
  const payload = JSON.stringify({ title, message });
  try {
    await webpush.sendNotification(subscription, payload);
    console.log("Notification envoyée avec succès à :", subscription.endpoint);
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      console.log("Souscription invalide, suppression de la liste.");
      subscriptions = subscriptions.filter((sub) => sub !== subscription);
    }
    console.error("Erreur lors de l'envoi de la notification :", err);
  }
}

// Envoyer une notification à tous les utilisateurs inactifs
async function envoyerNotificationAuxInactifs(titre, message) {
  const inactiveUsers = getInactiveUsers();
  for (const user of inactiveUsers) {
    if (user.subscription) {
      await envoyerNotificationPush(titre, message, user.subscription);
    }
  }
}

// Route pour les abonnements aux notifications push
app.post("/subscribe", (req, res) => {
  const { subscription, username } = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: "Abonnement invalide" });
  }

  const user = Object.values(connectedUsers).find(
    (user) => user.username === username
  );
  if (user) {
    user.subscription = subscription;
    console.log(`Abonnement ajouté pour l'utilisateur ${username}`);
  } else {
    console.log(
      `Utilisateur ${username} non trouvé dans les utilisateurs connectés.`
    );
  }
  res.status(201).json({});
});

// Démarrer le serveur
const PORT = process.env.PORT || 4000;
http.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
