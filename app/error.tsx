"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="wrap">
      <div className="card stack">
        <h1>Something went wrong</h1>
        <p className="lede">Please try again. If it keeps happening, come back in a moment.</p>
        <button className="btn" type="button" onClick={() => reset()}>
          Try again
        </button>
      </div>
    </main>
  );
}
