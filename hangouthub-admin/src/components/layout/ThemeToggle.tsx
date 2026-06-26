import { Moon, Sun } from 'lucide-react';

import { useTheme } from '@/lib/theme/useTheme';

export function ThemeToggle() {
  const { isDark, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Basculer le thème clair/sombre"
      className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
