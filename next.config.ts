import { withBotId } from "botid/next/config";
import { NextConfig } from "next";
import NextIntlPlugin from "next-intl/plugin";

const withNextIntl = NextIntlPlugin();

const BASE_URL_DEFAULT = "http://localhost:3000";
const BASE_URL =
  process.env.NODE_ENV !== "production"
    ? BASE_URL_DEFAULT
    : (process.env.BASE_URL ?? BASE_URL_DEFAULT);

const nextConfig: NextConfig = () => {
  const plugins = [withNextIntl];

  const baseConfig: NextConfig = {
    env: {
      BASE_URL: BASE_URL,
    },
    images: {
      unoptimized: true,
    },
    reactStrictMode: true,
    webpack: (config, _context) => {
      return config;
    },
  };

  return plugins.reduce((result, plugin) => plugin(result), baseConfig);
};

export default withBotId(nextConfig);
