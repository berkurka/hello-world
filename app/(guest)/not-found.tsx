import { GuestFooter } from "@/app/components/guest-footer";
import { NotFoundView } from "@/app/components/not-found-view";

export default function GuestNotFound() {
  return (
    <>
      <NotFoundView
        title="We couldn't find that invite"
        body="The link may be mistyped, or this party may have been removed."
      />
      <GuestFooter />
    </>
  );
}
