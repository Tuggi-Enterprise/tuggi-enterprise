import Image from "next/image";
import { cn } from "@/lib/utils";

interface PhoneFrameProps {
  src: string;
  alt: string;
  /** Only the hero screenshot should be priority; everything else lazy-loads. */
  priority?: boolean;
  /** Extra classes for the outer wrapper (e.g. width overrides). */
  className?: string;
  sizes?: string;
}

/**
 * Pure-CSS iPhone frame (rounded ~40px corners, thin dark bezel, soft shadow)
 * wrapping a real app screenshot. No device-mockup dependency. Presentational,
 * so it can be dropped into both server and client trees. Screenshots are
 * 780×1689 (portrait), rendered via next/image.
 */
export function PhoneFrame({
  src,
  alt,
  priority = false,
  className,
  sizes = "(max-width: 1024px) 70vw, 300px",
}: PhoneFrameProps) {
  return (
    <div className={cn("mx-auto w-full max-w-[300px]", className)}>
      <div className="rounded-[2.5rem] bg-tuggi-dark p-2.5 shadow-[0_30px_60px_-15px_rgba(11,18,32,0.35)] ring-1 ring-black/5">
        <div className="overflow-hidden rounded-[2rem] bg-black">
          <Image
            src={src}
            alt={alt}
            width={780}
            height={1689}
            priority={priority}
            sizes={sizes}
            className="block h-auto w-full"
          />
        </div>
      </div>
    </div>
  );
}
