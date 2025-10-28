const { Group, GroupMember, GroupMessage } = require("../models/groupModel");
const User = require("../models/userModel");

// Create a group
const createGroup = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: "Group name required" });

    const group = await Group.create({ name, description });
    // add creator as admin
    await GroupMember.create({
      groupId: group.id,
      userId: req.user.id,
      role: "admin",
    });

    res.status(201).json({ message: "Group created", group });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// List groups that user is member of
const listMyGroups = async (req, res) => {
  try {
    const groups = await Group.findAll({
      include: [
        {
          model: User,
          as: "members",
          where: { id: req.user.id },
          attributes: ["id"],
          through: { attributes: [] },
        },
      ],
    });
    res.json(groups);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Join (or invite) - simple join for now
const joinGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const existing = await GroupMember.findOne({
      where: { groupId, userId: req.user.id },
    });
    if (existing) return res.status(400).json({ message: "Already a member" });
    await GroupMember.create({ groupId, userId: req.user.id, role: "member" });
    res.json({ message: "Joined group" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get group messages
const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    // ensure user is a member
    const member = await GroupMember.findOne({
      where: { groupId, userId: req.user.id },
    });
    if (!member) return res.status(403).json({ message: "Not a member" });

    const messages = await GroupMessage.findAll({
      where: { groupId },
      include: [{ model: User, as: "sender", attributes: ["id", "name"] }],
      order: [["createdAt", "ASC"]],
    });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { createGroup, listMyGroups, joinGroup, getGroupMessages };
