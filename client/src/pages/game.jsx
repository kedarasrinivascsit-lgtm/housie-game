import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/authcontext";
import api from "../services/api";
import socket from "../services/socket";
import GameCelebration from "../components/gamecelebration";
import BackgroundMusic from "../components/backgroundmusic";
import {
    playAudioEffect,
    stopAllAudioEffects
} from "../services/audiomanager";
import "../styles/meme.css";

const WINNING_CATEGORIES = [
    "Early Five",
    "Top Line",
    "Middle Line",
    "Bottom Line",
    "Full House"
];

const MEME_INTERVALS = {
    Low: 12,
    Medium: 7,
    High: 4,
    Extreme: 2
};

const SOUND_SETTINGS_KEY = "housie-sound-settings";
const SOUND_COOLDOWN_MS = 9000;
const LUCKY_NUMBERS = new Set([7, 11, 21, 42, 69, 90]);

const SOUND_LIBRARY = {
    chipi: {
        file: "5533-chipi-chipi-chapa-chapa.mp3"
    },
    losingHope: {
        file: "3930-nenu-potha-annaya.mp3"
    },
    lucky: {
        file: "Fahhhh.mp3"
    },
    oneAway: {
        file: "Sairam sairam .mp3"
    },
    suspiciousClaim: {
        file: "Nijamga chepthunna andi.mp3"
    },
    winner: {
        file: "Party leda pushpa.mp3"
    },
    earlyCelebration: {
        file: "Rey lei pilla bacha nayala.mp3"
    },
    suspiciousSituation: {
        file: "Edo Thedaga Undenti.mp3"
    },
    nearMiss: {
        file: "Manasula Karagani Lokame Lokama.mp3"
    },
    frustration: {
        file: "Ori me dhumpal thega meru ekkada dorikaru ra babu.mp3"
    },
    unexpectedTwist: {
        file: "Arey Enti Ra Idi.mp3"
    }
};

const getSavedSoundSettings = () => {
    try {
        const saved = JSON.parse(
            localStorage.getItem(SOUND_SETTINGS_KEY)
        );
        const volume = Number(saved?.volume);

        return {
            enabled: saved?.enabled !== false,
            volume: Number.isFinite(volume)
                ? Math.min(1, Math.max(0, volume))
                : 0.65
        };
    } catch {
        return {
            enabled: true,
            volume: 0.65
        };
    }
};

const getClaimWinnerName = (claim, players = []) => {
    const winner = claim?.winner;
    const winnerId =
        typeof winner === "string"
            ? winner
            : winner && typeof winner === "object"
                ? winner._id || winner.id
                : null;
    const player = winnerId
        ? players.find((roomPlayer) => {
              const playerUser = roomPlayer?.user;
              const playerId =
                  playerUser && typeof playerUser === "object"
                      ? playerUser._id || playerUser.id
                      : playerUser;
              return playerId && String(playerId) === String(winnerId);
          })
        : null;
    const playerUser = player?.user;
    const name =
        (typeof winner === "object" && winner !== null
            ? winner.username
            : null) ||
        claim?.winnerName ||
        (playerUser && typeof playerUser === "object"
            ? playerUser.username
            : null) ||
        player?.username;

    return typeof name === "string" && name.trim() ? name.trim() : null;
};

const getSavedMemeSettings = () => {
    try {
        const saved = JSON.parse(
            localStorage.getItem("housie-meme-settings")
        );

        return {
            enabled: saved?.enabled !== false,
            frequency: MEME_INTERVALS[saved?.frequency]
                ? saved.frequency
                : "Medium"
        };
    } catch {
        return {
            enabled: true,
            frequency: "Medium"
        };
    }
};

const getUserId = (user) => {
    if (!user) return null;
    return String(user._id || user.id || "");
};

const getTicketProgress = (ticket, markedNumbers, calledNumbers) => {
    const safeTicket = Array.isArray(ticket) ? ticket : [];
    const safeMarkedNumbers = Array.isArray(markedNumbers)
        ? markedNumbers
        : [];
    const safeCalledNumbers = Array.isArray(calledNumbers)
        ? calledNumbers
        : [];
    const ticketNumbers = new Set(
        safeTicket
            .flat()
            .filter(
                (number) =>
                    Number.isInteger(number) &&
                    number >= 1 &&
                    number <= 90
            )
    );
    const validMarkedNumbers = new Set(
        safeMarkedNumbers.filter(
            (number) =>
                ticketNumbers.has(number) &&
                safeCalledNumbers.includes(number)
        )
    );

    return {
        markedCount: validMarkedNumbers.size,
        totalCount: ticketNumbers.size,
        lineCounts: safeTicket.map((row) =>
            Array.isArray(row)
                ? row.filter(
                      (number) =>
                          Number.isInteger(number) &&
                          validMarkedNumbers.has(number)
                  ).length
                : 0
        )
    };
};

const getNearWinCategories = (ticket, markedNumbers, calledNumbers) => {
    if (!Array.isArray(ticket) || !ticket.length) return [];

    const progress = getTicketProgress(
        ticket,
        markedNumbers,
        calledNumbers
    );
    const nearCategories = [];

    if (progress.markedCount === 4) {
        nearCategories.push("Early Five");
    }

    ["Top Line", "Middle Line", "Bottom Line"].forEach(
        (category, index) => {
            if (progress.lineCounts[index] === 4) {
                nearCategories.push(category);
            }
        }
    );

    if (
        progress.totalCount > 0 &&
        progress.markedCount === progress.totalCount - 1
    ) {
        nearCategories.push("Full House");
    }

    return nearCategories;
};

