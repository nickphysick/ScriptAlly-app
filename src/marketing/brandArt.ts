/**
 * The site's two pieces of brand artwork — the hawk and the drawn wordmark — stated once, for the
 * nav and the footer.
 *
 * ⚠️ ONE PLACE BECAUSE THERE ARE TWO READERS. The footer carries the hawk as well as the nav now
 * (17 Sep), and a version typed into both would be the fault every `?v=` in this tier exists to
 * prevent: one copy moves with the file, the other goes on serving the old picture for an hour.
 *
 * ⚠️ EACH VERSION IS THE FIRST EIGHT HEX DIGITS OF ITS FILE'S md5. Nothing under `public/` is
 * fingerprinted by the build, so the hash in the URL is the only thing that stops a re-export
 * under the same name being served stale. The smoke tests read both sides.
 */

export interface BrandArt {
  src: string;
  version: string;
  width: number;
  height: number;
}

/** The hawk. Drawn in the file's own colours — no filter, no recolour, wherever it appears. */
export const BRAND_MARK: BrandArt = {
  src: "/images/queryhawk-logo.png", version: "f95f44c3", width: 500, height: 500,
};

/**
 * The drawn wordmark, re-supplied in a heavier serif on 17 Sep. Its lettering starts 5px inside
 * the file at nav size, where the previous drawing's started 22px in — which is most of why the
 * lockup's gap came down.
 */
export const BRAND_WORDMARK: BrandArt = {
  src: "/images/queryhawk_title.png", version: "af9ca697", width: 500, height: 100,
};

/** The versioned URL a page asks for. */
export const artUrl = (art: Pick<BrandArt, "src" | "version">): string => art.src + "?v=" + art.version;
