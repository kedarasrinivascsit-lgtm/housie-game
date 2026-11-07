
const Room = require("../models/room");

const generateRoomCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// CREATE ROOM
exports.createRoom = async (req, res) => {
  try {
    let roomCode;
    let exists = true;

    while (exists) {
      roomCode = generateRoomCode();
      exists = await Room.exists({ roomCode });
    }

    const room = await Room.create({
      roomCode,
      host: req.user.id,
      players: [{ user: req.user.id, isReady: true }],
    });

    const populatedRoom = await Room.findById(room._id)
      .populate("host", "username")
      .populate("players.user", "username");

    res.status(201).json({
      message: "Room created successfully",
      room: populatedRoom,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// JOIN ROOM
exports.joinRoom = async (req, res) => {
  try {
    const roomCode = req.params.code.toUpperCase();

    const room = await Room.findOne({ roomCode });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (room.status !== "waiting") {
      return res.status(400).json({ message: "Game has already started" });
    }

    const alreadyJoined = room.players.some(
      (player) => player.user.toString() === req.user.id
    );

    if (alreadyJoined) {
      return res.json({ message: "Already joined", room });
    }

    if (room.players.length >= room.maxPlayers) {
      return res.status(400).json({ message: "Room is full" });
    }

    room.players.push({
      user: req.user.id,
      isReady: false,
    });

    await room.save();

    const populatedRoom = await Room.findById(room._id)
      .populate("host", "username")
      .populate("players.user", "username");

    res.json({
      message: "Joined room successfully",
      room: populatedRoom,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET ROOM DETAILS
exports.getRoom = async (req, res) => {
  try {
    const room = await Room.findOne({
      roomCode: req.params.code.toUpperCase(),
    })
      .populate("host", "username")
      .populate("players.user", "username");

    if (!room) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    const safeRoom = {
      _id: room._id,
      roomCode: room.roomCode,
      host: room.host,
      players: room.players.map((player) => ({
        user: player.user,
        isReady: player.isReady,
      })),
      status: room.status,
      maxPlayers: room.maxPlayers,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    };

    res.json({ room: safeRoom });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
// GET CURRENT PLAYER'S TICKET

exports.getMyTicket = async (req, res) => {
    try {
        const roomCode = req.params.code.toUpperCase();

        const room = await Room.findOne({ roomCode })
            .populate("players.user", "username")
            .populate("winningClaims.winner", "username");

        if (!room) {
            return res.status(404).json({
                message: "Room not found"
            });
        }

        const player = room.players.find(
            p => String(p.user?._id || p.user) === String(req.user.id)
        );

        if (!player) {
            return res.status(403).json({
                message: "You are not a member of this room"
            });
        }

        if (room.status !== "playing" && room.status !== "completed") {
            return res.status(400).json({
                message: "Game has not started"
            });
        }

        if (!player.ticket || player.ticket.length === 0) {
            return res.status(404).json({
                message: "Ticket not found"
            });
        }

        res.json({
            room: {
                roomCode: room.roomCode,
                status: room.status,
                isHost: String(room.host) === String(req.user.id),
                players: room.players.map(p => ({
                    user: p.user,
                    isReady: p.isReady
                })),
                calledNumbers: room.calledNumbers || [],
                currentNumber: room.currentNumber ?? null,
                gameStartedAt: room.gameStartedAt ?? null,
                winningClaims: room.winningClaims || []
            },
            ticket: player.ticket,
            markedNumbers: player.markedNumbers || []
        });

    } catch (error) {
        console.error("Get ticket error:", error);

        res.status(500).json({
            message: error.message
        });
    }
};
