"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X, Download } from "lucide-react";

interface ImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  src?: string | null;
  alt?: string;
}

/** Fullscreen responsive image lightbox with backdrop blur, aspect-ratio preservation, and Esc/outside close. */
export function ImageLightbox({ isOpen, onClose, src, alt }: ImageLightboxProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !src) return null;

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        {/* Fullscreen Translucent Backdrop with Tasteful Blur */}
        <DialogPrimitive.Backdrop
          className="fixed inset-0 z-50 bg-background/85 backdrop-blur-md transition-opacity duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
        />

        {/* Full-viewport Flex Overlay: Centered, Click-outside to close */}
        <div
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 outline-none select-none"
        >
          {/* Top-Right Minimal Actions Container */}
          <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
            <a
              href={src}
              download={alt || "image"}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-border/50 bg-card/80 text-muted-foreground shadow-md backdrop-blur-md transition-all hover:border-border hover:bg-card hover:text-foreground active:scale-95"
              title="Open full resolution / Download"
              aria-label="Download image"
            >
              <Download className="size-4" />
            </a>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-border/50 bg-card/80 text-muted-foreground shadow-md backdrop-blur-md transition-all hover:border-border hover:bg-card hover:text-foreground active:scale-95"
              title="Close (Esc)"
              aria-label="Close viewer"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Centered Image Container - stops click propagation so clicking the image won't close */}
          <DialogPrimitive.Popup
            onClick={(e) => e.stopPropagation()}
            className="relative flex items-center justify-center outline-none duration-200 animate-in fade-in zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
          >
            <DialogPrimitive.Title className="sr-only">
              {alt || "Expanded image viewer"}
            </DialogPrimitive.Title>

            <img
              src={src}
              alt={alt || "Expanded preview"}
              className="h-auto w-auto max-h-[85vh] max-w-[92vw] sm:max-h-[88vh] sm:max-w-[88vw] rounded-2xl border border-border/60 bg-card/50 object-contain shadow-2xl"
            />
          </DialogPrimitive.Popup>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}