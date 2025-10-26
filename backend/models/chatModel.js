const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const User = require("./userModel");

const Message = sequelize.define("Message", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  recipientId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

// ✅ Associations
// Message sent by a user
Message.belongsTo(User, { foreignKey: "userId", as: "sender" });
User.hasMany(Message, { foreignKey: "userId", as: "sentMessages" });

// Message received by a user
Message.belongsTo(User, { foreignKey: "recipientId", as: "recipient" });
User.hasMany(Message, { foreignKey: "recipientId", as: "receivedMessages" });

module.exports = Message;
