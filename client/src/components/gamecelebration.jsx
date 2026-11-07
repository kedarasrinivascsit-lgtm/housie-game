import { useState } from "react";
import "../styles/celebration.css";

const WINNING_CATEGORIES = [
    "Early Five",
    "Top Line",
    "Middle Line",
    "Bottom Line",
    "Full House"
];

const getWinnerName = (claim) => {
    const winner = claim?.winner;
    const name =
        typeof winner === "object" && winner !== null
            ? winner.username || claim?.winnerName
            : claim?.winnerName;

    return typeof name === "string" && name.trim()
        ? name.trim()
        : null;
};

const createPoster = async ({ championName, results, stats }) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1500;

    const context = canvas.getContext("2d");
    if (!context) {
        throw new Error("Your browser cannot create a results poster.");
    }

    const background = context.createLinearGradient(0, 0, 1200, 1500);
    background.addColorStop(0, "#321060");
    background.addColorStop(0.46, "#111e59");
    background.addColorStop(1, "#a33b43");
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);

    const glow = context.createRadialGradient(600, 560, 20, 600, 560, 660);
    glow.addColorStop(0, "rgba(255, 205, 91, 0.35)");
    glow.addColorStop(1, "rgba(255, 205, 91, 0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, canvas.width, 1200);

    context.strokeStyle = "#f4d378";
    context.lineWidth = 12;
    context.strokeRect(28, 28, 1144, 1444);
    context.strokeStyle = "rgba(255, 224, 142, 0.4)";
    context.lineWidth = 2;
    context.strokeRect(48, 48, 1104, 1404);

    context.textAlign = "center";
    context.fillStyle = "#ffe39b";
    context.font = "700 50px Georgia, serif";
    context.fillText("👑  HOUSIE GAME  👑", 600, 150);

    context.fillStyle = "#fff4d5";
    context.font = "900 72px Georgia, serif";
    context.fillText("GAME COMPLETED", 600, 270);

    context.fillStyle = "#f7cf65";
    context.font = "700 36px Arial, sans-serif";
    context.fillText("FULL HOUSE CHAMPION", 600, 400);

    context.fillStyle = "#ffffff";
    context.font = "900 82px Arial, sans-serif";
    context.fillText(championName, 600, 505, 1020);

    context.fillStyle = "rgba(12, 19, 53, 0.76)";
    context.fillRect(90, 600, 1020, 490);

    context.textAlign = "left";
    WINNING_CATEGORIES.forEach((category, index) => {
        const winnerNames = results
            .filter((result) => result.category === category)
            .map((result) => result.name)
            .filter(Boolean);
        const winnerText = winnerNames.length
            ? winnerNames.join(", ")
            : "Not Claimed";
        const y = 690 + index * 82;

        context.fillStyle = "#ffe49a";
        context.font = "700 34px Arial, sans-serif";
        context.fillText(category, 135, y);
        context.textAlign = "right";
        context.fillStyle = "#ffffff";
        context.font = "600 32px Arial, sans-serif";
        context.fillText(winnerText, 1065, y, 560);
        context.textAlign = "left";
    });

    context.fillStyle = "#f6d574";
    context.font = "700 29px Arial, sans-serif";
    context.textAlign = "center";
    context.fillText(
        `PLAYERS  ${stats.players}     •     NUMBERS CALLED  ${stats.numbers}     •     DURATION  ${stats.duration}`,
        600,
        1200,
        1040
    );

    context.fillStyle = "#fff3cf";
    context.font = "600 27px Arial, sans-serif";
    context.fillText("A GRAND HOUSIE CELEBRATION", 600, 1360);

    const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((result) => {
            if (result) {
                resolve(result);
            } else {
                reject(new Error("Could not generate the results poster."));
            }
        }, "image/png");
    });

    return blob;
};

