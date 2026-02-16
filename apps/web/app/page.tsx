export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-4">StatusHub</h1>
        <p className="text-lg text-muted-foreground">
          Public status pages with uptime monitoring for indie SaaS
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Sprint 1.3 — Next.js web app initialized ✓
        </p>
      </div>
    </main>
  );
}
