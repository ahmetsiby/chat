const express = require("express");
const router = express.Router();
const { adminController } = require("../controllers");

router.get("/", adminController.showAdminPage);
router.post("/approve/:id", adminController.approveUser);
router.post("/delete/:id", adminController.deleteUser);
router.post("/remove/:id", adminController.removeUser);

module.exports = router;

// Routes admin
//app.get("/admin", adminController.showAdminPage);
