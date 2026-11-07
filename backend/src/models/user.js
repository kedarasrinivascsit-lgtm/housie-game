
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            trim: true,
            minlength: 3,
            maxlength: 25
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: true,
            select: false
        },

        avatar: {
            type: String,
            default: ""
        },

        role: {
            type: String,
            enum: ["player", "admin"],
            default: "player"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("User", userSchema);
