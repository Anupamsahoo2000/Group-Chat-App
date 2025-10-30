const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const db = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const groupRoutes = require("./routes/groupRoutes");
const mediaRoutes = require("./routes/mediaRoutes");
const aiRoutes = require("./routes/aiRoutes");
const { socket } = require("./socket/socket");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

app.use("/user", userRoutes);
app.use("/chat", chatRoutes);
app.use("/group", groupRoutes);
app.use("/media", mediaRoutes);
app.use("/ai", aiRoutes);

require("./cron/archiveMessages"); // start the archiving cron job

const server = http.createServer(app);
socket(server); // ✅ initialize socket.io

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
