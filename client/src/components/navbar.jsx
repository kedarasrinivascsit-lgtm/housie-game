
import { Link } from "react-router-dom";
import { Ticket, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="navbar">
      <Link to="/" className="brand">
        <span className="brand-icon"><Ticket /></span>
        <span>HOUSIE<span className="gold">.</span></span>
      </Link>

      <button
        className="mobile-menu"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle navigation"
      >
        {menuOpen ? <X /> : <Menu />}
      </button>

      <div className={`nav-links ${menuOpen ? "active" : ""}`}>
        <Link to="/" onClick={() => setMenuOpen(false)}>Home</Link>
        <a href="#how-to-play" onClick={() => setMenuOpen(false)}>How to Play</a>
        <Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link>
        <Link
          to="/register"
          className="nav-register"
          onClick={() => setMenuOpen(false)}
        >
          Get Started
        </Link>
      </div>
    </nav>
  );
}
