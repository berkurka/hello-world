import Link from "next/link";

export function HostNav({ mailOn, signedIn }: { mailOn: boolean; signedIn: boolean }) {
  if (!mailOn && !signedIn) return null;
  return (
    <nav className="host-nav">
      {signedIn ? <Link href="/host">My parties</Link> : <Link href="/host/recover">Find my parties</Link>}
    </nav>
  );
}
