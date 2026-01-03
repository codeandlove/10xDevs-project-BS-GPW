/**
 * Main application header component
 * Used in authenticated views (Grid View, Full Detail View)
 */

import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

interface HeaderProps {
  showRangeSelector?: boolean;
  showFilters?: boolean;
  rangeSelector?: ReactNode;
  filters?: ReactNode;
  avatarMenu?: ReactNode;
}

export function Header({
  showRangeSelector = true,
  showFilters = true,
  rangeSelector,
  filters,
  avatarMenu,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-6">
          <a href="/grid" className="flex items-center space-x-2">
            <span className="text-2xl font-bold">🦢</span>
            <span className="hidden font-bold sm:inline-block">Black Swan Grid</span>
          </a>

          {/* Desktop controls */}
          {(showRangeSelector || showFilters) && (
            <div className="hidden items-center gap-4 md:flex">
              {showRangeSelector && rangeSelector}
              {showFilters && filters}
            </div>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Mobile menu button */}
          {(showRangeSelector || showFilters) && (
            <Button
              variant="outline"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          )}

          {/* Avatar menu */}
          {avatarMenu}
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (showRangeSelector || showFilters) && (
        <div className="border-t bg-white px-4 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            {showRangeSelector && rangeSelector}
            {showFilters && filters}
          </div>
        </div>
      )}
    </header>
  );
}
