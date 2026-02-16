export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <div className="flex">
        {/* Sidebar placeholder (Sprint 1.5) */}
        <aside className="w-64 bg-muted border-r">
          <div className="p-4">
            <p className="text-sm text-muted-foreground">Sidebar (Sprint 1.5)</p>
          </div>
        </aside>
        {/* Main content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
