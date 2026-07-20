import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export const DialogContent = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-70 bg-black/78 backdrop-blur-sm data-[state=closed]:animate-[fade-out_160ms_ease-in] data-[state=open]:animate-[fade-in_220ms_ease-out]" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed top-1/2 left-1/2 z-80 max-h-[88vh] w-[min(920px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-white/10 bg-void-900/98 p-0 text-white shadow-[0_36px_120px_rgb(0_0_0_/_0.75),0_0_60px_rgb(123_44_191_/_0.16)] outline-none data-[state=closed]:animate-[dialog-out_160ms_ease-in] data-[state=open]:animate-[dialog-in_260ms_cubic-bezier(.2,.8,.2,1)]",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute top-4 right-4 grid size-11 cursor-pointer place-items-center rounded-xl border border-white/8 bg-black/35 text-ink-300 transition hover:border-accent-500/40 hover:bg-accent-500/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400">
        <X size={18} />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("space-y-2", className)} {...props} />
);

export const DialogTitle = forwardRef<
  ElementRef<typeof DialogPrimitive.Title>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("font-display text-2xl font-bold tracking-tight text-white", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

export const DialogDescription = forwardRef<
  ElementRef<typeof DialogPrimitive.Description>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm leading-6 text-ink-300", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;
