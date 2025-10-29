// models/archivedChatModel.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ArchivedChat = sequelize.define("ArchivedChat", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
  },
  userId: DataTypes.INTEGER,
  recipientId: DataTypes.INTEGER,
  groupId: DataTypes.INTEGER,
  content: DataTypes.TEXT,
  mediaUrl: DataTypes.STRING,
  mediaType: DataTypes.STRING,
  messageType: DataTypes.ENUM("text", "media"),
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
});

module.exports = ArchivedChat;
