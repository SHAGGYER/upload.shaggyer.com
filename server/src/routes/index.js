const express = require("express");
const path = require("path");
const auth = require("./auth");
const router = express.Router()

router.use("/api/auth", auth);
router.use("/", express.static(path.join(__dirname, "../../../client/dist")));

module.exports = router;
