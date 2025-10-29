const express = require("express");
const router = express.Router();
const {
  createGroup,
  listMyGroups,
  joinGroup,
  getGroupMessages,
  addMember,
  deleteGroup,
  exitGroup,
} = require("../controllers/groupController");
const authenticate = require("../middleware/auth");

// Create Group
router.post("/create", authenticate, createGroup);
// List My Groups
router.get("/mine", authenticate, listMyGroups);
// Join Group
router.post("/:groupId/join", authenticate, joinGroup);
// Get Group Messages
router.get("/:groupId/messages", authenticate, getGroupMessages);
// Add Member to Group (Admin Only)
router.post("/:groupId/add-member", authenticate, addMember);
// Delete Group — Admin Only
router.delete("/:groupId", authenticate, deleteGroup);
// Exit Group
router.delete("/:groupId/exit", authenticate, exitGroup);

module.exports = router;
