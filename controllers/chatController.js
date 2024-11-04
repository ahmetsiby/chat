const Session = require("../models/sessionModel");

// Afficher la page de chat
exports.showChatPage = (req, res) => {
  const user = Session.getSessionUser(req);
  if (!user) {
    return res.redirect("/");
  }
  res.render("chat", {
    username: user.username,
    role: user.role,
    PUBLIC_VAPID_KEY: process.env.PUBLIC_VAPID_KEY,
    cssFile: "/css/chat.css",
  });
};
