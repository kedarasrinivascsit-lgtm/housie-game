
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Ticket } from "lucide-react";
import { useAuth } from "../context/authcontext";

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        email: "",
        password: ""
    });

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await login(form);
            navigate("/dashboard");
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Login failed. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <form className="auth-card" onSubmit={handleSubmit}>
                <div className="auth-logo">
                    <Ticket size={30} />
                </div>

                <h1>Welcome Back</h1>
                <p>Login to continue your Housie experience.</p>

                {error && <div className="auth-error">{error}</div>}

                <label>Email Address</label>
                <div className="auth-input">
                    <Mail size={18} />
                    <input
                        type="email"
                        placeholder="Enter email"
                        value={form.email}
                        onChange={(e) =>
                            setForm({ ...form, email: e.target.value })
                        }
                        required
                    />
                </div>

                <label>Password</label>
                <div className="auth-input">
                    <Lock size={18} />
                    <input
                        type="password"
                        placeholder="Enter password"
                        value={form.password}
                        onChange={(e) =>
                            setForm({ ...form, password: e.target.value })
                        }
                        required
                    />
                </div>

                <button
                    type="submit"
                    className="auth-submit"
                    disabled={loading}
                >
                    {loading ? "Logging In..." : "Login"}
                </button>

                <p className="auth-switch">
                    New to Housie? <Link to="/register">Create Account</Link>
                </p>
            </form>
        </div>
    );
}
