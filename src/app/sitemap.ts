import { MetadataRoute } from "next";

import { routing } from "@/src/i18n/routing";
import { getPostSlugsUseCase } from "@/src/Posts/application/GetPostSlugsUseCase";
import { getPostsPagesUseCase } from "@/src/Posts/application/GetPostsPagesUseCase";

if (process.env.NEXT_PUBLIC_BASE_URL === undefined) {
  throw new Error("NEXT_PUBLIC_BASE_URL is not defined");
}

const baseUrl: string = process.env.NEXT_PUBLIC_BASE_URL;

/**
 * Paths available in every locale that no use case can derive. Game pages are
 * hand-written, one route per game, so they are not derived from the games
 * catalog: a game listed there does not necessarily have a page.
 */
const staticPaths: string[] = [
  "",
  "/games",
  "/landing",
  "/games/blood-and-bytes-kagura/privacy-policy",
  "/games/genoma-invaders",
  "/games/genoma-invaders/privacy-policy",
  "/games/unknown-tales-rogue-archipelago",
];

const buildLocalizedUrl = (locale: string, path: string): string =>
  `${baseUrl}/${locale}${path}`;

const buildLocalizedUrls = (
  path: string,
  locales: readonly string[],
): Record<string, string> =>
  Object.fromEntries(
    locales.map((locale) => [locale, buildLocalizedUrl(locale, path)]),
  );

/**
 * Builds one entry per locale for the same path, cross-linking every locale
 * through hreflang alternates.
 */
const buildEntriesForPath = (
  path: string,
  locales: readonly string[],
): MetadataRoute.Sitemap => {
  const urlsByLocale: Record<string, string> = buildLocalizedUrls(
    path,
    locales,
  );

  return Object.values(urlsByLocale).map((url) => ({
    alternates: { languages: urlsByLocale },
    url,
  }));
};

/**
 * The blog listing is paginated per locale, and a locale may hold more posts
 * than another, so a page number is not guaranteed to exist in every locale:
 * these entries carry no alternates.
 */
const buildBlogPageEntries = async (
  locales: readonly string[],
): Promise<MetadataRoute.Sitemap> => {
  const entriesByLocale: MetadataRoute.Sitemap[] = await Promise.all(
    locales.map(async (locale): Promise<MetadataRoute.Sitemap> => {
      const pages: number[] = await getPostsPagesUseCase.run({ locale });

      // The first page renders the same list as the locale home page.
      return pages
        .filter((page) => page > 1)
        .map((page) => ({ url: buildLocalizedUrl(locale, `/${page}`) }));
    }),
  );

  return entriesByLocale.flat();
};

/**
 * Each post belongs to a single locale: the content model holds no link between
 * a post and its translation, so these entries carry no alternates.
 */
const buildPostEntries = async (
  locales: readonly string[],
): Promise<MetadataRoute.Sitemap> => {
  const entriesByLocale: MetadataRoute.Sitemap[] = await Promise.all(
    locales.map(async (locale): Promise<MetadataRoute.Sitemap> => {
      const slugs: string[] = await getPostSlugsUseCase.run({ locale });

      return slugs.map((slug) => ({
        url: buildLocalizedUrl(locale, `/posts/${slug}`),
      }));
    }),
  );

  return entriesByLocale.flat();
};

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const { locales } = routing;

  const [blogPageEntries, postEntries]: MetadataRoute.Sitemap[] =
    await Promise.all([
      buildBlogPageEntries(locales),
      buildPostEntries(locales),
    ]);

  return [
    ...staticPaths.flatMap((path) => buildEntriesForPath(path, locales)),
    ...blogPageEntries,
    ...postEntries,
  ];
};

export default sitemap;
