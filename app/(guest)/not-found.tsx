import { GuestFooter } from "@/app/components/guest-footer";

export default function GuestNotFound() {
  return (
    <>
      <main className="wrap">
        <div className="card stack">
          <h1>We couldn&apos;t find that invite</h1>
          <p className="lede">The link may be mistyped, or this party may have been removed.</p>
        </div>
      </main>
      <GuestFooter />
    </>
  );
}
