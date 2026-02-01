import fs from "node:fs";
import path from "node:path";
import { ParsedUrlQuery } from "node:querystring";

import { Metadata } from "next";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeExternalLinks from "rehype-external-links";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkEmoji from "remark-emoji";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import remarkSqueezeParagraphs from "remark-squeeze-paragraphs";
import remarkUnwrapImages from "remark-unwrap-images";
import { unified } from "unified";

import markdownStyles from "@/src/styles/markdown-styles.module.css";

interface Params extends ParsedUrlQuery {
  locale: string;
}

interface Props {
  params: Promise<Params>;
}

export const metadata: Metadata = {
  title: "Privacy Policy - Blood & Bytes: Kagura",
  description: "Blood & Bytes: Kagura's Privacy Policy",
};

async function getPrivacyPolicyContent(_locale: string) {
  const filePath = path.join(
    process.cwd(),
    "data/games/blood-and-bytes-kagura/privacy-policy.md",
  );

  try {
    const content = fs.readFileSync(filePath, "utf8");

    const processedContent = await unified()
      .use(remarkParse)
      .use(remarkSqueezeParagraphs)
      .use(remarkEmoji)
      .use(remarkGfm)
      .use(remarkUnwrapImages)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeExternalLinks)
      .use(rehypeSlug)
      .use(rehypeAutolinkHeadings)
      .use(rehypePrettyCode, {
        keepBackground: false,
        theme: JSON.parse(
          fs.readFileSync(
            path.join(process.cwd(), "src/CodeThemes/moonlight-ii.json"),
            "utf-8",
          ),
        ),
      })
      .use(rehypeRaw)
      .use(rehypeStringify)
      .process(content);

    return processedContent.toString();
  } catch (error) {
    console.error("Error reading or processing privacy policy file:", error);

    return "<p>Privacy policy content could not be loaded.</p>";
  }
}

const PrivacyPolicyPage = async (props: Props) => {
  const params = await props.params;
  const content = await getPrivacyPolicyContent(params.locale);

  return (
    <div className={markdownStyles["markdown"]}>
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
};

export default PrivacyPolicyPage;
