"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check } from "lucide-react";

interface ShareButtonProps {
  eventId: string;
}

export function ShareButton({ eventId }: ShareButtonProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleShare = () => {
    const eventUrl = `${window.location.origin}/events/${eventId}`;
    navigator.clipboard.writeText(eventUrl).then(
      () => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
      },
      (err) => {
        console.error("Could not copy text: ", err);
        alert("Failed to copy link.");
      },
    );
  };

  return (
    <Button
      onClick={handleShare}
      variant="outline"
      className="flex w-full items-center justify-center gap-2"
    >
      {isCopied ? (
        <>
          <Check className="h-4 w-4 text-emerald-500" /> Copied!
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4" /> Share Event
        </>
      )}
    </Button>
  );
}