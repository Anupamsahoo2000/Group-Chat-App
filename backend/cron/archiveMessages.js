// cron/archiveMessages.js
const cron = require("node-cron");
const { Op } = require("sequelize");
const Message = require("../models/chatModel");
const ArchivedChat = require("../models/archivedChatModel");

cron.schedule("0 2 * * *", async () => {
  // Runs daily at 2 AM
  console.log("📦 Archiving old messages...");

  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  try {
    // ✅ Fetch old messages
    const oldMessages = await Message.findAll({
      where: { createdAt: { [Op.lt]: oneDayAgo } },
    });

    if (oldMessages.length === 0) return;

    // ✅ Insert into archive table
    await ArchivedChat.bulkCreate(oldMessages.map((msg) => msg.toJSON()));

    // ✅ Delete from main table
    await Message.destroy({
      where: { createdAt: { [Op.lt]: oneDayAgo } },
    });

    console.log(`✅ Archived ${oldMessages.length} messages`);
  } catch (err) {
    console.error("❌ Archiving error:", err);
  }
});
