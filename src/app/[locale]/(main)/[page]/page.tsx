import { ParsedUrlQuery } from "node:querystring";

import { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

import PostsList from "@/src/components/posts-list";
import { getPostsPagesUseCase } from "@/src/Posts/application/GetPostsPagesUseCase";
import { listPostsUseCase } from "@/src/Posts/application/ListPostsUseCase";

interface Params extends ParsedUrlQuery {
  locale: string;
  page: string;
}

interface Props {
  params: Promise<Params>;
}

// Without this, any path segment under a locale is taken for a page number and
// renders an empty listing: /en/whatever would answer 200 instead of 404.
export const dynamicParams = false;

export const generateStaticParams = async ({
  params: { locale },
}: {
  params: {
    locale: string;
  };
}): Promise<Params[]> => {
  const pages: number[] = await getPostsPagesUseCase.run({
    locale,
  });

  const staticParams: Params[] = pages.map((page) => {
    return {
      locale,
      page: page.toString(),
    };
  });

  return staticParams;
};

export const generateMetadata = async (props: { params: Promise<Params> }) => {
  const params = await props.params;

  const { page } = params;

  const currentPage: number = Number(page);

  const metadata: Metadata = {
    description: `Page ${currentPage} of game development posts for Genoma Games' blog.`,
    title: `Blog page ${currentPage}`,
  };

  const isFirstPage = currentPage === 1;

  if (isFirstPage) {
    metadata.other = {
      canonical: `${process.env.NEXT_PUBLIC_BASE_URL}`,
    };
  }

  return metadata;
};

const PaginatedPostsPage: React.JSXElementConstructor<Props> = async (
  props: Props,
) => {
  const { locale, page } = await props.params;

  const currentPage: number = Number(page);
  const nextPage: number = currentPage + 1;
  const previousPage: number = currentPage - 1;

  setRequestLocale(locale);

  const t = await getTranslations({
    locale: locale,
    namespace: "PaginatedPostsPage",
  });

  const { entities: posts, hasMore } = await listPostsUseCase.run({
    locale,
    page: currentPage,
  });

  const isSecondPage = currentPage === 2;
  const previousPagePath = isSecondPage
    ? `/${locale}`
    : `/${locale}/${previousPage}`;
  const nextPagePath = `/${locale}/${nextPage}`;

  return (
    <>
      <PostsList className="mx-auto max-w-sm sm:max-w-full" posts={posts} />
      <nav className="mx-auto flex max-w-sm gap-4 sm:max-w-full">
        {previousPage > 0 && (
          <Link
            className="mb-4 block h-10 flex-1 rounded-sm bg-emerald-600 text-center leading-10 font-bold text-slate-900 transition-colors ease-in-out hover:bg-emerald-400 focus:bg-emerald-400"
            href={previousPagePath}
            rel="prev"
          >
            {t("prev")}
          </Link>
        )}
        {hasMore && (
          <Link
            className="mb-4 block h-10 flex-1 rounded-sm bg-emerald-600 text-center leading-10 font-bold text-slate-900 transition-colors ease-in-out hover:bg-emerald-400 focus:bg-emerald-400"
            href={nextPagePath}
            rel="next"
          >
            {t("next")}
          </Link>
        )}
      </nav>
    </>
  );
};

export default PaginatedPostsPage;
