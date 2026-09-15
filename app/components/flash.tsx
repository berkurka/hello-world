export function Flash({
  error,
  notice,
}: {
  error?: string;
  notice?: string;
}) {
  if (error) return <p className="flash error">{error}</p>;
  if (notice) return <p className="flash notice">{notice}</p>;
  return null;
}
