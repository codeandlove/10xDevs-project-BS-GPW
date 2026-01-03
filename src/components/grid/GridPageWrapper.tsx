/**
 * Grid Page Wrapper
 * Wraps GridView with GridProvider to ensure context is available
 * This is necessary in Astro because each client:load creates a separate React island
 */

import { GridProvider } from "@/contexts/GridContext";
import { GridView } from "./GridView";

export function GridPageWrapper() {
  return (
    <GridProvider>
      <GridView />
    </GridProvider>
  );
}
