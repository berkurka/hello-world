import Link from "next/link";
import { FIND_PARTIES_PATH } from "@/lib/paths";

export function NotFoundView({
  title = "We couldn't find that page",
  body = "The link may be mistyped, or the party may have been removed.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <main className="wrap">
      <div className="card stack">
        <h1>{title}</h1>
        <p className="lede">{body}</p>
        <div className="actions">
          <Link className="btn" href="/">
            Create a party
          </Link>
          <Link className="btn ghost" href={FIND_PARTIES_PATH}>
            Find my parties
          </Link>
        </div>
      </div>
    </main>
  );
}
