import { RecoveryLinks } from "@/app/components/recovery-links";
import { mailConfigured } from "@/lib/mail";

export default function NotFound() {
  return (
    <main className="wrap">
      <div className="card">
        <h1>Not found</h1>
        <p className="lede">That event or RSVP link does not exist.</p>
        <RecoveryLinks mailOn={mailConfigured()} />
      </div>
    </main>
  );
}
