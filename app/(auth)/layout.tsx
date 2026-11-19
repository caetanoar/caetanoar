import { Logo } from "@/components/app/logo";

export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-primary/10 to-background px-4 py-10">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <Logo className="size-16" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Caetano Auto</h1>
          <p className="text-sm text-muted-foreground">carros com procedência e história</p>
        </div>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
