const { Group, GroupMember, GroupMessage } = require("../models/groupModel");
const User = require("../models/userModel");

// ✅ Helper: Check if user is Admin of group
async function isAdmin(userId, groupId) {
  const member = await GroupMember.findOne({
    where: { userId, groupId },
  });
  return member && member.role === "admin";
}

// ✅ Create Group
const createGroup = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: "Group name required" });

    const group = await Group.create({ name, description });

    // Creator becomes Admin
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

// ✅ List Groups User Belongs To
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

// ✅ Join Group (without invite for now)
const joinGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const exists = await GroupMember.findOne({
      where: { groupId, userId: req.user.id },
    });

    if (exists) return res.status(400).json({ message: "Already in group" });

    await GroupMember.create({ groupId, userId: req.user.id });

    res.json({ message: "Joined group" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Add Member to Group (Admin Only)
const addMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    if (!(await isAdmin(req.user.id, groupId))) {
      return res.status(403).json({ message: "Only admin can add members" });
    }

    const exists = await GroupMember.findOne({ where: { userId, groupId } });
    if (exists)
      return res.status(400).json({ message: "User already a member" });

    await GroupMember.create({ userId, groupId, role: "member" });

    res.json({ message: "User added to group" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Exit Group (Remove Self)
const exitGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    // if admin leaving? enforce rules later
    await GroupMember.destroy({
      where: { groupId, userId: req.user.id },
    });

    res.json({ message: "Exited group" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Delete Group — Admin Only
const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!(await isAdmin(req.user.id, groupId))) {
      return res.status(403).json({ message: "Only admin can delete group" });
    }

    await GroupMessage.destroy({ where: { groupId } });
    await GroupMember.destroy({ where: { groupId } });
    await Group.destroy({ where: { id: groupId } });

    res.json({ message: "Group deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get Group Messages
const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;

    const member = await GroupMember.findOne({
      where: { userId: req.user.id, groupId },
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

module.exports = {
  createGroup,
  listMyGroups,
  joinGroup,
  addMember,
  exitGroup,
  deleteGroup,
  getGroupMessages,
};
