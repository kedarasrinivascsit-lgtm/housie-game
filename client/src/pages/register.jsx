
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Lock, Ticket } from "lucide-react";
import { useAuth } from "../context/authcontext";

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        username: "",
        email: "",
        password: ""
    });

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await register(form);
            navigate("/dashboard");
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Registration failed. Please try again."
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

                <h1>Create Account</h1>
                <p>Join Housie and start playing with friends.</p>

                {error && <div className="auth-error">{error}</div>}

                <label>Username</label>
                <div className="auth-input">
                    <User size={18} />
                    <input
                        type="text"
                        name="username"
                        placeholder="Enter username"
                        value={form.username}
                        onChange={handleChange}
                        minLength={3}
                        maxLength={25}
                        required
                    />
                </div>

                <label>Email Address</label>
                <div className="auth-input">
                    <Mail size={18} />
                    <input
                        type="email"
                        name="email"
                        placeholder="Enter email"
                        value={form.email}
                        onChange={handleChange}
                        required
                    />
                </div>

                <label>Password</label>
                <div className="auth-input">
                    <Lock size={18} />
                    <input
                        type="password"
                        name="password"
                        placeholder="Minimum 8 characters"
                        value={form.password}
                        onChange={handleChange}
                        minLength={8}
                        required
                    />
                </div>

                <button
                    type="submit"
                    className="auth-submit"
                    disabled={loading}
                >
                    {loading ? "Creating Account..." : "Create Account"}
                </button>

                <p className="auth-switch">
                    Already registered? <Link to="/login">Login</Link>
                </p>
            </form>
        </div>
    );
}