export default function GameCelebration({
    claims,
    championName,
    totalPlayers,
    totalNumbers,
    gameDuration,
    onReturnToLobby,
    onPlayAgain
}) {
    const [sharing, setSharing] = useState(false);
    const [creatingRoom, setCreatingRoom] = useState(false);
    const [shareError, setShareError] = useState("");
    const safeClaims = Array.isArray(claims)
        ? claims.filter((claim) => claim && typeof claim === "object")
        : [];

    const results = WINNING_CATEGORIES.map((category) => ({
        category,
        claimed: safeClaims.some((claim) => claim.category === category),
        names: safeClaims
            .filter((claim) => claim.category === category)
            .map(getWinnerName)
            .filter(Boolean)
    }));

    const handleShareResults = async () => {
        setSharing(true);
        setShareError("");

        try {
            const blob = await createPoster({
                championName,
                results: results.map((result) => ({
                    category: result.category,
                    name: result.names.length
                        ? result.names.join(", ")
                        : result.claimed
                        ? "Winner name unavailable"
                        : "Not Claimed"
                })),
                stats: {
                    players: totalPlayers,
                    numbers: totalNumbers,
                    duration: gameDuration
                }
            });
            const fileName = `${championName
                .trim()
                .replace(/[^\w-]+/g, "-")
                .replace(/^-|-$/g, "") || "housie"}-winner.png`;
            const file =
                typeof File === "function"
                    ? new File([blob], fileName, {
                          type: "image/png"
                      })
                    : null;

            if (
                file &&
                navigator.share &&
                navigator.canShare?.({ files: [file] })
            ) {
                await navigator.share({
                    title: "Housie Game Results",
                    text: `${championName} is the Full House Champion!`,
                    files: [file]
                });
            } else {
                const objectUrl = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = objectUrl;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.setTimeout(
                    () => URL.revokeObjectURL(objectUrl),
                    1000
                );
            }
        } catch (error) {
            if (error?.name !== "AbortError") {
                setShareError(
                    (typeof error?.message === "string" &&
                        error.message) ||
                        "Unable to share or download the results poster."
                );
            }
        } finally {
            setSharing(false);
        }
    };

    const handlePlayAgain = async () => {
        setCreatingRoom(true);
        setShareError("");

        try {
            await onPlayAgain();
        } catch (error) {
            const responseMessage =
                error?.response?.data?.message;
            setShareError(
                (typeof responseMessage === "string" &&
                    responseMessage) ||
                    (typeof error?.message === "string" &&
                        error.message) ||
                    "Unable to create a rematch room."
            );
        } finally {
            setCreatingRoom(false);
        }
    };

    return (
        <main className="game-celebration">
            <div className="celebration-spotlights" aria-hidden="true" />
            <div className="celebration-film-reel reel-left" aria-hidden="true" />
            <div className="celebration-film-reel reel-right" aria-hidden="true" />
            <div className="celebration-film-strip strip-left" aria-hidden="true" />
            <div className="celebration-film-strip strip-right" aria-hidden="true" />

            <div className="celebration-confetti" aria-hidden="true">
                {Array.from({ length: 64 }, (_, index) => (
                    <span
                        key={index}
                        style={{
                            "--confetti-x": `${(index * 47 + 3) % 100}%`,
                            "--confetti-delay": `${-((index * 13) % 70) / 10}s`,
                            "--confetti-duration": `${5 + (index % 5)}s`,
                            "--confetti-color": [
                                "#ffe07b",
                                "#ff568b",
                                "#61e6ff",
                                "#b38bff",
                                "#ff954f",
                                "#72e89a"
                            ][index % 6]
                        }}
                    />
                ))}
            </div>

            <div className="celebration-stars" aria-hidden="true">
                {Array.from({ length: 20 }, (_, index) => (
                    <span
                        key={index}
                        style={{
                            "--star-x": `${(index * 61 + 8) % 100}%`,
                            "--star-y": `${(index * 37 + 6) % 72}%`,
                            "--star-delay": `${-((index * 3) % 8)}s`
                        }}
                    >
                        ✦
                    </span>
                ))}
            </div>

            <div className="celebration-audience" aria-hidden="true">
                {Array.from({ length: 30 }, (_, index) => (
                    <span
                        key={index}
                        style={{ "--audience-delay": `${(index % 7) * -0.18}s` }}
                    />
                ))}
            </div>

            <div className="celebration-content">
                <header className="celebration-header">
                    <span className="celebration-crown" aria-hidden="true">
                        👑
                    </span>
                    <p className="celebration-brand">HOUSIE GAME</p>
                    <div className="celebration-ribbon">
                        <span>GAME COMPLETED</span>
                    </div>
                </header>

                <div className="celebration-main">
                    <section
                        className="celebration-results"
                        aria-labelledby="final-results-title"
                    >
                        <div className="celebration-panel-heading">
                            <span aria-hidden="true">✦</span>
                            <h1 id="final-results-title">FINAL RESULTS</h1>
                            <span aria-hidden="true">✦</span>
                        </div>

                        <div className="celebration-result-list">
                            {results.map(
                                ({ category, names, claimed }, index) => (
                                    <div
                                        className={`celebration-result-row ${
                                            category === "Full House"
                                                ? "is-full-house"
                                                : ""
                                        }`}
                                        key={category}
                                        style={{
                                            "--result-delay": `${index * 90}ms`
                                        }}
                                    >
                                        <span
                                            className="celebration-result-star"
                                            aria-hidden="true"
                                        >
                                            {category === "Full House"
                                                ? "♛"
                                                : "✦"}
                                        </span>
                                        <span className="celebration-result-category">
                                            {category}
                                        </span>
                                        <span className="celebration-result-winners">
                                            {names.length
                                                ? `${names.join(", ")} Claimed`
                                                : claimed
                                                ? "Winner name unavailable"
                                                : "Not Claimed"}
                                        </span>
                                    </div>
                                )
                            )}
                        </div>

                        <div className="celebration-stats">
                            <div className="celebration-stat">
                                <span aria-hidden="true">♟</span>
                                <small>TOTAL PLAYERS</small>
                                <strong>{totalPlayers}</strong>
                            </div>
                            <div className="celebration-stat">
                                <span aria-hidden="true">✺</span>
                                <small>NUMBERS CALLED</small>
                                <strong>{totalNumbers}</strong>
                            </div>
                            <div className="celebration-stat">
                                <span aria-hidden="true">◷</span>
                                <small>GAME DURATION</small>
                                <strong>{gameDuration}</strong>
                            </div>
                        </div>
                    </section>

                    <section
                        className="celebration-champion"
                        aria-label="Full House champion"
                    >
                        <div className="champion-light-cone" aria-hidden="true" />
                        <div className="champion-orbit orbit-one" aria-hidden="true" />
                        <div className="champion-orbit orbit-two" aria-hidden="true" />
                        <div className="champion-card">
                            <span className="champion-crown" aria-hidden="true">
                                👑
                            </span>
                            <span className="champion-eyebrow">
                                THE ULTIMATE WINNER
                            </span>
                            <div className="champion-name-frame">
                                <span className="champion-name">
                                    {championName}
                                </span>
                            </div>
                            <span className="champion-title">
                                FULL HOUSE
                                <br />
                                CHAMPION
                            </span>
                            <span className="champion-flourish" aria-hidden="true">
                                ✦ ✧ ✦
                            </span>
                        </div>
                        <span className="champion-side-star star-a" aria-hidden="true">
                            ✨
                        </span>
                        <span className="champion-side-star star-b" aria-hidden="true">
                            ✨
                        </span>
                    </section>
                </div>

                <div className="celebration-actions">
                    <button
                        type="button"
                        className="celebration-action action-play"
                        onClick={handlePlayAgain}
                        disabled={creatingRoom}
                    >
                        <span aria-hidden="true">↻</span>
                        {creatingRoom ? "Creating Room..." : "Play Again"}
                    </button>
                    <button
                        type="button"
                        className="celebration-action action-lobby"
                        onClick={onReturnToLobby}
                    >
                        <span aria-hidden="true">⌂</span>
                        Return to Lobby
                    </button>
                    <button
                        type="button"
                        className="celebration-action action-share"
                        onClick={handleShareResults}
                        disabled={sharing}
                    >
                        <span aria-hidden="true">⇧</span>
                        {sharing ? "Preparing..." : "Share Results"}
                    </button>
                </div>
                {shareError && (
                    <p className="celebration-share-error" role="alert">
                        {shareError}
                    </p>
                )}
            </div>
        </main>
    );
}
