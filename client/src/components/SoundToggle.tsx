interface SoundToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export function SoundToggle({ enabled, onToggle }: SoundToggleProps) {
  const label = enabled ? 'Mute ambient soundscape' : 'Unmute ambient soundscape';

  return (
    <button
      type="button"
      className="icon-toggle"
      onClick={onToggle}
      aria-pressed={enabled}
      aria-label={label}
      title={label}
    >
      {enabled ? '🔊' : '🔇'}
    </button>
  );
}
