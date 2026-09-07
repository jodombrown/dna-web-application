// One stub per C (/connect, /convene, /collaborate, /contribute, /convey) until its engine brief
// ships: EmptyState in the C with "Back to Feed" (SPEC section 1). Renders inside the shell, never
// its own chrome (ruling 69).
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/strand/Button";
import { EmptyState } from "@/components/strand/EmptyState";
import { C_LABEL, C_ORDER, type C } from "@/components/strand/cmeta";

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
  return (
    <div data-testid="c-stub" data-c={active}>
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
