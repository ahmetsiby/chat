const express = require("express");
const router = express.Router();
const { chatController } = require("../controllers");

router.get("/", chatController.showChatPage);

module.exports = router;
// Route du chat
//app.get("/chat", chatController.showChatPage);
