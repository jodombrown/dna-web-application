// A signed-in account with no live platform role (handoff 40-B section 3, item 2): a sentence and
// a sign-out. Never the shell, and never a redirect into the member app.
import { Button } from "@/components/strand/Button";
import { SystemPage } from "@/components/dna/AuthSurface";
import { getSupabase } from "@/lib/supabase";
import { ADMIN_COPY } from "../lib/copy";
import { signOutHere } from "../lib/session";

export function Refusal() {
  return (
    <SystemPage
      data-testid="admin-refusal"
      heading={ADMIN_COPY.refusalHeading}
      lead={ADMIN_COPY.refusalLine}
    >
      <Button
        type="button"
        variant="secondary"
        full
        data-testid="admin-sign-out"
        onClick={() => {
          const sb = getSupabase();
          if (sb) void signOutHere(sb);
        }}
      >
        {ADMIN_COPY.signOut}
      </Button>
    </SystemPage>
  );
}
