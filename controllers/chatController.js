const Session = require("../models/sessionModel");

// Afficher la page de chat
exports.showChatPage = (req, res) => {
  const user = Session.getSessionUser(req);
  if (!user) {
    return res.redirect("/");
  }
  res.render("chat", { username: user.username });
};
