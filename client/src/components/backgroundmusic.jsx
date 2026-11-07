import { useEffect, useState } from "react";
import {
    configureMusic,
    releaseMusicScene,
    setMemeVisible,
    setMusicScene,
    subscribeMusicNotice
} from "../services/audiomanager";
import "./backgroundmusic.css";

const MUSIC_SETTINGS_KEY = "housie-music-settings";
const DEFAULT_MUSIC_SETTINGS = {
    enabled: true,
    volume: 0.23,
    lobbyTrack: "djTillu"
};
const LOBBY_TRACKS = new Set(["djTillu", "cinemaChoopistha"]);

const getSavedMusicSettings = () => {
    try {
        const saved = JSON.parse(
            localStorage.getItem(MUSIC_SETTINGS_KEY)
        );
        const volume = Number(saved?.volume);

        return {
            enabled: saved?.enabled !== false,
            volume: Number.isFinite(volume)
                ? Math.min(1, Math.max(0, volume))
                : DEFAULT_MUSIC_SETTINGS.volume,
            lobbyTrack: LOBBY_TRACKS.has(saved?.lobbyTrack)
                ? saved.lobbyTrack
                : DEFAULT_MUSIC_SETTINGS.lobbyTrack
        };
    } catch {
        return { ...DEFAULT_MUSIC_SETTINGS };
    }
};

export default function BackgroundMusic({
    scene,
    memeVisible = false
}) {
    const [settings, setSettings] = useState(getSavedMusicSettings);
    const [notice, setNotice] = useState("");

    useEffect(() => {
        configureMusic({
            enabled: settings.enabled,
            volume: settings.volume,
            lobbyTrack: settings.lobbyTrack
        });
    }, [settings.enabled, settings.volume, settings.lobbyTrack]);

    useEffect(() => {
        const ownerId = setMusicScene(scene);
        return () => releaseMusicScene(ownerId);
    }, [scene, settings.lobbyTrack]);

    useEffect(() => {
        setMemeVisible(memeVisible);
        return () => setMemeVisible(false);
    }, [memeVisible]);

    useEffect(
        () => subscribeMusicNotice(setNotice),
        []
    );

    const updateSettings = (updates) => {
        const updated = {
            ...settings,
            ...updates
        };
        setSettings(updated);

        try {
            localStorage.setItem(
                MUSIC_SETTINGS_KEY,
                JSON.stringify(updated)
            );
            setNotice("");
        } catch {
            setNotice("Music preferences could not be saved in this browser.");
        }
    };

    return (
        <div className="background-music-controls">
            <button
                type="button"
                className={`background-music-toggle ${
                    settings.enabled ? "active" : ""
                }`}
                aria-pressed={settings.enabled}
                onClick={() =>
                    updateSettings({ enabled: !settings.enabled })
                }
            >
                <span aria-hidden="true">
                    {settings.enabled ? "♫" : "♪"}
                </span>
                Music {settings.enabled ? "ON" : "OFF"}
            </button>

            <label className="background-music-volume">
                <span>Music volume</span>
                <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={Math.round(settings.volume * 100)}
                    disabled={!settings.enabled}
                    aria-label="Background music volume"
                    onChange={(event) =>
                        updateSettings({
                            volume: Number(event.target.value) / 100
                        })
                    }
                />
            </label>

            {scene === "lobby" && (
                <label className="background-music-track">
                    <span>Lobby track</span>
                    <select
                        value={settings.lobbyTrack}
                        onChange={(event) =>
                            updateSettings({
                                lobbyTrack: event.target.value
                            })
                        }
                        aria-label="Lobby background music"
                    >
                        <option value="djTillu">DJ Tillu</option>
                        <option value="cinemaChoopistha">
                            Cinema Choopistha Mava
                        </option>
                    </select>
                </label>
            )}

            {notice && (
                <span
                    className="background-music-notice"
                    role="status"
                >
                    {notice}
                </span>
            )}
        </div>
    );
}
