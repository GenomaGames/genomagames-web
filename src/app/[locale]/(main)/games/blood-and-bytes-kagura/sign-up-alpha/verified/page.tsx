import { ParsedUrlQuery } from "node:querystring";

import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/src/i18n/navigation";

interface Params extends ParsedUrlQuery {
  locale: string;
}

interface Props {
  params: Promise<Params>;
}

export const generateMetadata = async ({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> => {
  const { locale } = await params;

  setRequestLocale(locale);

  const t = await getTranslations({
    locale,
    namespace: "AlphaVerifiedPage",
  });

  return {
    title: t("meta_title"),
    description: t("meta_description"),
    robots: { index: false },
  };
};

/**
 * Where Brevo redirects a contact right after they confirm their email from
 * the verification message: tells them they are on the alpha list.
 */
const AlphaVerifiedPage: React.JSXElementConstructor<Props> = async (
  props: Props,
) => {
  const { locale } = await props.params;

  setRequestLocale(locale);

  const t = await getTranslations({
    locale,
    namespace: "AlphaVerifiedPage",
  });

  return (
    <div className="container mx-auto mb-4 rounded-md bg-gray-800 break-words drop-shadow-xl">
      <div className="px-3 py-8 text-center sm:px-6 md:px-8">
        <h1 className="mb-4 text-2xl font-bold text-emerald-200 md:text-3xl lg:text-4xl">
          {t("title")}
        </h1>
        <p className="mb-8 text-slate-300">{t("message")}</p>
        <Link
          href="/games"
          className="inline-block rounded-md bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-500"
        >
          {t("back_to_games")}
        </Link>
      </div>
    </div>
  );
};

export default AlphaVerifiedPage;