const isClaimSatisfiedLocally = (
    category,
    ticket,
    markedNumbers,
    calledNumbers
) => {
    const progress = getTicketProgress(
        ticket,
        markedNumbers,
        calledNumbers
    );

    if (category === "Early Five") {
        return progress.markedCount >= 5;
    }

    if (category === "Full House") {
        return (
            progress.totalCount === 15 &&
            progress.markedCount === progress.totalCount
        );
    }

    const categoryIndex = {
        "Top Line": 0,
        "Middle Line": 1,
        "Bottom Line": 2
    }[category];

    return categoryIndex !== undefined &&
        progress.lineCounts[categoryIndex] === 5;
};

const getGameDuration = (startedAt, completedAt) => {
    const start = new Date(startedAt).getTime();
    const end = new Date(completedAt).getTime();

    if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        end < start
    ) {
        return "Unavailable";
    }

    const totalSeconds = Math.floor((end - start) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours) return `${hours}h ${minutes}m`;
    if (minutes) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
};

export default function Game() {
    const { code } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const seenClaimCategories = useRef(new Set());
    const fullHouseWinner = useRef(null);
    const completionPopupShown = useRef(false);

    const ticketRef = useRef([]);
    const markedNumbersRef = useRef([]);
    const calledNumbersRef = useRef([]);
    const memeSettingsRef = useRef(null);
    const soundSettingsRef = useRef(null);
    const userIdRef = useRef(null);
    const lastMemeCallCount = useRef(0);
    const seenMemeEvents = useRef(new Set());
    const seenSoundEvents = useRef(new Set());
    const seenNumberCallEvents = useRef(new Set());
    const lastSoundAt = useRef(0);
    const lastSoundId = useRef(null);
    const soundPending = useRef(false);
    const soundEffectRef = useRef(null);
    const hasUserInteracted = useRef(false);
    const winnerPopupRef = useRef(null);
    const pendingWinnerSound = useRef(false);
    const pendingNearMissSound = useRef(false);
    const celebrationSoundPlayed = useRef(false);
    const pendingCelebrationSound = useRef(false);
    const lastClaimAttempt = useRef(null);

    const [room, setRoom] = useState(null);
    const [ticket, setTicket] = useState([]);
    const [calledNumbers, setCalledNumbers] = useState([]);
    const [currentNumber, setCurrentNumber] = useState(null);
    const [markedNumbers, setMarkedNumbers] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [winningClaims, setWinningClaims] = useState([]);
    const [claimError, setClaimError] = useState("");
    const [winnerPopup, setWinnerPopup] = useState(null);

    const [memeSettings, setMemeSettings] = useState(getSavedMemeSettings);
    const [activeMeme, setActiveMeme] = useState(null);
    const [soundSettings, setSoundSettings] = useState(
        getSavedSoundSettings
    );
    const [soundNotice, setSoundNotice] = useState("");

    useLayoutEffect(() => {
        ticketRef.current = ticket;
        markedNumbersRef.current = markedNumbers;
        calledNumbersRef.current = calledNumbers;
        memeSettingsRef.current = memeSettings;
        soundSettingsRef.current = soundSettings;
        userIdRef.current = getUserId(user);
        winnerPopupRef.current = winnerPopup;
    }, [
        ticket,
        markedNumbers,
        calledNumbers,
        memeSettings,
        soundSettings,
        user,
        winnerPopup
    ]);

    const triggerMeme = (memeNumber, type, callCount) => {
        const settings = memeSettingsRef.current;

        if (!settings.enabled) return;
        if (!MEME_INTERVALS[settings.frequency]) return;

        const interval = MEME_INTERVALS[settings.frequency];

        if (callCount < interval || callCount % interval !== 0) return;

        if (callCount - lastMemeCallCount.current < 2) return;

        const image = `/memes/meme-${memeNumber}.webp`;

        setActiveMeme({
            image,
            type,
            id: `${memeNumber}-${callCount}-${Date.now()}`
        });

        lastMemeCallCount.current = callCount;
    };

    const updateMemeSettings = (updates) => {
        const updated = {
            ...memeSettingsRef.current,
            ...updates
        };
        memeSettingsRef.current = updated;
        setMemeSettings(updated);

        try {
            localStorage.setItem(
                "housie-meme-settings",
                JSON.stringify(updated)
            );
        } catch {
            setSoundNotice("Meme settings could not be saved in this browser.");
        }

        if (!updated.enabled) {
            setActiveMeme(null);
        }
    };

    const playSound = useCallback((soundId, { priority = false } = {}) => {
        const settings = soundSettingsRef.current;
        const sound = SOUND_LIBRARY[soundId];

        if (
            !sound ||
            !settings ||
            !settings.enabled ||
            !hasUserInteracted.current
        ) {
            return false;
        }

        if (
            !priority &&
            (winnerPopupRef.current ||
                soundPending.current ||
                Date.now() - lastSoundAt.current < SOUND_COOLDOWN_MS ||
                soundEffectRef.current?.isActive() ||
                lastSoundId.current === soundId)
        ) {
            return false;
        }

        try {
            if (priority) {
                stopAllAudioEffects();
                soundEffectRef.current = null;
                soundPending.current = false;
            }

            let effect;
            effect = playAudioEffect(
                `/memesounds/${encodeURIComponent(sound.file)}`,
                settings.volume,
                {
                    onError: (playError) => {
                        if (soundEffectRef.current === effect) {
                            soundEffectRef.current = null;
                            soundPending.current = false;
                        }

                        if (playError?.name === "NotAllowedError") {
                            setSoundNotice(
                                "Interact with the game to allow sound playback."
                            );
                        } else {
                            setSoundNotice(
                                "A meme sound could not be played. Check that the audio file is available."
                            );
                        }
                    }
                }
            );
            soundEffectRef.current = effect;
            soundPending.current = true;

            effect.started
                .then(() => {
                    if (soundEffectRef.current !== effect) return;
                    soundPending.current = false;
                    lastSoundAt.current = Date.now();
                    lastSoundId.current = soundId;
                    setSoundNotice("");
                })
                .catch((playError) => {
                    if (soundEffectRef.current !== effect) return;
                    soundEffectRef.current = null;
                    soundPending.current = false;

                    if (playError?.name === "NotAllowedError") {
                        setSoundNotice(
                            "Interact with the game to allow sound playback."
                        );
                    } else if (playError?.name !== "AbortError") {
                        setSoundNotice(
                            "A meme sound could not be played. Check that the audio file is available."
                        );
                    }
                });

            return true;
        } catch (playError) {
            soundPending.current = false;

            if (playError?.name === "NotAllowedError") {
                setSoundNotice(
                    "Interact with the game to allow sound playback."
                );
            } else {
                setSoundNotice(
                    "Sound playback failed. Check that the audio file is available."
                );
            }

            return false;
        }
    }, []);

    const stopSoundForAnnouncement = () => {
        stopAllAudioEffects();
        soundEffectRef.current = null;
        soundPending.current = false;
    };

    const updateSoundSettings = (updates) => {
        const updated = {
            ...soundSettingsRef.current,
            ...updates
        };

        soundSettingsRef.current = updated;
        setSoundSettings(updated);
        try {
            localStorage.setItem(
                SOUND_SETTINGS_KEY,
                JSON.stringify(updated)
            );
        } catch {
            setSoundNotice("Sound settings could not be saved in this browser.");
        }

        if (!updated.enabled) {
            pendingCelebrationSound.current = false;
            stopAllAudioEffects();
            soundEffectRef.current = null;
            soundPending.current = false;
        }

        if (updated.enabled) {
            hasUserInteracted.current = true;
            setSoundNotice("");
        }
    };

    const dismissWinnerPopup = () => {
        winnerPopupRef.current = null;
        setWinnerPopup(null);

        if (pendingWinnerSound.current) {
            pendingWinnerSound.current = false;
            pendingNearMissSound.current = false;
            playSound("winner");
            return;
        }

        if (pendingNearMissSound.current) {
            pendingNearMissSound.current = false;
            playSound("nearMiss");
        }
    };

    useEffect(() => {
        const markInteracted = () => {
            hasUserInteracted.current = true;

            if (
                pendingCelebrationSound.current &&
                soundSettingsRef.current?.enabled &&
                !celebrationSoundPlayed.current
            ) {
                pendingCelebrationSound.current = false;
                celebrationSoundPlayed.current = true;
                playSound("winner", { priority: true });
            }
        };

        window.addEventListener("pointerdown", markInteracted, true);
        window.addEventListener("keydown", markInteracted, true);

        return () => {
            window.removeEventListener(
                "pointerdown",
                markInteracted,
                true
            );
            window.removeEventListener(
                "keydown",
                markInteracted,
                true
            );

            stopAllAudioEffects();
            soundEffectRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!activeMeme) return;

        const timer = setTimeout(() => {
            setActiveMeme(null);
        }, activeMeme.type === "near" ? 3500 : 2500);

        return () => clearTimeout(timer);
    }, [activeMeme]);

    useEffect(() => {
        if (!ticket.length || !calledNumbers.length) return;

        const earlyFiveCount = getTicketProgress(
            ticket,
            markedNumbers,
            calledNumbers
        ).markedCount;

        const nearCategories = getNearWinCategories(
            ticket,
            markedNumbers,
            calledNumbers
        );

        if (nearCategories.length) {
            const signature =
                `one-away-${calledNumbers.length}-${earlyFiveCount}`;

            if (!seenMemeEvents.current.has(signature)) {
                seenMemeEvents.current.add(signature);
                triggerMeme(3, "near", calledNumbers.length);
            }

            const unclaimedNearCategory = nearCategories.find(
                (category) =>
                    !winningClaims.some(
                        (claim) => claim.category === category
                    )
            );

            if (
                unclaimedNearCategory &&
                !seenSoundEvents.current.has(
                    `one-away-${unclaimedNearCategory}`
                )
            ) {
                seenSoundEvents.current.add(
                    `one-away-${unclaimedNearCategory}`
                );
                playSound("oneAway");
            }

            return;
        }

        if (earlyFiveCount === 3) {
            const signature = `early-five-${calledNumbers.length}`;

            if (!seenMemeEvents.current.has(signature)) {
                seenMemeEvents.current.add(signature);
                triggerMeme(2, "near", calledNumbers.length);
            }
        }
    }, [ticket, calledNumbers, markedNumbers, winningClaims, playSound]);

    useEffect(() => {
        let active = true;
        const roomCode = code?.toUpperCase();

        seenClaimCategories.current = new Set();
        fullHouseWinner.current = null;
        completionPopupShown.current = false;
        seenMemeEvents.current = new Set();
        seenSoundEvents.current = new Set();
        seenNumberCallEvents.current = new Set();
        lastMemeCallCount.current = 0;
        lastSoundAt.current = 0;
        lastSoundId.current = null;
        pendingWinnerSound.current = false;
        pendingNearMissSound.current = false;
        celebrationSoundPlayed.current = false;
        pendingCelebrationSound.current = false;
        lastClaimAttempt.current = null;

        const handleWinClaimed = (data) => {
            if (
                typeof data?.roomCode !== "string" ||
                data.roomCode.toUpperCase() !== roomCode
            ) {
                return;
            }
            if (!WINNING_CATEGORIES.includes(data.category)) return;
            if (seenClaimCategories.current.has(data.category)) return;

            seenClaimCategories.current.add(data.category);

            const eventClaim = Array.isArray(data.winningClaims)
                ? data.winningClaims.find(
                      (winningClaim) =>
                          winningClaim?.category === data.category
                  )
                : null;
            const eventWinnerName =
                typeof data.winnerName === "string" &&
                data.winnerName.trim()
                    ? data.winnerName.trim()
                    : getClaimWinnerName(eventClaim);
            const claim = {
                category: data.category,
                winner:
                    data.winnerId ||
                    eventClaim?.winner?._id ||
                    eventClaim?.winner,
                winnerName: eventWinnerName,
                claimedAt: data.claimedAt
            };

            setWinningClaims((currentClaims) => {
                const nextClaims = Array.isArray(data.winningClaims)
                    ? data.winningClaims
                        .filter(
                            (winningClaim) =>
                                winningClaim &&
                                WINNING_CATEGORIES.includes(
                                    winningClaim.category
                                )
                        )
                        .map((winningClaim) => {
                            const winningClaimName =
                                winningClaim.category === data.category
                                    ? eventWinnerName
                                    : getClaimWinnerName(winningClaim);

                            return {
                                ...winningClaim,
                                winner:
                                    winningClaim.winner ||
                                    (winningClaim.category === data.category
                                        ? claim.winner
                                        : null),
                                winnerName:
                                    winningClaimName ||
                                    winningClaim.winnerName ||
                                    null
                            };
                        })
                    : [...currentClaims];

                if (
                    !nextClaims.some(
                        (winningClaim) =>
                            winningClaim.category === data.category
                    )
                ) {
                    nextClaims.push(claim);
                }

                return nextClaims;
            });

            const currentUserId = userIdRef.current;
            const isLocalWinner =
                currentUserId &&
                String(data.winnerId) === currentUserId;
            const nearCategories = getNearWinCategories(
                ticketRef.current,
                markedNumbersRef.current,
                calledNumbersRef.current
            );

            if (isLocalWinner) {
                pendingWinnerSound.current = true;
            } else if (nearCategories.includes(data.category)) {
                pendingNearMissSound.current = true;
                seenSoundEvents.current.add(
                    `near-miss-${data.category}`
                );
            }

            const winnerName =
                eventWinnerName;

            if (!winnerName) return;

            const winner = {
                category: data.category,
                winnerName
            };

            if (data.category === "Full House") {
                stopSoundForAnnouncement();
                fullHouseWinner.current = winner;
                return;
            }

            stopSoundForAnnouncement();
            const popup = {
                type: "category",
                roomCode,
                ...winner
            };
            winnerPopupRef.current = popup;
            setWinnerPopup(popup);
        };

        const handleClaimError = (message) => {
            const messageText =
                typeof message === "string"
                    ? message
                    : typeof message?.message === "string"
                    ? message.message
                    : "";

            if (messageText === "Winning condition not satisfied") {
                const attempt = lastClaimAttempt.current;
                const signature = `claim-error-${attempt?.category || "unknown"}-${calledNumbersRef.current.length}`;

                if (!seenSoundEvents.current.has(signature)) {
                    seenSoundEvents.current.add(signature);

                    if (attempt?.wasLocallySatisfied) {
                        playSound("suspiciousClaim");
                    } else {
                        playSound("earlyCelebration");
                    }
                }
            } else if (messageText === "Invalid winning category") {
                const signature = `invalid-claim-${calledNumbersRef.current.length}`;

                if (!seenSoundEvents.current.has(signature)) {
                    seenSoundEvents.current.add(signature);
                    playSound("suspiciousSituation");
                }
            }

            lastClaimAttempt.current = null;
            setClaimError(
                messageText || "Unable to verify winning claim"
            );
        };

        const handleNumberCalled = (data) => {
            if (
                typeof data?.roomCode !== "string" ||
                data.roomCode.toUpperCase() !== roomCode
            ) {
                return;
            }

            const nextCalledNumbers = Array.isArray(data.calledNumbers)
                ? data.calledNumbers.filter(
                      (number) =>
                          Number.isInteger(number) &&
                          number >= 1 &&
                          number <= 90
                  )
                : [];
            const callSignature = `${data.number}-${nextCalledNumbers.length}`;
            const isDuplicateCall =
                seenNumberCallEvents.current.has(callSignature) ||
                (calledNumbersRef.current.includes(data.number) &&
                    nextCalledNumbers.length <=
                        calledNumbersRef.current.length);

            seenNumberCallEvents.current.add(callSignature);
            calledNumbersRef.current = nextCalledNumbers;

            const calledNumber =
                Number.isInteger(data.number) &&
                data.number >= 1 &&
                data.number <= 90
                    ? data.number
                    : null;
            setCurrentNumber(calledNumber);
            setCalledNumbers(nextCalledNumbers);

            const ownTicketNumbers = new Set(
                ticketRef.current
                    .flat()
                    .filter((number) => typeof number === "number")
            );

            const validCall =
                Number.isInteger(data.number) &&
                data.number >= 1 &&
                data.number <= 90 &&
                nextCalledNumbers.includes(data.number);

            if (!validCall || isDuplicateCall) {
                const soundKey = !validCall
                    ? "unexpected-call"
                    : `duplicate-call-${callSignature}`;

                if (!seenSoundEvents.current.has(soundKey)) {
                    seenSoundEvents.current.add(soundKey);
                    playSound(
                        isDuplicateCall
                            ? "suspiciousSituation"
                            : "unexpectedTwist"
                    );
                }
            }

            if (validCall && !isDuplicateCall) {
                const callCount = nextCalledNumbers.length;

                if (
                    ownTicketNumbers.has(data.number) &&
                    LUCKY_NUMBERS.has(data.number) &&
                    !seenSoundEvents.current.has(
                        `lucky-number-${data.number}`
                    )
                ) {
                    seenSoundEvents.current.add(
                        `lucky-number-${data.number}`
                    );
                    playSound("lucky");
                } else if (
                    callCount >= 15 &&
                    [...ownTicketNumbers].filter((number) =>
                        nextCalledNumbers.includes(number)
                    ).length <= 1 &&
                    !seenSoundEvents.current.has("losing-hope")
                ) {
                    seenSoundEvents.current.add("losing-hope");
                    playSound("losingHope");
                } else {
                    const ordinaryCallKey =
                        `ordinary-call-${callSignature}`;

                    if (
                        !seenSoundEvents.current.has(ordinaryCallKey)
                    ) {
                        seenSoundEvents.current.add(ordinaryCallKey);

                        if (Math.random() < 0.18) {
                            playSound(
                                Math.random() < 0.5
                                    ? "chipi"
                                    : "frustration"
                            );
                        }
                    }
                }
            }

            if (
                typeof data.number === "number" &&
                ownTicketNumbers.has(data.number)
            ) {
                const signature = `ticket-number-${data.number}`;

                if (!seenMemeEvents.current.has(signature)) {
                    seenMemeEvents.current.add(signature);
                    triggerMeme(1, "normal", nextCalledNumbers.length);
                }
            }
        };

        const handleNumberMarked = (data) => {
            const nextMarkedNumbers = Array.isArray(data?.markedNumbers)
                ? data.markedNumbers.filter(
                      (number) =>
                          Number.isInteger(number) &&
                          number >= 1 &&
                          number <= 90
                  )
                : [];

            markedNumbersRef.current = nextMarkedNumbers;
            setMarkedNumbers(nextMarkedNumbers);
        };

        const handleRoomError = (message) => {
            setError(
                typeof message === "string"
                    ? message
                    : typeof message?.message === "string"
                    ? message.message
                    : "Unable to connect to the room"
            );
        };

        const handleGameCompleted = () => {
            setRoom((previousRoom) =>
                previousRoom
                    ? { ...previousRoom, status: "completed" }
                    : previousRoom
            );

            if (
                fullHouseWinner.current?.winnerName &&
                !completionPopupShown.current
            ) {
                completionPopupShown.current = true;

                stopSoundForAnnouncement();
                const popup = {
                    type: "completion",
                    roomCode,
                    ...fullHouseWinner.current
                };
                winnerPopupRef.current = popup;
                setWinnerPopup(popup);
            } else if (
                !fullHouseWinner.current &&
                !seenSoundEvents.current.has("unexpected-completion")
            ) {
                seenSoundEvents.current.add("unexpected-completion");
                playSound("unexpectedTwist");
            }
        };

        const handleConnect = () => {
            socket.emit("join-room", { roomCode: code });
        };

        const loadGame = async () => {
            try {
                const response = await api.get(
                    `/rooms/${code}/my-ticket`
                );

                const data = response.data;

                if (
                    !data?.room ||
                    typeof data.room !== "object" ||
                    Array.isArray(data.room) ||
                    !Array.isArray(data.ticket) ||
                    data.ticket.length !== 3 ||
                    !data.ticket.every(
                        (row) =>
                            Array.isArray(row) &&
                            row.length === 9 &&
                            row.every(
                                (number) =>
                                    number === null ||
                                    (Number.isInteger(number) &&
                                        number >= 1 &&
                                        number <= 90)
                            ) &&
                            row.filter(
                                (number) =>
                                    typeof number === "number"
                            ).length === 5
                    )
                ) {
                    throw new Error(
                        "The server returned invalid game data"
                    );
                }

                if (!active) return;

                const loadedTicket = data.ticket;
                const loadedMarkedNumbers = Array.isArray(
                    data.markedNumbers
                )
                    ? data.markedNumbers.filter(
                          (number) =>
                              Number.isInteger(number) &&
                              number >= 1 &&
                              number <= 90
                      )
                    : [];
                const loadedCalledNumbers = Array.isArray(
                    data.room.calledNumbers
                )
                    ? data.room.calledNumbers.filter(
                          (number) =>
                              Number.isInteger(number) &&
                              number >= 1 &&
                              number <= 90
                      )
                    : [];
                const loadedCurrentNumber =
                    Number.isInteger(data.room.currentNumber) &&
                    data.room.currentNumber >= 1 &&
                    data.room.currentNumber <= 90
                        ? data.room.currentNumber
                        : null;

                ticketRef.current = loadedTicket;
                markedNumbersRef.current = loadedMarkedNumbers;
                calledNumbersRef.current = loadedCalledNumbers;

                setRoom({
                    ...data.room,
                    calledNumbers: Array.isArray(
                        data.room.calledNumbers
                    )
                        ? loadedCalledNumbers
                        : [],
                    currentNumber: loadedCurrentNumber,
                    players: Array.isArray(data.room.players)
                        ? data.room.players
                        : []
                });

                setTicket(loadedTicket);

                setCalledNumbers(loadedCalledNumbers);

                setCurrentNumber(loadedCurrentNumber);
                setMarkedNumbers(loadedMarkedNumbers);

                const claims = Array.isArray(
                    data.room.winningClaims
                )
                    ? data.room.winningClaims.filter(
                          (claim) =>
                              claim &&
                              typeof claim === "object" &&
                              WINNING_CATEGORIES.includes(
                                  claim.category
                              )
                      ).map((claim) => ({
                          ...claim,
                          winnerName:
                              getClaimWinnerName(
                                  claim,
                                  data.room.players
                              ) || claim.winnerName || null
                      }))
                    : [];

                setWinningClaims(claims);

                claims.forEach((claim) => {
                    if (
                        WINNING_CATEGORIES.includes(claim.category)
                    ) {
                        seenClaimCategories.current.add(
                            claim.category
                        );
                    }
                });

                const fullHouseClaim = claims.find(
                    (claim) => claim.category === "Full House"
                );

                const fullHouseWinnerName =
                    getClaimWinnerName(
                        fullHouseClaim,
                        data.room.players
                    );

                if (
                    data.room.status === "completed" &&
                    fullHouseWinnerName
                ) {
                    fullHouseWinner.current = {
                        category: "Full House",
                        winnerName: fullHouseWinnerName
                    };

                    completionPopupShown.current = true;

                    const popup = {
                        type: "completion",
                        roomCode,
                        ...fullHouseWinner.current
                    };
                    winnerPopupRef.current = popup;
                    setWinnerPopup(popup);
                } else {
                    const latestClaim = [...claims]
                        .filter((claim) =>
                            WINNING_CATEGORIES.includes(
                                claim.category
                            )
                        )
                        .sort(
                            (left, right) =>
                                new Date(right.claimedAt || 0) -
                                new Date(left.claimedAt || 0)
                        )
                        .find(
                            (claim) =>
                                claim.category !== "Full House" &&
                                getClaimWinnerName(
                                    claim,
                                    data.room.players
                                )
                        );

                    const winnerName =
                        getClaimWinnerName(
                            latestClaim,
                            data.room.players
                        );

                    if (latestClaim && winnerName) {
                        const popup = {
                            type: "category",
                            roomCode,
                            category: latestClaim.category,
                            winnerName
                        };
                        winnerPopupRef.current = popup;
                        setWinnerPopup(popup);
                    }
                }
            } catch (err) {
                if (active) {
                    setError(
                        typeof err.response?.data?.message === "string"
                            ? err.response.data.message
                            : typeof err.message === "string"
                            ? err.message
                            : "Unable to load game"
                    );
                }
            } finally {
                if (active) setLoading(false);
            }
        };

        socket.on("connect", handleConnect);
        socket.on("number-called", handleNumberCalled);
        socket.on("number-marked", handleNumberMarked);
        socket.on("room-error", handleRoomError);
        socket.on("game-completed", handleGameCompleted);
        socket.on("win-claimed", handleWinClaimed);
        socket.on("claim-error", handleClaimError);

        if (socket.connected) {
            handleConnect();
        } else {
            socket.connect();
        }

        loadGame();

        return () => {
            active = false;

            socket.off("connect", handleConnect);
            socket.off("number-called", handleNumberCalled);
            socket.off("number-marked", handleNumberMarked);
            socket.off("room-error", handleRoomError);
            socket.off("game-completed", handleGameCompleted);
            socket.off("win-claimed", handleWinClaimed);
            socket.off("claim-error", handleClaimError);

            socket.disconnect();
        };
    }, [code, playSound]);

    const callNextNumber = () => {
        setError("");

        socket.emit("call-next-number", {
            roomCode: code
        });
    };

    const toggleMarkNumber = (number) => {
        if (number === null) return;

        setError("");

        socket.emit("toggle-mark-number", {
            roomCode: code,
            number
        });
    };

    const claimWin = (category) => {
        setClaimError("");
        lastClaimAttempt.current = {
            category,
            wasLocallySatisfied: isClaimSatisfiedLocally(
                category,
                ticketRef.current,
                markedNumbersRef.current,
                calledNumbersRef.current
            )
        };

        socket.emit("claim-win", {
            roomCode: code,
            category
        });
    };

    const createRematch = async () => {
        const response = await api.post("/rooms");
        const roomCode = response.data?.room?.roomCode;

        if (typeof roomCode !== "string" || !roomCode.trim()) {
            throw new Error("The server did not return a new room code.");
        }

        navigate(`/lobby/${roomCode}`);
    };

    const verifiedCategories = new Set(
        winningClaims.map((claim) => claim.category)
    );
    const fullHouseClaim = winningClaims.find(
        (claim) => claim.category === "Full House"
    );
    const championName = getClaimWinnerName(fullHouseClaim);
    const celebrationComplete =
        room?.status === "completed" && Boolean(championName);
    const gameDuration = getGameDuration(
        room?.gameStartedAt,
        fullHouseClaim?.claimedAt
    );

    useEffect(() => {
        if (!celebrationComplete) return;

        winnerPopupRef.current = null;
        setWinnerPopup(null);

        if (
            soundSettings.enabled &&
            !celebrationSoundPlayed.current
        ) {
            if (hasUserInteracted.current) {
                celebrationSoundPlayed.current = true;
                pendingCelebrationSound.current = false;
                playSound("winner", { priority: true });
            } else {
                pendingCelebrationSound.current = true;
            }
        }
    }, [celebrationComplete, soundSettings.enabled, playSound]);

    if (celebrationComplete) {
        return (
            <>
                <BackgroundMusic
                    scene="celebration"
                />
                <GameCelebration
                    claims={winningClaims}
                    championName={championName}
                    totalPlayers={
                        Array.isArray(room?.players)
                            ? room.players.length
                            : 0
                    }
                    totalNumbers={calledNumbers.length}
                    gameDuration={gameDuration}
                    onReturnToLobby={() =>
                        navigate(`/lobby/${code}`)
                    }
                    onPlayAgain={createRematch}
                />
            </>
        );
    }

    const ticketNumbers = new Set(
        ticket
            .flat()
            .filter((number) => typeof number === "number")
    );

    const validMarkedNumbers = new Set(
        markedNumbers.filter(
            (number) =>
                ticketNumbers.has(number) &&
                calledNumbers.includes(number)
        )
    );

    const earlyFiveNumbers = new Set(
        markedNumbers
            .filter((number) =>
                validMarkedNumbers.has(number)
            )
            .slice(0, 5)
    );

    const lineCategories = [
        "Top Line",
        "Middle Line",
        "Bottom Line"
    ];

    if (loading) {
        return (
            <div className="game-loading">
                Loading game...
            </div>
        );
    }

    if (error && !room) {
        return (
            <div className="game-error">
                {error}
            </div>
        );
    }

    return (
        <div className="game-page">
            <header className="game-header">
                <h1>HOUSIE</h1>
                <p>Room: {code}</p>
            </header>

            <div className="game-media-controls">
                <BackgroundMusic
                    scene="gameplay"
                    memeVisible={Boolean(
                        activeMeme && memeSettings.enabled
                    )}
                />

                <div className="meme-controls">
                    <button
                        type="button"
                        className={`meme-toggle ${
                            memeSettings.enabled ? "active" : ""
                        }`}
                        onClick={() =>
                            updateMemeSettings({
                                enabled: !memeSettings.enabled
                            })
                        }
                    >
                        <span className="meme-control-icon">😂</span>
                        Memes {memeSettings.enabled ? "ON" : "OFF"}
                    </button>

                    <select
                        className="meme-frequency"
                        value={memeSettings.frequency}
                        disabled={!memeSettings.enabled}
                        onChange={(event) =>
                            updateMemeSettings({
                                frequency: event.target.value
                            })
                        }
                        aria-label="Meme occurrence frequency"
                    >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Extreme">Extreme</option>
                    </select>
                </div>

                <div className="sound-controls">
                    <button
                        type="button"
                        className={`sound-toggle ${
                            soundSettings.enabled ? "active" : ""
                        }`}
                        aria-pressed={soundSettings.enabled}
                        onClick={() =>
                            updateSoundSettings({
                                enabled: !soundSettings.enabled
                            })
                        }
                    >
                        <span aria-hidden="true">
                            {soundSettings.enabled ? "🔊" : "🔇"}
                        </span>
                        Sound {soundSettings.enabled ? "ON" : "OFF"}
                    </button>

                    <label className="sound-volume">
                        <span>Volume</span>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={Math.round(soundSettings.volume * 100)}
                            disabled={!soundSettings.enabled}
                            aria-label="Meme sound volume"
                            onChange={(event) =>
                                updateSoundSettings({
                                    volume:
                                        Number(event.target.value) / 100
                                })
                            }
                        />
                    </label>
                </div>
            </div>

            {soundNotice && (
                <p className="sound-notice" role="status">
                    {soundNotice}
                </p>
            )}

            {activeMeme && memeSettings.enabled && (
                <div
                    key={activeMeme.id}
                    className={`meme-popup ${
                        activeMeme.type === "near"
                            ? "meme-popup-near"
                            : ""
                    }`}
                >
                    <button
                        type="button"
                        className="meme-close"
                        aria-label="Close meme"
                        onClick={() => setActiveMeme(null)}
                    >
                        ×
                    </button>

                    <img
                        src={activeMeme.image}
                        alt="Housie reaction meme"
                        onError={() => setActiveMeme(null)}
                    />
                </div>
            )}

            <section className="game-info">
                <h2>
                    {room?.status === "completed"
                        ? "Game Completed!"
                        : "Game in Progress"}
                </h2>

                <p>
                    Players:{" "}
                    {Array.isArray(room?.players)
                        ? room.players.length
                        : 0}
                </p>
            </section>

            {error && (
                <p className="game-error-message">
                    {error}
                </p>
            )}

            <section className="current-number-section">
                <p>LAST CALLED NUMBER</p>

                <div className="current-number">
                    {currentNumber || "--"}
                </div>

                {room?.isHost && (
                    <button
                        className="call-number-button"
                        onClick={callNextNumber}
                        disabled={calledNumbers.length === 90}
                    >
                        {calledNumbers.length === 90
                            ? "All Numbers Called"
                            : "Call Next Number"}
                    </button>
                )}

                <p>
                    Numbers Called: {calledNumbers.length} / 90
                </p>
            </section>

            <section className="ticket-section">
                <h2>Your Ticket</h2>

                <div className="ticket-grid">
                    {ticket.map((row, rowIndex) => (
                        <div
                            className="ticket-row"
                            key={rowIndex}
                        >
                            {row.map((number, colIndex) => (
                                <div
                                    key={colIndex}
                                    className={`ticket-cell ${
                                        number === null
                                            ? "empty"
                                            : markedNumbers.includes(
                                                  number
                                              )
                                            ? "marked"
                                            : ""
                                    } ${
                                        typeof number === "number" &&
                                        validMarkedNumbers.has(
                                            number
                                        ) &&
                                        (verifiedCategories.has(
                                            "Full House"
                                        ) ||
                                            verifiedCategories.has(
                                                lineCategories[
                                                    rowIndex
                                                ]
                                            ) ||
                                            (verifiedCategories.has(
                                                "Early Five"
                                            ) &&
                                                earlyFiveNumbers.has(
                                                    number
                                                )))
                                            ? "winner-highlight"
                                            : ""
                                    }`}
                                    onClick={() =>
                                        toggleMarkNumber(number)
                                    }
                                >
                                    {number}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </section>

            <section className="winning-claims-section">
                <div className="winning-claims-heading">
                    <div>
                        <p className="winning-claims-eyebrow">
                            PRIZE CATEGORIES
                        </p>
                        <h2>Claim Your Win</h2>
                    </div>

                    <span className="winning-claims-count">
                        {verifiedCategories.size} /{" "}
                        {WINNING_CATEGORIES.length} claimed
                    </span>
                </div>

                <div className="winning-categories-grid">
                    {WINNING_CATEGORIES.map((category) => {
                        const categoryClaims = winningClaims.filter(
                            (claim) =>
                                claim.category === category
                        );
                        const claimed = categoryClaims.length > 0;
                        const winnerNames = categoryClaims
                            .map((claim) =>
                                getClaimWinnerName(
                                    claim,
                                    room?.players
                                )
                            )
                            .filter(Boolean);

                        return (
                            <div
                                key={category}
                                className={`winning-category ${
                                    claimed ? "is-claimed" : ""
                                }`}
                            >
                                <span
                                    className="winning-category-indicator"
                                    aria-hidden="true"
                                >
                                    {claimed ? "✓" : "✦"}
                                </span>

                                <div className="winning-category-details">
                                    <span className="winning-category-name">
                                        {category}
                                    </span>
                                    <span
                                        className={`winning-category-winner ${
                                            claimed
                                                ? "has-winner"
                                                : ""
                                        }`}
                                        title={
                                            winnerNames.length
                                                ? winnerNames.join(", ")
                                                : undefined
                                        }
                                    >
                                        {winnerNames.length
                                            ? `${winnerNames.join(", ")} Claimed`
                                            : claimed
                                            ? "Winner name unavailable"
                                            : "Not Claimed"}
                                    </span>
                                </div>

                                <button
                                    className={`winning-claim-button ${
                                        claimed ? "is-claimed" : ""
                                    }`}
                                    onClick={() =>
                                        claimWin(category)
                                    }
                                    disabled={
                                        claimed ||
                                        room?.status !== "playing"
                                    }
                                >
                                    {claimed
                                        ? "CLAIMED"
                                        : "CLAIM"}
                                </button>
                            </div>
                        );
                    })}
                </div>

                {claimError && (
                    <p
                        className="claim-error-message"
                        role="alert"
                    >
                        <span aria-hidden="true">!</span>
                        {claimError}
                    </p>
                )}
            </section>

            <section className="called-board-section">
                <h2>Called Numbers</h2>

                <div className="called-number-grid">
                    {Array.from(
                        { length: 90 },
                        (_, index) => {
                            const number = index + 1;
                            const isCalled =
                                calledNumbers.includes(number);

                            return (
                                <div
                                    key={number}
                                    className={`called-number ${
                                        isCalled ? "called" : ""
                                    }`}
                                >
                                    {number}
                                </div>
                            );
                        }
                    )}
                </div>
            </section>

            {winnerPopup?.roomCode ===
                code?.toUpperCase() && (
                <div
                    className="winner-modal-backdrop"
                    role="presentation"
                    onClick={dismissWinnerPopup}
                >
                    <section
                        className={`winner-modal ${
                            winnerPopup.type === "completion"
                                ? "winner-modal-grand"
                                : ""
                        }`}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="winner-modal-title"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >
                        <button
                            className="winner-modal-close"
                            type="button"
                            aria-label="Close winner popup"
                            onClick={dismissWinnerPopup}
                        >
                            ×
                        </button>

                        <div
                            className="winner-confetti"
                            aria-hidden="true"
                        >
                            {Array.from(
                                { length: 16 },
                                (_, index) => (
                                    <span
                                        key={index}
                                        style={{
                                            left: `${
                                                (index * 37 + 4) %
                                                92
                                            }%`,
                                            animationDelay: `${
                                                index * -0.14
                                            }s`
                                        }}
                                    />
                                )
                            )}
                        </div>

                        <div
                            className="winner-trophy"
                            aria-hidden="true"
                        >
                            🏆
                        </div>

                        {winnerPopup.type === "completion" ? (
                            <>
                                <p className="winner-kicker">
                                    FULL HOUSE!
                                </p>

                                <h2 id="winner-modal-title">
                                    HOUSIE COMPLETED!
                                </h2>

                                <p className="winner-modal-category">
                                    Winner:{" "}
                                    {winnerPopup.winnerName}
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="winner-kicker">
                                    CONGRATULATIONS!
                                </p>

                                <h2 id="winner-modal-title">
                                    {winnerPopup.category}
                                </h2>

                                <p className="winner-modal-category">
                                    Winner:{" "}
                                    {winnerPopup.winnerName}
                                </p>

                                <span className="winner-label">
                                    WINNER
                                </span>
                            </>
                        )}

                        <button
                            className="winner-modal-button"
                            type="button"
                            onClick={dismissWinnerPopup}
                        >
                            Celebrate
                        </button>
                    </section>
                </div>
            )}
        </div>
    );
}