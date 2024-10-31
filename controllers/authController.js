const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const User = require("../models/userModel");
const Session = require("../models/sessionModel");

// Afficher la page de connexion
exports.showLoginPage = (req, res) => {
  if (Session.getSessionUser(req)) {
    return res.redirect("/chat");
  }
  res.render("login", { error: null });
};

// Gérer la connexion
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render("login", { error: "Entrées non valides." });
  }

  const { username, password } = req.body;

  try {
    const user = await User.findByUsername(username);
    if (!user) {
      return res.render("login", { error: "Utilisateur non trouvé." });
    }

    if (!user.is_approved) {
      return res.render("login", {
        error: "Votre compte n'a pas encore été approuvé.",
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.render("login", { error: "Mot de passe incorrect." });
    }

    Session.setSessionUser(req, user);
    res.redirect("/chat");
  } catch (error) {
    console.error(error);
    res.render("login", { error: "Erreur interne." });
  }
};

// Afficher la page d'inscription
exports.showRegisterPage = (req, res) => {
  res.render("register", { error: null });
};

// Gérer l'inscription
exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render("register", { error: "Entrées non valides." });
  }

  const { username, password } = req.body;

  try {
    const user = await User.findByUsername(username);
    if (user) {
      return res.render("register", {
        error: "Le nom d'utilisateur existe déjà.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.createUser(username, hashedPassword);
    res.redirect("/");
  } catch (error) {
    console.error(error);
    res.render("register", { error: "Erreur lors de l'inscription." });
  }
};
exports.logout = async (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log("Erreur lors de la destruction de la session");
      return res.redirect("/chat");
    } else {
      res.redirect("/");
    }
  });
};

exports.showRemovePage = (req, res) => {
  return res.render("remove");
};
