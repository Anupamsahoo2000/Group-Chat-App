// socket/socket.js
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Message = require("../models/chatModel"); // 1:1 messages
const User = require("../models/userModel");
const { Group, GroupMember, GroupMessage } = require("../models/groupModel");
require("dotenv").config();
let io;
function socket(server) {
  io = new Server(server, {
    cors: {
      origin: ["http://localhost:5500", "http://127.0.0.1:5500"],
      methods: ["GET", "POST"],
    },
  });

  // map userId -> socketId
  const onlineUsers = new Map();

  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

    // Authenticate socket with token (client must emit 'authenticate')
    socket.on("authenticate", (token) => {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = payload.id;
        onlineUsers.set(payload.id, socket.id);

        // Optionally re-join rooms from provided list (client can emit rejoin request)
        io.emit("userOnline", payload.id);
        console.log(`✅ Authenticated: user ${payload.id}`);
      } catch (err) {
        console.log("Invalid token on socket authenticate:", err.message);
        socket.disconnect();
      }
    });

    // Rejoin group rooms supplied by client (optional)
    socket.on("rejoinGroups", async (groupIds = []) => {
      if (!socket.userId) return;
      for (const groupId of groupIds) {
        const member = await GroupMember.findOne({
          where: { groupId, userId: socket.userId },
        });
        if (member) socket.join(`group_${groupId}`);
      }
    });

    // ---------------- 1:1 messages (existing) ----------------
    socket.on("sendMessage", async ({ content, recipientId }) => {
      if (!socket.userId) return;

      try {
        const message = await Message.create({
          content,
          userId: socket.userId,
          recipientId,
        });

        const full = await Message.findByPk(message.id, {
          include: [{ model: User, as: "sender", attributes: ["id", "name"] }],
        });

        // deliver to recipient if online
        const recipientSocket = onlineUsers.get(recipientId);
        if (recipientSocket)
          io.to(recipientSocket).emit("receiveMessage", full);

        // send back to sender
        socket.emit("receiveMessage", full);
      } catch (err) {
        console.error("sendMessage error:", err);
      }
    });

    // ---------------- Group: join room ----------------
    socket.on("joinGroup", async ({ groupId }) => {
      if (!socket.userId)
        return socket.emit("errorEvent", { message: "Auth required" });

      try {
        const member = await GroupMember.findOne({
          where: { groupId, userId: socket.userId },
        });
        if (!member)
          return socket.emit("errorEvent", { message: "Not a group member" });

        const room = `group_${groupId}`;
        socket.join(room);

        // notify room
        socket
          .to(room)
          .emit("groupUserJoined", { groupId, userId: socket.userId });
        // acknowledge to client
        socket.emit("joinedGroup", { groupId });
      } catch (err) {
        console.error("joinGroup error:", err);
      }
    });

    // ---------------- Group: leave room ----------------
    socket.on("leaveGroup", ({ groupId }) => {
      if (!socket.userId) return;
      const room = `group_${groupId}`;
      socket.leave(room);
      socket.to(room).emit("groupUserLeft", { groupId, userId: socket.userId });
      socket.emit("leftGroup", { groupId });
    });

    // ---------------- Group: send message ----------------
    socket.on("sendGroupMessage", async ({ groupId, content }) => {
      if (!socket.userId) return;
      try {
        // validate membership
        const member = await GroupMember.findOne({
          where: { groupId, userId: socket.userId },
        });
        if (!member)
          return socket.emit("errorEvent", { message: "Not a member" });

        // save
        const gm = await GroupMessage.create({
          content,
          groupId,
          userId: socket.userId,
        });

        const full = await GroupMessage.findByPk(gm.id, {
          include: [{ model: User, as: "sender", attributes: ["id", "name"] }],
        });

        const room = `group_${groupId}`;
        io.to(room).emit("receiveGroupMessage", full);
      } catch (err) {
        console.error("sendGroupMessage error:", err);
      }
    });

    // ---------------- Typing indicator (group + P2P) ----------------
    socket.on("typing", ({ recipientId, groupId }) => {
      if (!socket.userId) return;
      if (groupId) {
        const room = `group_${groupId}`;
        socket
          .to(room)
          .emit("userTyping", { senderId: socket.userId, groupId });
      } else if (recipientId) {
        const recipientSocket = onlineUsers.get(recipientId);
        if (recipientSocket)
          io.to(recipientSocket).emit("userTyping", {
            senderId: socket.userId,
          });
      }
    });

    // ---------------- Admin actions broadcast ----------------
    // When server-side endpoints addMember/deleteGroup/exitGroup are invoked,
    // they should also notify affected users — but we can accept socket notifications too.
    socket.on("notifyAddMember", ({ groupId, userId }) => {
      // notify the added user (if online)
      const s = onlineUsers.get(userId);
      if (s) io.to(s).emit("groupMemberAdded", { groupId });
    });

    socket.on("notifyDeleteGroup", ({ groupId }) => {
      // notify all members in room
      const room = `group_${groupId}`;
      io.to(room).emit("groupDeleted", { groupId });
    });

    // ---------------- disconnect ----------------
    socket.on("disconnect", () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        io.emit("userOffline", socket.userId);
      }
      console.log("🔴 Socket disconnected:", socket.id);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}

module.exports = { socket, getIO };
