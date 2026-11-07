import "../styles/meme.css";

export default function MemeOverlay({
    settings,
    onSettingsChange,
    meme
}) {
    return (
        <>
            <div className="meme-controls">
                <label className="meme-toggle">
                    <input
                        type="checkbox"
                        checked={settings.enabled}
                        onChange={(event) =>
                            onSettingsChange({
                                ...settings,
                                enabled: event.target.checked
                            })
                        }
                    />
                    <span>Memes</span>
                </label>

                <select
                    value={settings.frequency}
                    disabled={!settings.enabled}
                    onChange={(event) =>
                        onSettingsChange({
                            ...settings,
                            frequency: event.target.value
                        })
                    }
                    aria-label="Meme frequency"
                >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="extreme">Extreme</option>
                </select>
            </div>

            {settings.enabled && meme && (
                <div
                    className={`meme-popup meme-popup-${meme.size || "small"}`}
                    key={meme.id}
                >
                    <img
                        src={meme.image}
                        alt="Game reaction meme"
                    />
                    {meme.caption && (
                        <p>{meme.caption}</p>
                    )}
                </div>
            )}
        </>
    );
}