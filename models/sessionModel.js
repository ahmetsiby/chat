const pool = require("../config/database");

// Récupérer les informations de session utilisateur
exports.getSessionUser = (req) => {
  return req.session.user || null;
};

// Définir les informations de session utilisateur
exports.setSessionUser = (req, user) => {
  req.session.user = {
    id: user.id,
    username: user.username,
    role: user.role,
  };
};
