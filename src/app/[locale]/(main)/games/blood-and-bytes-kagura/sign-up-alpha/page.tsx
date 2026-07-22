import { ParsedUrlQuery } from "node:querystring";

import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import AlphaSignUpForm from "@/src/components/alpha-sign-up-form";

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
    namespace: "AlphaSignUpPage",
  });

  return {
    title: t("meta_title"),
    description: t("meta_description"),
  };
};

const AlphaSignUpPage: React.JSXElementConstructor<Props> = async (
  props: Props,
) => {
  const { locale } = await props.params;

  setRequestLocale(locale);

  return (
    <div className="mb-8">
      <AlphaSignUpForm />
    </div>
  );
};

export default AlphaSignUpPage;
