const User = require("../models/userModel");
const Session = require("../models/sessionModel");

// Afficher la page admin avec les utilisateurs en attente
exports.showAdminPage = async (req, res) => {
  const user = Session.getSessionUser(req);
  if (!user || user.role !== "admin") {
    return res.status(403).send("Access denied");
  }

  try {
    const pendingUsers = await User.getPendingUsers();
    res.render("admin", { users: pendingUsers });
  } catch (error) {
    console.error(error);
    res.send("Erreur lors du chargement des utilisateurs.");
  }
};

// Approuver un utilisateur
exports.approveUser = async (req, res) => {
  const user = Session.getSessionUser(req);
  if (!user || user.role !== "admin") {
    return res.status(403).send("Access denied");
  }

  try {
    const userId = req.params.id;
    await User.approveUser(userId);
    res.redirect("/admin");
  } catch (error) {
    console.error(error);
    res.send("Erreur lors de l'approbation de l'utilisateur.");
  }
};
