/**
 * BottomSheet Component
 * Mobile-native bottom sheet modal using vaul
 * Provides drag-to-dismiss and native mobile UX
 */

import * as React from "react";
import { Drawer } from "vaul";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  dismissible?: boolean;
  modal?: boolean;
}

function BottomSheet({ open, onOpenChange, children, dismissible = true, modal = true }: BottomSheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} dismissible={dismissible} modal={modal}>
      {children}
    </Drawer.Root>
  );
}

function BottomSheetTrigger({ className, ...props }: React.ComponentProps<typeof Drawer.Trigger>) {
  return <Drawer.Trigger className={cn(className)} {...props} />;
}

function BottomSheetPortal({ ...props }: React.ComponentProps<typeof Drawer.Portal>) {
  return <Drawer.Portal {...props} />;
}

function BottomSheetOverlay({ className, ...props }: React.ComponentProps<typeof Drawer.Overlay>) {
  return <Drawer.Overlay className={cn("fixed inset-0 z-50 bg-black/50", className)} {...props} />;
}

interface BottomSheetContentProps extends React.ComponentProps<typeof Drawer.Content> {
  showHandle?: boolean;
}

function BottomSheetContent({ className, children, showHandle = true, ...props }: BottomSheetContentProps) {
  return (
    <BottomSheetPortal>
      <BottomSheetOverlay />
      <Drawer.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 mt-24 flex max-h-[96%] flex-col rounded-t-[20px] bg-background",
          className
        )}
        {...props}
      >
        {showHandle && <div className="mx-auto mt-4 h-1.5 w-12 shrink-0 rounded-full bg-muted" />}
        {children}
      </Drawer.Content>
    </BottomSheetPortal>
  );
}

function BottomSheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("shrink-0 border-b bg-background px-4 pb-4 pt-2", className)} {...props} />;
}

function BottomSheetTitle({ className, ...props }: React.ComponentProps<typeof Drawer.Title>) {
  return <Drawer.Title className={cn("text-lg font-semibold leading-none", className)} {...props} />;
}

function BottomSheetDescription({ className, ...props }: React.ComponentProps<typeof Drawer.Description>) {
  return <Drawer.Description className={cn("mt-2 text-sm text-muted-foreground", className)} {...props} />;
}

function BottomSheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("max-h-[80vh] overflow-y-auto px-4 py-4", className)} {...props} />;
}

function BottomSheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("shrink-0 border-t bg-background px-4 py-4", className)} {...props} />;
}

function BottomSheetClose({ ...props }: React.ComponentProps<typeof Drawer.Close>) {
  return <Drawer.Close {...props} />;
}

export {
  BottomSheet,
  BottomSheetTrigger,
  BottomSheetPortal,
  BottomSheetOverlay,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetDescription,
  BottomSheetBody,
  BottomSheetFooter,
  BottomSheetClose,
};
