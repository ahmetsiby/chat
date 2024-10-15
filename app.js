const express = require("express");
const session = require("express-session");
const path = require("path");

const authController = require("./controllers/authController");
const chatController = require("./controllers/chatController");
const adminController = require("./controllers/adminController");

const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

// Middleware pour servir des fichiers statiques
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

// Sessions
const sessionConfig = require("./config/sessionConfig");
app.use(session(sessionConfig));

// Définir EJS comme moteur de template
app.set("view engine", "ejs");

// Routes d'authentification
app.get("/", authController.showLoginPage);
app.post("/login", authController.login);
app.get("/register", authController.showRegisterPage);
app.post("/register", authController.register);

// Route du chat
app.get("/chat", chatController.showChatPage);

// Routes admin
app.get("/admin", adminController.showAdminPage);
app.post("/admin/approve/:id", adminController.approveUser);

// WebSocket (Socket.io)
io.on("connection", (socket) => {
  console.log("Un utilisateur est connecté.");
  socket.on("chat message", (msg) => {
    io.emit("chat message", msg);
  });
  socket.on("disconnect", () => {
    console.log("Un utilisateur est déconnecté.");
  });
});

// Démarrer le serveur
const PORT = process.env.PORT || 4000;
http.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
