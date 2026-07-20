import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { cn } from "@/lib/utils";

export const ToastProvider = ToastPrimitive.Provider;

export const ToastViewport = forwardRef<
  ElementRef<typeof ToastPrimitive.Viewport>,
  ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      "fixed top-22 right-6 z-100 flex w-[min(390px,calc(100vw-3rem))] flex-col gap-3 outline-none",
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitive.Viewport.displayName;

export const Toast = forwardRef<
  ElementRef<typeof ToastPrimitive.Root>,
  ComponentPropsWithoutRef<typeof ToastPrimitive.Root>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Root
    ref={ref}
    className={cn(
      "relative overflow-hidden rounded-2xl border border-accent-500/30 bg-void-900/98 p-4 shadow-[0_22px_70px_rgb(0_0_0_/_0.65),0_0_30px_rgb(123_44_191_/_0.18)] backdrop-blur-xl data-[state=closed]:animate-[toast-out_180ms_ease-in] data-[state=open]:animate-[toast-in_320ms_cubic-bezier(.2,.8,.2,1)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=end]:animate-[toast-swipe-out_160ms_ease-out]",
      className,
    )}
    {...props}
  />
));
Toast.displayName = ToastPrimitive.Root.displayName;

export const ToastTitle = forwardRef<
  ElementRef<typeof ToastPrimitive.Title>,
  ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Title ref={ref} className={cn("text-sm font-bold text-white", className)} {...props} />
));
ToastTitle.displayName = ToastPrimitive.Title.displayName;

export const ToastDescription = forwardRef<
  ElementRef<typeof ToastPrimitive.Description>,
  ComponentPropsWithoutRef<typeof ToastPrimitive.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Description
    ref={ref}
    className={cn("mt-1 text-xs leading-5 text-ink-300", className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitive.Description.displayName;
