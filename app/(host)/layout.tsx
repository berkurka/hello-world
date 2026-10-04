import { HostHeader } from "@/app/components/host-header";
import { isEphemeralDb } from "@/lib/db-env";

export default function HostLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HostHeader />
      {isEphemeralDb() ? (
        <p className="warn banner">
          This preview only keeps party data for a short time. It can disappear after a refresh.
        </p>
      ) : null}
      {children}
    </>
  );
}
