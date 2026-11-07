
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function Join() {
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  // CREATE ROOM
  const handleCreateRoom = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.post("/rooms");

      const code = response.data.room.roomCode;

      navigate(`/lobby/${code}`);
    } catch (error) {
      setError(
        error.response?.data?.message || "Unable to create room"
      );
    } finally {
      setLoading(false);
    }
  };

  // JOIN ROOM
const handleJoinRoom = async (e) => {
    e.preventDefault();

    try {
        setLoading(true);
        setError("");

        const response = await api.post(
            `/rooms/${roomCode.trim().toUpperCase()}/join`
        );

        navigate(`/lobby/${response.data.room.roomCode}`);

    } catch (error) {
        setError(
            error.response?.data?.message ||
            "Unable to join room"
        );
    } finally {
        setLoading(false);
    }
};

  return (
    <div className="join-page">
      <div className="join-card">
        <h1>Play Housie</h1>
        <p>Create a new room or join your friends.</p>

        <button
          className="join-create-btn"
          onClick={() => navigate("/create-room")}
          disabled={loading}
        >
          {loading ? "Please wait..." : "Create New Room"}
        </button>

        <div className="join-divider">OR</div>

        <form onSubmit={handleJoinRoom}>
          <input
            type="text"
            placeholder="Enter Room Code"
            value={roomCode}
            onChange={(e) =>
              setRoomCode(e.target.value.toUpperCase())
            }
            maxLength={6}
          />

          <button
            className="join-submit-btn"
            type="submit"
            disabled={loading}
          >
            {loading ? "Joining..." : "Join Room"}
          </button>
        </form>

        {error && <p className="join-error">{error}</p>}
      </div>
    </div>
  );
}

export default Join;
