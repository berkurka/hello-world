import { requestHostLogin } from "@/app/actions";

export function RecoverForm() {
  return (
    <form action={requestHostLogin} className="stack">
      <label className="field">
        <span>Email</span>
        <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
      </label>
      <button className="btn" type="submit">
        Email me a sign-in link
      </button>
    </form>
  );
}
