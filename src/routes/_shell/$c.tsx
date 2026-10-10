// One stub per C until its engine brief ships (/collaborate, /contribute, /convey; /connect and
// /convene are their own routes and take precedence over this one): EmptyState in the C with "Back
// to Feed" (SPEC section 1). Renders inside the shell, never its own chrome (ruling 69).
//
// Design pass 01, B10 item 6 with STRAND-CHANGES section 7 (W38, W48): a stub page's empty
// treatment is EmptyState, never a placeholder card, and it fills the space the sticky bars leave
// so it centres rather than sitting as a stub parked at the top of an empty scroller. Since 1147
// (handoff 33-D item 3) that height is the column's: the stub takes the visible height the shell
// publishes, and EmptyState fills it.
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/strand/Button";
import { EmptyState } from "@/components/strand/EmptyState";
import { C_LABEL, C_ORDER, type C } from "@/components/strand/cmeta";
import { useEmptyStateSeen } from "@/lib/record-hooks";

export const Route = createFileRoute("/_shell/$c")({
  beforeLoad: ({ params }) => {
    if (!C_ORDER.includes(params.c as C)) throw notFound();
  },
  component: CStub,
});

function CStub() {
  const { c } = Route.useParams();
  const navigate = useNavigate();
  const active = c as C;
  // 12C part 2: the stub is its empty state; the surface column names which C.
  useEmptyStateSeen("c_stub.next", true);
  return (
    <div
      data-testid="c-stub"
      data-c={active}
      style={{ display: "flex", flexDirection: "column", minHeight: "var(--_shell-visible)" }}
    >
      <EmptyState
        c={active}
        title={C_LABEL[active] + " is next."}
        body="This surface arrives with its own brief. Until then Feed is Home and the shell is the same everywhere."
        action={
          <Button
            variant="secondary"
            onClick={() => void navigate({ to: "/feed", search: {} })}
            data-testid="to-feed"
          >
            Back to Feed
          </Button>
        }
      />
    </div>
  );
}
