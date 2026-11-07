
const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
    {
        roomCode: {
            type: String,
            required: true,
            unique: true,
            uppercase: true
        },

        host: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        players: [
            {
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                    required: true
                },

                isReady: {
                    type: Boolean,
                    default: false
                },

                ticket: {
                    type: [[mongoose.Schema.Types.Mixed]],
                    default: []
                },

                markedNumbers: {
                    type: [Number],
                    default: []
                }
            }
        ],

        status: {
            type: String,
            enum: ["waiting", "playing", "completed"],
            default: "waiting"
        },

        // GAME STATE
        calledNumbers: {
            type: [Number],
            default: []
        },

        currentNumber: {
            type: Number,
            default: null
        },

        gameStartedAt: {
            type: Date,
            default: null
        },

        // WINNING CLAIMS
        winningClaims: {
            type: [
                {
                    category: {
                        type: String,
                        enum: [
                            "Early Five",
                            "Top Line",
                            "Middle Line",
                            "Bottom Line",
                            "Full House"
                        ],
                        required: true
                    },

                    winner: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: "User",
                        required: true
                    },

                    winnerName: {
                        type: String,
                        trim: true
                    },

                    claimedAt: {
                        type: Date,
                        default: Date.now
                    }
                }
            ],
            default: []
        },

        maxPlayers: {
            type: Number,
            default: 20
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Room", roomSchema);
