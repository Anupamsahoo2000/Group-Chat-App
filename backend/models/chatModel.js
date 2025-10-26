// models/messageModel.js
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
});

// Relation: Message belongs to User
Message.belongsTo(User, { foreignKey: "userId", onDelete: "CASCADE" });
User.hasMany(Message, { foreignKey: "userId" });

module.exports = Message;
