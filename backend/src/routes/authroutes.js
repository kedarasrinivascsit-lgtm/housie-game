
const express = require("express");

const router = express.Router();

const {
    register,
    login,
    logout,
    getProfile
} = require("../controllers/authcontroller");

const protect = require("../middleware/authmiddleware");

router.post("/register", register);

router.post("/login", login);

router.post("/logout", logout);

router.get("/profile", protect, getProfile);

module.exports = router;
