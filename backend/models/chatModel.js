const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const User = require("./userModel");
const { Group } = require("./groupModel");

const Message = sequelize.define("Message", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  content: {
    type: DataTypes.TEXT,
    allowNull: true, // ✅ Allow null for media messages
  },

  recipientId: {
    type: DataTypes.INTEGER,
    allowNull: true, // ✅  group messages don’t have a recipient
  },

  groupId: {
    type: DataTypes.INTEGER,
    allowNull: true, // ✅ Added for group chat support
  },

  mediaUrl: {
    type: DataTypes.STRING,
    allowNull: true, // ✅ For AWS S3 URL
  },

  mediaType: {
    type: DataTypes.STRING,
    allowNull: true, // ✅ e.g. 'image/png' or 'video/mp4'
  },

  messageType: {
    type: DataTypes.ENUM("text", "media"),
    defaultValue: "text",
  },
});

// ✅ Associations

// Message sender
Message.belongsTo(User, { foreignKey: "userId", as: "sender" });
User.hasMany(Message, { foreignKey: "userId", as: "sentMessages" });

// Message recipient (for private chat)
Message.belongsTo(User, { foreignKey: "recipientId", as: "recipient" });
User.hasMany(Message, { foreignKey: "recipientId", as: "receivedMessages" });

// ✅ Group association (for group messages)
Message.belongsTo(Group, { foreignKey: "groupId", as: "group" });
Group.hasMany(Message, { foreignKey: "groupId", as: "messages" });

module.exports = Message;
