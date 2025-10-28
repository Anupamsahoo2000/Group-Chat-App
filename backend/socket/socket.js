const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Message = require("../models/chatModel");
const User = require("../models/userModel");
require("dotenv").config();

function socket(server) {
  const io = new Server(server, {
    cors: {
      origin: ["http://localhost:5500", "http://127.0.0.1:5500"],
      methods: ["GET", "POST"],
    },
  });

  // 🧠 Keep track of online users
  const onlineUsers = new Map();

  io.on("connection", (socket) => {
    console.log("🟢 Client connected:", socket.id);

    // 🔐 Authenticate user via token
    socket.on("authenticate", (token) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        onlineUsers.set(decoded.id, socket.id);
        socket.userId = decoded.id;

        // ✅ Notify all clients that user is online
        io.emit("userOnline", decoded.id);
        console.log(`✅ User ${decoded.id} authenticated`);
      } catch (err) {
        console.error("❌ Invalid token:", err.message);
        socket.disconnect();
      }
    });

    // 💬 Handle sending messages
    socket.on("sendMessage", async ({ content, recipientId }) => {
      if (!socket.userId) return;

      const message = await Message.create({
        content,
        userId: socket.userId,
        recipientId,
      });

      const fullMessage = await Message.findByPk(message.id, {
        include: [
          { model: User, as: "sender", attributes: ["id", "name"] },
          { model: User, as: "recipient", attributes: ["id", "name"] },
        ],
      });

      const recipientSocketId = onlineUsers.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("receiveMessage", fullMessage);
      }

      socket.emit("receiveMessage", fullMessage);
    });

    // ✍️ Handle typing indicator
    socket.on("typing", ({ recipientId }) => {
      const recipientSocketId = onlineUsers.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("userTyping", {
          senderId: socket.userId,
        });
      }
    });

    // 🔴 Handle user disconnect
    socket.on("disconnect", () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        io.emit("userOffline", socket.userId);
      }

      console.log("🔴 Client disconnected:", socket.id);
    });
  });

  return io;
}

module.exports = socket;
