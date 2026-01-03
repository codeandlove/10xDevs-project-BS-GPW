/**
 * Clear Filters Button Component
 * Resets all filters to default values
 */

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ClearFiltersButtonProps {
  activeFiltersCount: number;
  onClear: () => void;
}

export function ClearFiltersButton({ activeFiltersCount, onClear }: ClearFiltersButtonProps) {
  if (activeFiltersCount === 0) {
    return null; // Don't show button if no filters are active
  }

  return (
    <Button onClick={onClear} variant="outline" size="sm" className="gap-2">
      <X className="h-4 w-4" />
      <span>Wyczyść filtry</span>
      <Badge variant="secondary" className="ml-1">
        {activeFiltersCount}
      </Badge>
    </Button>
  );
}
