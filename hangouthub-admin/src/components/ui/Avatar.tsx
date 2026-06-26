import { cn, initials } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  className?: string;
}

export function Avatar({ src, name, className }: AvatarProps) {
  return (
    <div
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold text-muted-foreground',
        className,
      )}
    >
      {src ? (
        <img src={src} alt={name ?? ''} className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </div>
  );
}
