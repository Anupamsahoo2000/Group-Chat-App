const Message = require("../models/chatModel");
const User = require("../models/userModel");

const sendMessage = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: "Message required" });

    const message = await Message.create({
      content,
      userId: req.user.id, // from JWT
    });

    res.status(201).json({ message: "Message saved", data: message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const getMessages = async (req, res) => {
  try {
    const messages = await Message.findAll({
      include: { model: User, attributes: ["id", "name"] },
      order: [["createdAt", "ASC"]],
    });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
module.exports = { sendMessage, getMessages };
