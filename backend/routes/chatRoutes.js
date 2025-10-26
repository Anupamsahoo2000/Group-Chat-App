const express = require("express");
const router = express.Router();
const {
  sendMessage,
  getMessagesWithUser,
  getMessages,
} = require("../controllers/chatController");
const authenticate = require("../middleware/auth");

router.post("/send", authenticate, sendMessage);
router.get("/with/:contactId", authenticate, getMessagesWithUser);
router.get("/all", authenticate, getMessages);

module.exports = router;
