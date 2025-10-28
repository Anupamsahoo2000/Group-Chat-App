const express = require("express");
const db = require("./config/db");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const path = require("path");

app.use(express.static(path.join(__dirname, "../frontend")));

require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/user", userRoutes);
app.use("/chat", chatRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
