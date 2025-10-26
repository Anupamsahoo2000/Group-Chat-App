const express = require("express");
const router = express.Router();
const { sendMessage, getMessages } = require("../controllers/chatController");
const { authenticate } = require("../middleware/auth");

router.post("/send", authenticate, sendMessage);
router.get("/all", authenticate, getMessages);

module.exports = router;
