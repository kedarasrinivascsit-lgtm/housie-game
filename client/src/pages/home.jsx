
import { Link } from "react-router-dom";
import {
  Users,
  Ticket,
  Trophy,
  Radio,
  ArrowRight,
  ShieldCheck,
  Zap
} from "lucide-react";

export default function Home() {
  const features = [
    {
      icon: <Users />,
      title: "Play Together",
      description: "Invite friends and enjoy multiplayer Housie from anywhere."
    },
    {
      icon: <Radio />,
      title: "Live Number Calling",
      description: "Experience synchronized number calling in real time."
    },
    {
      icon: <Ticket />,
      title: "Digital Tickets",
      description: "Get unique Tambola tickets with automatic number marking."
    },
    {
      icon: <Trophy />,
      title: "Instant Winners",
      description: "Automatically verify winning claims and celebrate winners."
    }
  ];

  const categories = [
    "Early Five",
    "Top Line",
    "Middle Line",
    "Bottom Line",
    "Full House"
  ];

  return (
    <div className="home">

      <section className="hero">
        <div className="hero-content">
          <div className="hero-tag">
            <Zap size={15} /> THE ULTIMATE ONLINE TAMBO﻿LA EXPERIENCE
          </div>

          <h1>
            Every Number.
            <br />
            Every Moment.
            <br />
            <span>Every Win.</span>
          </h1>

          <p>
            Bring your friends together and experience the excitement
            of Housie. Create a room, invite your people and let the
            numbers decide!
          </p>

          <div className="hero-buttons">
            <Link to="/register" className="btn-primary">
              Create a Game <ArrowRight size={18} />
            </Link>

            <Link to="/join" className="btn-secondary">
              Join a Game
            </Link>
          </div>

          <div className="hero-trust">
            <ShieldCheck size={17} />
            Real-time multiplayer gaming
          </div>
        </div>

        <div className="hero-visual">
          <div className="game-preview">
            <div className="preview-header">
              <span>LIVE GAME</span>
              <span className="live-dot">● LIVE</span>
            </div>

            <div className="current-number">
              <small>CURRENT NUMBER</small>
              <strong>47</strong>
              <span>Forty Seven</span>
            </div>

            <div className="number-grid">
              {Array.from({ length: 90 }, (_, i) => i + 1).map(num => (
                <div
                  key={num}
                  className={`number-cell ${
                    num === 47 ? "called-current" :
                    [12, 23, 35, 61, 78].includes(num) ? "called" : ""
                  }`}
                >
                  {num}
                </div>
              ))}
            </div>

            <div className="preview-footer">
              <span>5 Numbers Called</span>
              <span>85 Remaining</span>
            </div>
          </div>
        </div>
      </section>

      <section className="features section-container" id="how-to-play">
        <div className="section-heading">
          <span>WHY HOUSIE?</span>
          <h2>Gaming made <span>more exciting.</span></h2>
          <p>Everything you need for a fantastic Tambola experience.</p>
        </div>

        <div className="feature-grid">
          {features.map((feature, index) => (
            <div className="feature-card" key={index}>
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="winning-section section-container">
        <div className="section-heading">
          <span>WINNING CATEGORIES</span>
          <h2>Five ways to <span>win big.</span></h2>
        </div>

        <div className="category-list">
          {categories.map((category, index) => (
            <div className="category-card" key={category}>
              <span className="category-number">0{index + 1}</span>
              <strong>{category}</strong>
              <Trophy size={19} />
            </div>
          ))}
        </div>
      </section>

      <section className="cta-section">
        <h2>Ready to call your first number?</h2>
        <p>Your next Housie game is just one click away.</p>
        <Link to="/register" className="btn-primary">
          Start Playing <ArrowRight size={18} />
        </Link>
      </section>

    </div>
  );
}
