import "./global.css";

import { ParsedUrlQuery } from "node:querystring";

import { config } from "@fortawesome/fontawesome-svg-core";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { routing } from "@/src/i18n/routing";

config.autoAddCss = false;

interface Params extends ParsedUrlQuery {
  locale: string;
}

interface Props extends React.PropsWithChildren {
  params: Promise<Params>;
}

export const metadata = {
  title: `Genoma Games Landing`,
};

// An unknown locale is a 404, not a page rendered on demand.
export const dynamicParams = false;

export const generateStaticParams = async (): Promise<Params[]> => {
  const staticParams: Params[] = routing.locales.map((locale) => ({ locale }));

  return staticParams;
};

const LandingLayout: React.JSXElementConstructor<Props> = async (
  props: Props,
) => {
  const params = await props.params;

  const { locale } = params;

  const { children } = props;

  setRequestLocale(locale);

  return (
    <html lang={locale} className="min-h-screen text-base text-slate-200">
      <body className="min-h-screen">
        <NextIntlClientProvider>
          <div id="top"></div>
          <div className="flex min-h-screen flex-col">
            <div>{children}</div>
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default LandingLayout;
