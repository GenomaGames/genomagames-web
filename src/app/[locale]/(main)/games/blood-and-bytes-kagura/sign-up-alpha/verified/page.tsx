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
    <div className="mb-8 text-center">
      <h1 className="mb-4 text-2xl font-bold md:text-3xl lg:text-4xl">
        {t("title")}
      </h1>
      <p className="mx-auto mb-8 max-w-xl">{t("message")}</p>
      <Link
        href="/games"
        className="inline-block rounded bg-purple-700 px-6 py-3 font-semibold text-white hover:bg-purple-600"
      >
        {t("back_to_games")}
      </Link>
    </div>
  );
};

export default AlphaVerifiedPage;
