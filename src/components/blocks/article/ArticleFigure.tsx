import type { ReactNode } from "react";
import Image from "next/image";

/**
 * A figure in the body of an article — `DS-COMPONENTE-054`, spec §8.4.
 *
 * `alt` is required by the parser, not by this component: a missing one breaks
 * the build (`src/lib/editorial-mdx.ts`). The caption is a `<figcaption>`
 * inside the `<figure>`, never a `<p>` under it — a paragraph under an image
 * is not associated with it by anything an assistive technology can read.
 *
 * It sits in the **figure column** (`max-w-3xl`, `DS-LAYOUT-012`): a figure
 * breathes, running text does not stretch.
 */
export function ArticleFigure({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption?: ReactNode;
}) {
  return (
    <figure className="my-10" data-block="article-figure">
      <Image
        src={src}
        alt={alt}
        width={1200}
        height={630}
        sizes="(min-width: 768px) 768px, 100vw"
        className="w-full h-auto rounded-2xl border border-gray-100"
      />
      {caption && (
        <figcaption className="mt-3 text-sm text-tuggi-slate">{caption}</figcaption>
      )}
    </figure>
  );
}
