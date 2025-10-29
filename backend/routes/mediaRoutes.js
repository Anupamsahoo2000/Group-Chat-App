// routes/mediaRoutes.js
const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth"); // should set req.user
const { handleUpload } = require("../controllers/mediaController");

router.post("/upload", authenticate, handleUpload);

module.exports = router;
