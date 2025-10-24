const express = require("express");
const db = require("./config/db");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");

require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/user", userRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
