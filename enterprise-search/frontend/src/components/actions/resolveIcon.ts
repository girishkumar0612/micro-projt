import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Resolves an icon name string (stored on actions) to a lucide-react component.
export function resolveIcon(name?: string): LucideIcon {
  if (!name) return LucideIcons.ArrowRight;
  const icon = (LucideIcons as unknown as Record<string, LucideIcon>)[name];
  return icon ?? LucideIcons.ArrowRight;
}
