const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const User = require("./userModel");

const Group = sequelize.define("Group", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
});

// Group members mapping
const GroupMember = sequelize.define("GroupMember", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  role: { type: DataTypes.ENUM("member", "admin"), defaultValue: "member" },
});

// Group messages
const GroupMessage = sequelize.define("GroupMessage", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  content: { type: DataTypes.TEXT, allowNull: false },
});

// Associations
Group.belongsToMany(User, {
  through: GroupMember,
  foreignKey: "groupId",
  as: "members",
});
User.belongsToMany(Group, {
  through: GroupMember,
  foreignKey: "userId",
  as: "groups",
});

GroupMessage.belongsTo(Group, { foreignKey: "groupId" });
Group.hasMany(GroupMessage, { foreignKey: "groupId" });

GroupMessage.belongsTo(User, { foreignKey: "userId", as: "sender" });
User.hasMany(GroupMessage, { foreignKey: "userId" });

GroupMember.belongsTo(User, { foreignKey: "userId" });
User.hasMany(GroupMember, { foreignKey: "userId" });

GroupMember.belongsTo(Group, { foreignKey: "groupId" });
Group.hasMany(GroupMember, { foreignKey: "groupId" });

module.exports = { Group, GroupMember, GroupMessage };
