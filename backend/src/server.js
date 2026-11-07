
const express = require("express");
const http = require("http");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { Server } = require("socket.io");
const dns = require("dns");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

require("dotenv").config();
const { generateUniqueTickets } = require("./utils/ticketgenerator");
const jwt = require("jsonwebtoken");
const Room = require("./models/room");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authroutes");
const roomRoutes = require("./routes/roomroutes");
const User = require("./models/user");

const app = express();
const server = http.createServer(app);

// EXPRESS MIDDLEWARE
app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// API ROUTES
app.get("/", (req, res) => {
    res.send("Housie Game Backend is Running!");
});

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);

// SOCKET.IO
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL,
        methods: ["GET", "POST"],
        credentials: true
    }
});

// SOCKET AUTHENTICATION
io.use((socket, next) => {
    try {
        const cookieHeader = socket.handshake.headers.cookie || "";

        const tokenCookie = cookieHeader
            .split(";")
            .find((cookie) =>
                cookie.trim().startsWith("housie_token=")
            );

        if (!tokenCookie) {
            return next(new Error("Authentication required"));
        }

        const token = decodeURIComponent(
            tokenCookie.trim().substring("housie_token=".length)
        );

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        socket.userId = String(decoded.id);

        next();

    } catch (error) {
        console.error("Socket authentication error:", error.message);
        next(new Error("Socket authentication failed"));
    }
});

