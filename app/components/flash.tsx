export function Flash({
  error,
  notice,
}: {
  error?: string;
  notice?: string;
}) {
  if (!error && !notice) return null;
  return (
    <>
      {notice ? <p className="flash notice">{notice}</p> : null}
      {error ? <p className="flash error">{error}</p> : null}
    </>
  );
}
