import Link from "next/link";
import { MY_PARTIES_PATH } from "@/lib/paths";

export function HostHeader() {
  return (
    <header className="top">
      <Link className="logo" href="/">
        Partyz
      </Link>
      <nav className="host-nav" aria-label="Host">
        <Link className="nav-link" href={MY_PARTIES_PATH}>
          My parties
        </Link>
        <Link className="btn" href="/#create">
          New party
        </Link>
      </nav>
    </header>
  );
}
