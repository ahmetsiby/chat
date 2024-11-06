const express = require("express");
const router = express.Router();
const { authController } = require("../controllers");

router.get("/", authController.showLoginPage);
router.post("/login", authController.login);
router.get("/register", authController.showRegisterPage);
router.post("/register", authController.register);
router.post("/logout", authController.logout);

// Route pour mot de passe oublié
router.get("/remove", authController.showRemovePage);
module.exports = router;

// Routes d'authentification
//app.get("/", authController.showLoginPage);
