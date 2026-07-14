import { MetadataRoute } from "next";

if (process.env.NEXT_PUBLIC_BASE_URL === undefined) {
  throw new Error("NEXT_PUBLIC_BASE_URL is not defined");
}

const baseUrl: string = process.env.NEXT_PUBLIC_BASE_URL;

const robots = (): MetadataRoute.Robots => ({
  host: baseUrl,
  rules: {
    allow: "/",
    userAgent: "*",
  },
  sitemap: `${baseUrl}/sitemap.xml`,
});

export default robots;
