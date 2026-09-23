"use client";

import { useState } from "react";

interface EventHeroImageProps {
  src?: string | null;
  alt: string;
}

export function EventHeroImage({ src, alt }: EventHeroImageProps) {
  const [imgSrc, setImgSrc] = useState<string>(src || "/placeholder.svg");

  return (
    <>
      {/* Ambient blurred backdrop if flyer exists */}
      {src && (
        <img
          src={imgSrc}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover blur-2xl opacity-40 scale-110"
        />
      )}

      {/* Main sharp flyer image */}
      <img
        src={imgSrc}
        alt={alt}
        className="relative z-10 max-h-[420px] w-auto max-w-full object-contain mx-auto shadow-2xl py-2"
        onError={() => {
          if (!imgSrc.endsWith("/placeholder.svg")) {
            setImgSrc("/placeholder.svg");
          }
        }}
      />
    </>
  );
}
