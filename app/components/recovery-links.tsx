export function RecoveryLinks({ mailOn }: { mailOn: boolean }) {
  return (
    <p className="actions" style={{ marginTop: "1rem" }}>
      <a className="btn" href="/">
        Create a party
      </a>
      {mailOn ? (
        <a className="btn ghost" href="/host/recover">
          Find my parties
        </a>
      ) : null}
    </p>
  );
}
