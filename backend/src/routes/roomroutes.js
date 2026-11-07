
const express = require("express");
const router = express.Router();

const {
    createRoom,
    joinRoom,
    getRoom,
    getMyTicket
} = require("../controllers/roomcontroller");

const protect = require("../middleware/authmiddleware");

// TEST ROUTE
router.get("/test", (req, res) => {
    res.json({
        success: true,
        message: "Room API is working!"
    });
});

// CREATE ROOM
router.post("/", protect, createRoom);

// JOIN ROOM
router.post("/:code/join", protect, joinRoom);

// GET ROOM DETAILS
router.get("/:code", protect, getRoom);
router.get("/:code/my-ticket", protect, getMyTicket);

module.exports = router;
