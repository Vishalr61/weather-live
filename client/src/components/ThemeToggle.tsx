interface ThemeToggleProps {
  theme: 'light' | 'dark';
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === 'dark';
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <button
      type="button"
      className="icon-toggle"
      onClick={onToggle}
      aria-label={label}
      title={label}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}
