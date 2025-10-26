const Message = require("../models/chatModel");
const User = require("../models/userModel");
const { Op } = require("sequelize");

// Send a message
const sendMessage = async (req, res) => {
  try {
    const { content, recipientId } = req.body;
    if (!content || !recipientId)
      return res
        .status(400)
        .json({ message: "Message and recipient required" });

    const message = await Message.create({
      content,
      userId: req.user.id,
      recipientId,
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

// Get all messages between logged-in user and a contact
const getMessagesWithUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = parseInt(req.params.contactId);

    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { userId, recipientId: contactId },
          { userId: contactId, recipientId: userId },
        ],
      },
      include: [
        { model: User, as: "sender", attributes: ["id", "name"] },
        { model: User, as: "recipient", attributes: ["id", "name"] },
      ],
      order: [["createdAt", "ASC"]],
    });

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { sendMessage, getMessagesWithUser, getMessages };
