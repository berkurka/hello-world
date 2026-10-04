import Link from "next/link";
import { MY_PARTIES_PATH } from "@/lib/paths";

export function HostHeader() {
  return (
    <header className="top">
      <Link className="logo" href="/">
        Partyz
      </Link>
      <nav className="host-nav" aria-label="Host">
        {process.env.HOST_PARTIES_LINK === "1" ? (
          <Link className="nav-link" href={MY_PARTIES_PATH}>
            My parties
          </Link>
        ) : null}
        <a className="btn" href="/#create">
          Create an invite
        </a>
      </nav>
    </header>
  );
}
