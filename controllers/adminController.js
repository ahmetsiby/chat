// controllers/adminController.js

const User = require("../models/userModel");

// Afficher la page admin avec les utilisateurs en attente
exports.showAdminPage = async (req, res) => {
  const user = req.session.user;
  if (!user || user.role !== "admin") {
    req.flash("error", "Access denied");
    return res.redirect("/chat");
  }

  try {
    const Allusers = await User.getAllUser();
    res.render("admin", { Allusers: Allusers, cssFile: "/css/admin.css" });
  } catch (error) {
    console.error(error);
    req.flash("error", "Erreur lors du chargement des utilisateurs.");
    res.redirect("/chat");
  }
};

// Approuver un utilisateur
exports.approveUser = async (req, res) => {
  const user = req.session.user;
  if (!user || user.role !== "admin") {
    req.flash("error", "Access denied");
    return res.redirect("/chat");
  }

  try {
    const userId = req.params.id;
    await User.approveUser(userId);
    req.flash("success", "Utilisateur approuvé avec succès.");
    res.redirect("/admin");
  } catch (error) {
    console.error(error);
    req.flash("error", "Erreur lors de l'approbation de l'utilisateur.");
    res.redirect("/chat");
  }
};

// Supprimer un utilisateur
exports.deleteUser = async (req, res) => {
  const user = req.session.user;
  if (!user || user.role !== "admin") {
    req.flash("error", "Access denied");
    return res.redirect("/chat");
  }

  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      req.flash("error", "Invalid user ID");
      return res.redirect("/admin");
    }

    await User.deleteUser(userId);
    req.flash("success", "Utilisateur supprimé avec succès.");
    res.redirect("/admin");
  } catch (error) {
    console.error(error);
    req.flash("error", "Erreur lors de la suppression de l'utilisateur.");
    res.redirect("/chat");
  }
};

// Modifier un Mot de Passe (Remove User)
exports.removeUser = async (req, res) => {
  const user = req.session.user;
  console.log(req.params.id);
  res.end();
  // console.log(req.params.id);
  // if (!user || user.role !== "admin") {
  //   req.flash("error", "Access denied");
  //   return res.redirect("/chat");
  // }

  // try {
  //   const userId = req.params.id;
  //   // Implémentez la logique de modification du mot de passe ici
  //   await User.resetPassword(userId); // Supposant que cette méthode existe
  //   req.flash(
  //     "success",
  //     "Mot de passe de l'utilisateur réinitialisé avec succès."
  //   );
  //   res.redirect("/admin");
  // } catch (error) {
  //   console.error(error);
  //   req.flash(
  //     "error",
  //     "Erreur lors de la modification du mot de passe de l'utilisateur."
  //   );
  //   res.redirect("/chat");
  // }
};
