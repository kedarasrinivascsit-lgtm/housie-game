
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/authcontext";

export default function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <div style={{ padding: 40, textAlign: "center" }}>
            Loading your account...
        </div>;
    }

    return user ? children : <Navigate to="/login" replace />;
}
