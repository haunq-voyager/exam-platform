"use client";

import { useState } from "react";

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

interface Props {
  name: string;
  url?: string | null;
  className?: string;
}

/** Profile picture, falling back to the user's initials when there is no picture or it fails to load. */
export function Avatar({ name, url, className = "avatarBubble" }: Props) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(url) && failedUrl !== url;

  return (
    <span className={className}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url as string} alt={name} onError={() => setFailedUrl(url ?? null)} />
      ) : (
        initials(name)
      )}
    </span>
  );
}
