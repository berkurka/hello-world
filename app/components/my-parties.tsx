export type PartyListItem = {
  id: string;
  title: string;
  when: string;
  place: string;
  going: string;
  href: string;
};

function PartyCards({ parties }: { parties: PartyListItem[] }) {
  return (
    <ul className="party-list">
      {parties.map((party) => (
        <li key={party.id} className="card stack">
          <div>
            <h2>{party.title}</h2>
            <p className="lede">
              {party.when}
              {party.place ? ` · ${party.place}` : ""}
            </p>
            <p>{party.going}</p>
          </div>
          <p>
            <a className="btn" href={party.href}>
              Open dashboard
            </a>
          </p>
        </li>
      ))}
    </ul>
  );
}

export function MyParties({
  upcoming,
  past,
}: {
  upcoming: PartyListItem[];
  past: PartyListItem[];
}) {
  if (upcoming.length === 0 && past.length === 0) {
    return <p className="lede">No parties are tied to this email yet.</p>;
  }
  return (
    <div className="stack">
      <section>
        <h2>Upcoming</h2>
        {upcoming.length === 0 ? <p className="lede">No upcoming parties.</p> : <PartyCards parties={upcoming} />}
      </section>
      {past.length > 0 ? (
        <section>
          <h2>Past</h2>
          <PartyCards parties={past} />
        </section>
      ) : null}
    </div>
  );
}
