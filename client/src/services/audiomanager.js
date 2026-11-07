const MUSIC_SETTINGS_KEY = "housie-music-settings";
const DEFAULT_MUSIC_SETTINGS = {
    enabled: true,
    volume: 0.23,
    lobbyTrack: "djTillu"
};
const MUSIC_TRACKS = {
    djTillu: "/songs/Tillu%20Anna%20DJ%20Pedithe.mp3",
    cinemaChoopistha:
        "/songs/Cinema%20Choopistha%20Mama-SenSongsMp3.Com.mp3",
    gameplay: "/songs/Sooreede.mp3",
    celebration: "/songs/Nattu%20Nattu.mp3"
};

const readMusicSettings = () => {
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
            lobbyTrack: MUSIC_TRACKS[saved?.lobbyTrack]
                ? saved.lobbyTrack
                : DEFAULT_MUSIC_SETTINGS.lobbyTrack
        };
    } catch {
        return { ...DEFAULT_MUSIC_SETTINGS };
    }
};

const settings = readMusicSettings();
const activeEffects = new Set();
const noticeListeners = new Set();
let musicAudio = null;
let currentScene = "off";
let currentSource = "";
let memeVisible = false;
let targetVolume = 0;
let fadeFrame = null;
let ownerId = 0;
let releaseTimer = null;

const notify = (message) => {
    noticeListeners.forEach((listener) => listener(message));
};

const getTargetVolume = () => {
    if (!settings.enabled) return 0;
    if (activeEffects.size) return Math.min(settings.volume, 0.04);
    if (memeVisible) return Math.min(settings.volume, 0.09);
    return settings.volume;
};

const updateMusicVolume = () => {
    if (!musicAudio) return;

    targetVolume = getTargetVolume();
    if (fadeFrame !== null) {
        cancelAnimationFrame(fadeFrame);
    }

    const startVolume = musicAudio.volume;
    const startTime = performance.now();
    const fade = (time) => {
        if (!musicAudio) {
            fadeFrame = null;
            return;
        }

        const progress = Math.min(1, (time - startTime) / 220);
        musicAudio.volume =
            startVolume + (targetVolume - startVolume) * progress;

        if (Math.abs(targetVolume - musicAudio.volume) > 0.005) {
            fadeFrame = requestAnimationFrame(fade);
        } else {
            musicAudio.volume = targetVolume;
            fadeFrame = null;
        }
    };

    fadeFrame = requestAnimationFrame(fade);
};

const getSceneSource = () => {
    if (currentScene === "lobby") {
        return MUSIC_TRACKS[settings.lobbyTrack];
    }
    if (currentScene === "gameplay") return MUSIC_TRACKS.gameplay;
    if (currentScene === "celebration") {
        return MUSIC_TRACKS.celebration;
    }
    return "";
};

const applySceneSource = () => {
    const audio = initializeMusic();
    const nextSource = getSceneSource();

    if (!nextSource) {
        currentSource = "";
        audio.pause();
        updateMusicVolume();
        return;
    }

    if (nextSource !== currentSource) {
        currentSource = nextSource;
        audio.pause();
        audio.src = nextSource;
        audio.currentTime = 0;
        audio.load();
    }

    playMusicIfAllowed();
    updateMusicVolume();
};

const playMusicIfAllowed = () => {
    if (
        !musicAudio ||
        !settings.enabled ||
        !currentSource ||
        document.visibilityState === "hidden" ||
        !musicAudio.paused
    ) {
        return;
    }

    musicAudio.play().then(
        () => notify(""),
        (error) => {
            if (error?.name === "NotAllowedError") {
                notify("Interact with the page to allow background music.");
            } else if (error?.name !== "AbortError") {
                notify("Background music could not be played.");
            }
        }
    );
};

const initializeMusic = () => {
    if (musicAudio) return musicAudio;

    const audio = new Audio();
    audio.preload = "auto";
    audio.loop = true;
    audio.volume = 0;

    audio.addEventListener("ended", () => {
        if (
            audio === musicAudio &&
            settings.enabled &&
            currentSource &&
            document.visibilityState !== "hidden"
        ) {
            audio.currentTime = 0;
            playMusicIfAllowed();
        }
    });

    audio.addEventListener("error", () => {
        if (audio === musicAudio && currentSource) {
            notify(
                "Background music could not be loaded. Check the files in client/public/songs."
            );
        }
    });

    document.addEventListener("pointerdown", playMusicIfAllowed, true);
    document.addEventListener("keydown", playMusicIfAllowed, true);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
            audio.pause();
        } else {
            playMusicIfAllowed();
        }
    });

    musicAudio = audio;
    return audio;
};

export const subscribeMusicNotice = (listener) => {
    noticeListeners.add(listener);
    return () => noticeListeners.delete(listener);
};

export const configureMusic = (nextSettings) => {
    const previousLobbyTrack = settings.lobbyTrack;
    Object.assign(settings, nextSettings);

    if (
        currentScene === "lobby" &&
        previousLobbyTrack !== settings.lobbyTrack
    ) {
        applySceneSource();
    }

    const audio = initializeMusic();
    if (!settings.enabled) {
        audio.pause();
    } else {
        playMusicIfAllowed();
    }

    updateMusicVolume();
};

export const setMusicScene = (scene) => {
    currentScene = scene;
    applySceneSource();
    return ++ownerId;
};

export const releaseMusicScene = (releasedOwnerId) => {
    if (releaseTimer !== null) {
        clearTimeout(releaseTimer);
    }

    releaseTimer = setTimeout(() => {
        releaseTimer = null;
        if (releasedOwnerId !== ownerId) return;

        currentScene = "off";
        currentSource = "";
        memeVisible = false;
        if (musicAudio) musicAudio.pause();
        updateMusicVolume();
    }, 0);
};

export const setMemeVisible = (visible) => {
    memeVisible = Boolean(visible);
    updateMusicVolume();
};

export const playAudioEffect = (source, volume, { onError } = {}) => {
    const audio = new Audio(source);
    audio.preload = "none";
    audio.volume = Math.min(1, Math.max(0, volume));
    let active = true;
    let errorReported = false;

    const reportError = (error) => {
        if (errorReported) return;
        errorReported = true;
        onError?.(error);
    };

    const finish = () => {
        if (!active) return;
        active = false;
        activeEffects.delete(finish);
        audio.removeEventListener("ended", finish);
        audio.removeEventListener("error", handleError);
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
        updateMusicVolume();
    };

    const handleError = () => {
        finish();
        reportError(new Error("Audio effect could not be loaded."));
    };

    activeEffects.add(finish);
    audio.addEventListener("ended", finish);
    audio.addEventListener("error", handleError);
    updateMusicVolume();

    const started = audio.play().catch((error) => {
        finish();
        reportError(error);
        throw error;
    });

    return {
        started,
        stop: finish,
        isActive: () => active && !audio.paused && !audio.ended
    };
};

export const stopAllAudioEffects = () => {
    [...activeEffects].forEach((stopEffect) => stopEffect());
};
