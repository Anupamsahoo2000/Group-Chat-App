const express = require("express");
const router = express.Router();
const {
  createGroup,
  listMyGroups,
  joinGroup,
  getGroupMessages,
} = require("../controllers/groupController");
const authenticate = require("../middleware/auth");

router.post("/", authenticate, createGroup);
router.get("/mine", authenticate, listMyGroups);
router.post("/:groupId/join", authenticate, joinGroup);
router.get("/:groupId/messages", authenticate, getGroupMessages);

module.exports = router;
