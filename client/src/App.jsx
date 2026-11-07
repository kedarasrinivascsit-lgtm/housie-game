
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/navbar.jsx";
import ProtectedRoute from "./components/protectedroute.jsx";

import Home from "./pages/home.jsx";
import Login from "./pages/login.jsx";
import Register from "./pages/register.jsx";
import Dashboard from "./pages/dashboard.jsx";
import Join from "./pages/join.jsx";
import CreateRoom from "./pages/createroom.jsx";
import Lobby from "./pages/lobby.jsx";
import Game from "./pages/game";

import { AuthProvider } from "./context/authcontext.jsx";

import "./styles/global.css";

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Navbar />

                <Routes>
                    <Route path="/" element={<Home />} />

                    <Route path="/login" element={<Login />} />

                    <Route path="/register" element={<Register />} />

                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/join"
                        element={
                            <ProtectedRoute>
                                <Join />
                            </ProtectedRoute>
                        }
                    />
                    <Route
    path="/create-room"
    element={
        <ProtectedRoute>
            <CreateRoom />
        </ProtectedRoute>
    }
/>

<Route
    path="/lobby/:code"
    element={
        <ProtectedRoute>
            <Lobby />
        </ProtectedRoute>
    }
/>
<Route
    path="/game/:code"
    element={
        <ProtectedRoute>
            <Game />
        </ProtectedRoute>
    }
/>
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

