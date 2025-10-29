const express = require("express");
const router = express.Router();
const {
  sendMessage,
  getMessagesWithUser,
  getMessages,
  getGroupMembers,
} = require("../controllers/chatController");
const authenticate = require("../middleware/auth");

router.post("/send", authenticate, sendMessage);
router.get("/with/:contactId", authenticate, getMessagesWithUser);
router.get("/all", authenticate, getMessages);
router.get("/group/:groupId/members", authenticate, getGroupMembers);

module.exports = router;
