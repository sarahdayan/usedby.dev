import { Footer } from '@/components/footer';

export default function Loading() {
  return (
    <main className="min-h-screen animate-pulse">
      <header className="mx-auto max-w-5xl px-6 pt-12 pb-8">
        <div className="mb-8 h-4 w-24 rounded bg-secondary" />

        <div className="flex flex-wrap items-center gap-3">
          <div className="h-8 w-48 rounded bg-secondary" />
          <div className="h-6 w-16 rounded-full bg-secondary" />
        </div>
        <div className="mt-3 h-5 w-36 rounded bg-secondary" />
      </header>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="h-6 w-32 rounded bg-secondary" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-12 w-full rounded-lg bg-secondary/50"
            />
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
