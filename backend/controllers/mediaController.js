// controllers/mediaController.js
const AWS = require("aws-sdk");
const multer = require("multer");
const Message = require("../models/chatModel");
const User = require("../models/userModel");
const { getIO } = require("../socket/socket");
const path = require("path");
require("dotenv").config();

// ✅ AWS S3 config
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// ✅ Multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// ✅ Helper: Upload to S3
async function uploadToS3(buffer, filename, mimetype) {
  const Key = `${Date.now()}_${Math.random()
    .toString(36)
    .slice(2)}${path.extname(filename)}`;

  const params = {
    Bucket: process.env.S3_BUCKET,
    Key,
    Body: buffer,
    ContentType: mimetype,
    ACL: "public-read",
  };

  const data = await s3.upload(params).promise();
  return data.Location;
}

// ✅ Route Handler for Upload
const handleUpload = [
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file)
        return res.status(400).json({ message: "No file uploaded" });

      const { originalname, buffer, mimetype } = req.file;
      let { recipientId, groupId } = req.body;
      const senderId = req.user.id;

      if (!recipientId && !groupId) {
        return res.status(400).json({ message: "Recipient or Group required" });
      }

      // ✅ Upload to S3
      const url = await uploadToS3(buffer, originalname, mimetype);

      // ✅ Store in DB
      const msg = await Message.create({
        userId: senderId,
        recipientId: recipientId || null,
        groupId: groupId || null,
        content: null,
        mediaUrl: url,
        mediaType: mimetype,
        messageType: "media",
      });

      // ✅ Include sender name properly
      const sender = await User.findByPk(senderId, {
        attributes: ["id", "name"],
      });

      const payload = {
        id: msg.id,
        content: null,
        mediaUrl: url,
        mediaType: mimetype,
        messageType: "media",
        createdAt: msg.createdAt,
        sender: sender,
        recipientId: recipientId ? parseInt(recipientId) : null,
        groupId: groupId ? parseInt(groupId) : null,
      };

      const io = getIO();

      // ✅ Emit based on type
      if (groupId) {
        io.to(`group_${groupId}`).emit("receiveMessage", payload);
      } else {
        io.emit("receiveMessage", payload);
      }

      return res.status(201).json({ message: "Uploaded", payload });
    } catch (err) {
      console.error("Upload error:", err);
      return res
        .status(500)
        .json({ message: "Upload failed", error: err.message });
    }
  },
];

module.exports = { handleUpload };
