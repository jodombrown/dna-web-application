// Handoff 34-A item 7 (1156, G130): inside Discovery's pane at expanded, the event page's own Share
// opens the pane's share view, the same view the pane toolbar's Share opens, in the pane body in
// place of the page. Discovery provides the opener while the pane shows an event; the page reads it,
// and where there is none (the standalone page, or any page below expanded) keeps its own Sheet.
import { createContext } from "react";

export const PaneShareContext = createContext<(() => void) | null>(null);
