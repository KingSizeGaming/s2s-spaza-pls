export default function ErrorCard({
  title,
  message,
  titleClassName,
}: {
  title: string;
  message: string;
  titleClassName?: string;
}) {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[390px] items-center px-4">
        <div className="w-full rounded-3xl border border-emerald-700 bg-white p-6 text-zinc-900 shadow-xl">
          <h1 className={`text-2xl font-semibold${titleClassName ? ` ${titleClassName}` : ""}`}>
            {title}
          </h1>
          <p className="mt-3 text-sm text-zinc-600">{message}</p>
        </div>
      </div>
    </main>
  );
}
