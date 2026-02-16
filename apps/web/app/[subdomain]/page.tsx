export default function SubdomainPage({
  params,
}: {
  params: { subdomain: string };
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <h1 className="text-3xl font-bold mb-4">Status Page: {params.subdomain}</h1>
        <p className="text-muted-foreground">
          Public status page view will go here (Sprint 1.8)
        </p>
      </div>
    </div>
  );
}
