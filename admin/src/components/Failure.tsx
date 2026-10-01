// The standing could not be read (the "any other failure" line): the line, and the one act that
// reads it again.
import { Button } from "@/components/strand/Button";
import { AuthAlert, SystemPage } from "@/components/dna/AuthSurface";
import { ADMIN_COPY } from "../lib/copy";

export function Failure({ onRetry }: { onRetry: () => void }) {
  return (
    <SystemPage data-testid="admin-failure" heading={ADMIN_COPY.shellHeading}>
      <AuthAlert>{ADMIN_COPY.failure}</AuthAlert>
      <Button type="button" full onClick={onRetry}>
        {ADMIN_COPY.confirm}
      </Button>
    </SystemPage>
  );
}
