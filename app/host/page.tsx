import { signOutHost } from "@/app/actions";
import { MyParties, type PartyListItem } from "@/app/components/my-parties";
import { formatWhen } from "@/lib/format";
import { listHostParties, sessionEmailFromToken, splitByStart } from "@/lib/host-login";
import { readHostCreds } from "@/lib/request-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function goingLabel(yes: number, people: number) {
  const heads = `${people} ${people === 1 ? "person" : "people"}`;
  if (yes <= 0 && people <= 0) return "No one going yet";
  if (yes <= 0) return `${heads} maybe`;
  if (people > 0) return `${yes} going · ${heads}`;
  return `${yes} going`;
}

export default async function MyPartiesPage() {
  const creds = await readHostCreds();
  const email = await sessionEmailFromToken(creds.sessionToken);
  if (!email) redirect("/host/recover");
  const parties = await listHostParties(email);
  const grouped = splitByStart(parties);
  const toItem = (party: (typeof parties)[number]): PartyListItem => ({
    id: party.id,
    title: party.title,
    when: formatWhen(party.starts_at),
    place: party.location.split("\n")[0]?.trim() ?? "",
    going: goingLabel(Number(party.yes_count), Number(party.people)),
    href: `/e/${party.id}/manage`,
  });

  return (
    <main className="wrap">
      <div className="stack">
        <div className="card stack">
          <div>
            <p className="kicker">Partyz</p>
            <h1>My parties</h1>
            <p className="lede">Signed in as {email}. This sign-in lasts 30 days.</p>
          </div>
          <form action={signOutHost}>
            <button className="btn ghost" type="submit">
              Sign out
            </button>
          </form>
        </div>
        <MyParties upcoming={grouped.upcoming.map(toItem)} past={grouped.past.map(toItem)} />
      </div>
    </main>
  );
}
