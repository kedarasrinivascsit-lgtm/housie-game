
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function CreateRoom() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const navigate = useNavigate();

    const handleCreateRoom = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await api.post("/rooms");

            const roomCode = response.data.room.roomCode;

            navigate(`/lobby/${roomCode}`);
        } catch (err) {
    console.error("CREATE ROOM ERROR:", err);
    console.error("SERVER RESPONSE:", err.response?.data);

    setError(
        err.response?.data?.message ||
        err.message ||
        "Unable to create room."
    );
}
    };

    return (
        <div className="join-page">
            <div className="join-card">
                <h1>Create Housie Room</h1>

                <p>
                    Create a private room and invite your friends
                    using the room code.
                </p>

                <button
                    className="join-create-btn"
                    onClick={handleCreateRoom}
                    disabled={loading}
                >
                    {loading ? "Creating Room..." : "Create Room"}
                </button>

                {error && (
                    <p className="join-error">{error}</p>
                )}

                <button
                    className="btn-secondary"
                    style={{ marginTop: "20px", cursor: "pointer" }}
                    onClick={() => navigate("/join")}
                >
                    Back
                </button>
            </div>
        </div>
    );
}
