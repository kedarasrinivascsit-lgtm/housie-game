
import { useAuth } from "../context/authcontext";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            navigate("/login");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    return (
        <div style={{
            minHeight: "85vh",
            padding: "50px 7%",
            color: "white"
        }}>
            <h1>Welcome, {user?.username}!</h1>

            <p style={{
                color: "#a4afc1",
                marginTop: "12px"
            }}>
                Your Housie player dashboard.
            </p>

            <button
                className="auth-submit"
                style={{ maxWidth: "180px" }}
                onClick={() => navigate("/join")}
            >
                Join Game
            </button>

            <button
                className="btn-secondary"
                style={{ marginLeft: "12px", cursor: "pointer" }}
                onClick={handleLogout}
            >
                Logout
            </button>
        </div>
    );
}
