
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/authcontext";
import api from "../services/api";
import socket from "../services/socket";
import BackgroundMusic from "../components/backgroundmusic";

export default function Lobby() {
    const { code } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [room, setRoom] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [socketConnected, setSocketConnected] = useState(false);

    const getId = (value) => {
        if (!value) return null;
        return typeof value === "string"
            ? value
            : value._id || value.id;
    };

    useEffect(() => {
        let mounted = true;

        const loadRoom = async () => {
            try {
                const response = await api.get(`/rooms/${code}`);

                if (mounted) {
                    setRoom(response.data.room);
                }
            } catch (err) {
                if (mounted) {
                    setError(
                        err.response?.data?.message ||
                        "Unable to load room."
                    );
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };

        const handleConnect = () => {
            setSocketConnected(true);
            socket.emit("join-room", { roomCode: code });
        };

        const handleDisconnect = () => {
            setSocketConnected(false);
        };

        const handleRoomUpdate = (updatedRoom) => {
            if (mounted) {
                setRoom(updatedRoom);
                setError("");
            }
        };

        const handleRoomError = (message) => {
            if (mounted) {
                setError(
                    typeof message === "string"
                        ? message
                        : message?.message || "Room connection failed."
                );
            }
        };

        const handleGameStarted = (data) => {
            navigate(`/game/${data.roomCode || code}`);
        };

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);
        socket.on("room-updated", handleRoomUpdate);
        socket.on("room-error", handleRoomError);
        socket.on("game-started", handleGameStarted);

        loadRoom();

        socket.connect();

        if (socket.connected) {
            handleConnect();
        }

        return () => {
            mounted = false;

            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
            socket.off("room-updated", handleRoomUpdate);
            socket.off("room-error", handleRoomError);
            socket.off("game-started", handleGameStarted);

            socket.disconnect();
        };
    }, [code, navigate]);

    const isHost =
        getId(room?.host) === getId(user);

    const currentPlayer = room?.players?.find(
        (player) => getId(player.user) === getId(user)
    );

    const isReady = currentPlayer?.isReady || false;

    const allPlayersReady =
        room?.players?.length >= 2 &&
        room.players.every((player) => player.isReady);

    const handleReady = () => {
        socket.emit("set-ready", {
            roomCode: code,
            isReady: !isReady
        });
    };

    const handleStartGame = () => {
        setError("");
        socket.emit("start-game", {
            roomCode: code
        });
    };

    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(code);
            alert("Room code copied!");
        } catch {
            setError("Unable to copy room code.");
        }
    };

    if (loading) {
        return <div className="lobby-page">Loading room...</div>;
    }

    if (!room) {
        return (
            <div className="lobby-page">
                <h2>Room not found</h2>
                <p>{error}</p>
                <button onClick={() => navigate("/dashboard")}>
                    Back to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="lobby-page">
            <div className="lobby-card">

                <h1>Game Lobby</h1>

                <p className="lobby-subtitle">
                    Waiting for players to get ready.
                </p>

                <BackgroundMusic scene="lobby" />

                <div className="room-code-box">
                    <span>ROOM CODE</span>
                    <h2>{room.roomCode}</h2>

                    <button onClick={handleCopyCode}>
                        Copy Code
                    </button>
                </div>

                <div className="lobby-status">
                    <span>
                        {socketConnected
                            ? "Connected"
                            : "Connecting..."}
                    </span>

                    <span>
                        {room.players.length} / {room.maxPlayers} Players
                    </span>
                </div>

                <h3>Players</h3>

                <div className="player-list">
                    {room.players.map((player) => {
                        const playerId = getId(player.user);
                        const playerIsHost =
                            playerId === getId(room.host);

                        return (
                            <div
                                className="player-item"
                                key={playerId}
                            >
                                <div>
                                    <strong>
                                        {player.user?.username || "Player"}
                                    </strong>

                                    {playerIsHost && (
                                        <span className="host-badge">
                                            HOST
                                        </span>
                                    )}

                                    {playerId === getId(user) && (
                                        <span className="you-badge">
                                            YOU
                                        </span>
                                    )}
                                </div>

                                <span
                                    className={
                                        player.isReady
                                            ? "ready-badge"
                                            : "not-ready-badge"
                                    }
                                >
                                    {player.isReady
                                        ? "READY"
                                        : "NOT READY"}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {!isHost && (
                    <button
                        className="ready-button"
                        onClick={handleReady}
                        disabled={!socketConnected}
                    >
                        {isReady ? "Not Ready" : "I'm Ready"}
                    </button>
                )}

                {isHost && (
                    <div className="host-controls">
                        <p>
                            {allPlayersReady
                                ? "All players are ready!"
                                : "Waiting for all players to get ready..."}
                        </p>

                        <button
                            className="start-game-button"
                            onClick={handleStartGame}
                            disabled={
                                !socketConnected ||
                                !allPlayersReady
                            }
                        >
                            Start Game
                        </button>
                    </div>
                )}

                {error && (
                    <p className="lobby-error">{error}</p>
                )}

                <button
                    className="lobby-back-button"
                    onClick={() => navigate("/dashboard")}
                >
                    Back to Dashboard
                </button>

            </div>
        </div>
    );
}