// SOCKET CONNECTION
io.on("connection", (socket) => {

    console.log("Player connected:", socket.userId);

    // JOIN ROOM
    socket.on("join-room", async ({ roomCode }) => {
        try {
            const code = roomCode?.trim().toUpperCase();

            const room = await Room.findOne({
                roomCode: code
            })
                .populate("host", "username")
                .populate("players.user", "username");

            if (!room) {
                return socket.emit("room-error", "Room not found");
            }

            const isMember = room.players.some(
                (player) =>
                    String(player.user?._id) === socket.userId
            );

            if (!isMember) {
                return socket.emit(
                    "room-error",
                    "You are not a member of this room"
                );
            }

            socket.join(code);

            console.log(
                `${socket.userId} joined room ${code}`
            );

            const safeRoom = {
    roomCode: room.roomCode,
    host: room.host,
    status: room.status,
    maxPlayers: room.maxPlayers,
    players: room.players.map((player) => ({
        user: player.user,
        isReady: player.isReady
    }))
};

io.to(code).emit("room-updated", safeRoom);

        } catch (error) {
            console.error("Join room error:", error);
            socket.emit("room-error", "Unable to join lobby");
        }
    });

    // READY / NOT READY
    socket.on("set-ready", async ({ roomCode, isReady }) => {
        try {
            const code = roomCode?.trim().toUpperCase();

            console.log(
                "Ready request:",
                socket.userId,
                code,
                isReady
            );

            if (!socket.rooms.has(code)) {
                return socket.emit(
                    "room-error",
                    "Join the room before changing your ready status"
                );
            }

            const room = await Room.findOne({
                roomCode: code
            });

            if (!room) {
                return socket.emit("room-error", "Room not found");
            }

            if (room.status !== "waiting") {
                return socket.emit(
                    "room-error",
                    "The game has already started"
                );
            }

            const player = room.players.find(
                (item) => String(item.user) === socket.userId
            );

            if (!player) {
                return socket.emit(
                    "room-error",
                    "Your account is not registered in this room"
                );
            }

            player.isReady = Boolean(isReady);

            await room.save();

            const updatedRoom = await Room.findById(room._id)
                .populate("host", "username")
                .populate("players.user", "username");

            console.log(
                "Room updated. Players:",
                updatedRoom.players.length
            );

            io.to(code).emit("room-updated", updatedRoom);

        } catch (error) {
            console.error("Ready status error:", error);
            socket.emit(
                "room-error",
                "Unable to update ready status"
            );
        }
    });

    // HOST STARTS GAME
    
    // HOST STARTS GAME AND GENERATES TICKETS
    socket.on("start-game", async ({ roomCode }) => {
        try {
            const code = roomCode?.trim().toUpperCase();

            if (!socket.rooms.has(code)) {
                return socket.emit(
                    "room-error",
                    "You are not in this room"
                );
            }

            const room = await Room.findOne({
                roomCode: code
            });

            if (!room) {
                return socket.emit("room-error", "Room not found");
            }

            if (String(room.host) !== socket.userId) {
                return socket.emit(
                    "room-error",
                    "Only the host can start the game"
                );
            }

            if (room.status !== "waiting") {
                return socket.emit(
                    "room-error",
                    "Game has already started"
                );
            }

            if (room.players.length < 2) {
                return socket.emit(
                    "room-error",
                    "At least two players are required"
                );
            }

            const allReady = room.players.every(
                (player) => player.isReady
            );

            if (!allReady) {
                return socket.emit(
                    "room-error",
                    "All players must be ready"
                );
            }

            // Generate a unique ticket for every player
            const tickets = generateUniqueTickets(
                room.players.length
            );

            // Assign tickets to players
            room.players.forEach((player, index) => {
                player.ticket = tickets[index];
            });

            // Update game status
            room.status = "playing";
room.calledNumbers = [];
room.currentNumber = null;
room.gameStartedAt = new Date();
room.winningClaims = [];
await room.save();

            console.log(
                `Game started: ${code} | ${tickets.length} tickets generated`
            );

            // Notify all players
            io.to(code).emit("game-started", {
                roomCode: code
            });

        } catch (error) {
            console.error("Start game error:", error);

            socket.emit(
                "room-error",
                "Unable to start game"
            );
        }
    });

// HOST CALLS NEXT NUMBER
socket.on("call-next-number", async ({ roomCode }) => {
    try {
        const code = roomCode?.trim().toUpperCase();

        if (!code || !socket.rooms.has(code)) {
            return socket.emit("room-error", "You are not in this room");
        }

        const room = await Room.findOne({ roomCode: code });

        if (!room) {
            return socket.emit("room-error", "Room not found");
        }

        if (String(room.host) !== socket.userId) {
            return socket.emit("room-error", "Only the host can call numbers");
        }

        if (room.status !== "playing") {
            return socket.emit("room-error", "Game is not running");
        }

        // Find numbers that have not been called
        const remainingNumbers = Array.from(
            { length: 90 },
            (_, index) => index + 1
        ).filter(number => !room.calledNumbers.includes(number));

        if (remainingNumbers.length === 0) {
            room.status = "completed";
            await room.save();

            io.to(code).emit("game-completed");

            return;
        }

        // Select a random remaining number
        const randomIndex = Math.floor(
            Math.random() * remainingNumbers.length
        );

        const nextNumber = remainingNumbers[randomIndex];

        room.calledNumbers.push(nextNumber);
room.currentNumber = nextNumber;

const gameCompleted = room.calledNumbers.length === 90;

if (gameCompleted) {
    room.status = "completed";
}

await room.save();

io.to(code).emit("number-called", {
    roomCode: code,
    number: nextNumber,
    calledNumbers: room.calledNumbers
});

if (gameCompleted) {
    io.to(code).emit("game-completed");
}

        console.log(`Number called in ${code}: ${nextNumber}`);

    } catch (error) {
        console.error("Call number error:", error);

        socket.emit("room-error", "Unable to call next number");
    }
});

// PLAYER MARKS OR UNMARKS A NUMBER
socket.on("toggle-mark-number", async ({ roomCode, number }) => {
    try {
        const code = roomCode?.trim().toUpperCase();
        const selectedNumber = Number(number);

        if (!code || !socket.rooms.has(code)) {
            return socket.emit("room-error", "You are not in this room");
        }

        const room = await Room.findOne({ roomCode: code });

        if (!room) {
            return socket.emit("room-error", "Room not found");
        }

        if (room.status !== "playing") {
            return socket.emit("room-error", "Game is not running");
        }

        const player = room.players.find(
            (p) => p.user.toString() === socket.userId
        );

        if (!player) {
            return socket.emit("room-error", "Player not found");
        }

        const ticketNumbers = player.ticket.flat();

        if (!ticketNumbers.includes(selectedNumber)) {
            return socket.emit("room-error", "Number is not on your ticket");
        }

        if (!room.calledNumbers.includes(selectedNumber)) {
            return socket.emit("room-error", "This number has not been called yet");
        }

        const alreadyMarked = player.markedNumbers.includes(selectedNumber);

        if (alreadyMarked) {
            player.markedNumbers = player.markedNumbers.filter(
                (n) => n !== selectedNumber
            );
        } else {
            player.markedNumbers.push(selectedNumber);
        }

        await room.save();

        // Send updated marks only to this player's socket
        socket.emit("number-marked", {
            markedNumbers: player.markedNumbers
        });

    } catch (error) {
        console.error("Mark number error:", error);

        socket.emit("room-error", "Unable to mark number");
    }
});
    
    // CLAIM WINNING CATEGORY
    socket.on("claim-win", async ({ roomCode, category }) => {
        try {
            const validCategories = [
                "Early Five",
                "Top Line",
                "Middle Line",
                "Bottom Line",
                "Full House"
            ];

            if (!validCategories.includes(category)) {
                return socket.emit(
                    "claim-error",
                    "Invalid winning category"
                );
            }

            const room = await Room.findOne({
                roomCode: roomCode.toUpperCase()
            });

            if (!room) {
                return socket.emit("claim-error", "Room not found");
            }

            if (room.status !== "playing") {
                return socket.emit(
                    "claim-error",
                    "Game is not in progress"
                );
            }

            const player = room.players.find(
                p => String(p.user) === String(socket.userId)
            );

            if (!player) {
                return socket.emit(
                    "claim-error",
                    "You are not a player in this room"
                );
            }

            const alreadyClaimed = room.winningClaims.some(
                claim => claim.category === category
            );

            if (alreadyClaimed) {
                return socket.emit(
                    "claim-error",
                    "This category has already been claimed"
                );
            }

            const ticketNumbers = player.ticket
                .flat()
                .filter(number => typeof number === "number");

            const validMarkedNumbers = ticketNumbers.filter(
                number =>
                    player.markedNumbers.includes(number) &&
                    room.calledNumbers.includes(number)
            );

            let isValidClaim = false;

            if (category === "Early Five") {
                isValidClaim = validMarkedNumbers.length >= 5;
            }

            if (
                category === "Top Line" ||
                category === "Middle Line" ||
                category === "Bottom Line"
            ) {
                const rowIndex = {
                    "Top Line": 0,
                    "Middle Line": 1,
                    "Bottom Line": 2
                }[category];

                const rowNumbers = player.ticket[rowIndex].filter(
                    number => typeof number === "number"
                );

                isValidClaim =
                    rowNumbers.length === 5 &&
                    rowNumbers.every(number =>
                        validMarkedNumbers.includes(number)
                    );
            }

            if (category === "Full House") {
                isValidClaim =
                    ticketNumbers.length === 15 &&
                    ticketNumbers.every(number =>
                        validMarkedNumbers.includes(number)
                    );
            }

            if (!isValidClaim) {
                return socket.emit(
                    "claim-error",
                    "Winning condition not satisfied"
                );
            }

            const winner = await User.findById(player.user).select("username");

            if (!winner) {
                return socket.emit(
                    "claim-error",
                    "Winning player's profile could not be found"
                );
            }

            const claim = {
                category,
                winner: player.user,
                winnerName: winner.username,
                claimedAt: new Date()
            };

            room.winningClaims.push(claim);

            if (category === "Full House") {
                room.status = "completed";
            }

            await room.save();
            await room.populate("winningClaims.winner", "username");

            io.to(roomCode.toUpperCase()).emit("win-claimed", {
                roomCode: room.roomCode,
                category,
                winnerId: String(winner._id),
                winnerName: winner.username,
                claimedAt: claim.claimedAt,
                winningClaims: room.winningClaims.map(winningClaim => ({
                    category: winningClaim.category,
                    winner: winningClaim.winner,
                    winnerName:
                        winningClaim.winnerName ||
                        winningClaim.winner?.username ||
                        null,
                    claimedAt: winningClaim.claimedAt
                }))
            });

            if (category === "Full House") {
                io.to(roomCode.toUpperCase()).emit("game-completed");
            }

        } catch (error) {
            console.error("Claim error:", error);

            socket.emit(
                "claim-error",
                "Unable to verify winning claim"
            );
        }
    });

    // DISCONNECT
    socket.on("disconnect", () => {
        console.log("Player disconnected:", socket.userId);
    });

});

// START SERVER
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();

        server.listen(PORT, () => {
            console.log(`Housie Backend running on port ${PORT}`);
        });

    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
};

startServer();
