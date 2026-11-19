import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-9", className)} role="img" aria-label="Caetano Auto">
      <rect width="64" height="64" rx="14" fill="#1f3a5f" />
      <path d="M12 40c2-7 6-11 11-12l6-6c2-2 4-2 6-2h6c3 0 5 1 7 3l4 5c3 1 5 3 5 6v4c0 1-1 2-2 2h-3" fill="none" stroke="#f5b83d" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="21" cy="42" r="4.5" fill="none" stroke="#f5b83d" strokeWidth="3.2" />
      <circle cx="45" cy="42" r="4.5" fill="none" stroke="#f5b83d" strokeWidth="3.2" />
      <path d="M26 42h14" stroke="#f5b83d" strokeWidth="3.2" strokeLinecap="round" />
      <text x="32" y="58" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="9" fill="#ffffff" letterSpacing="1">CAETANO</text>
    </svg>
  );
}
