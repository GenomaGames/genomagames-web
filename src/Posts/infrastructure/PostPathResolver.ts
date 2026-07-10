import path from "node:path";

import { globbySync } from "globby";

import { Locale } from "@/src/lib/Locale";

/**
 * Convert a native path to POSIX separators.
 *
 * fast-glob, which backs globby, treats backslashes as escape characters
 * rather than separators, and it always returns matches with forward slashes.
 */
function toPosixPath(nativePath: string): string {
  return nativePath.split(path.sep).join("/");
}

export class PostPathResolver {
  private readonly postsDirectoryPath: string;

  constructor() {
    this.postsDirectoryPath = toPosixPath(
      path.join(process.cwd(), "public/posts"),
    );
  }

  public getPostsDirectoryPath(): string {
    return this.postsDirectoryPath;
  }

  /**
   * Generate a slug from a post's file path
   */
  public generatePostSlugFromPath(postPath: string): string {
    const slug: string = postPath
      .replace(`${this.postsDirectoryPath}/`, "")
      .replace(/\w*\//, "")
      .replace(/(?:\/index)?\.md$/, "");

    // console.log(`${postPath.replace(this.postsDirectoryPath, "")} -> ${slug}`);

    return slug;
  }

  /**
   * Resolve all post paths for a given locale
   */
  public resolvePostPaths(locale: Locale): string[] {
    const localizedPostsDirectoryPath: string = path.posix.join(
      this.postsDirectoryPath,
      locale,
    );

    const postPaths = globbySync("**/*.md", {
      absolute: true,
      cwd: localizedPostsDirectoryPath,
    });

    if (postPaths.length === 0) {
      console.warn(`No posts found in ${localizedPostsDirectoryPath}`);
    }

    return postPaths;
  }

  /**
   * Resolve a relative path to be correctly referenced from the web
   *
   * @param relativePath - The relative path from post's directory
   * @param basePath - The directory path to resolve against
   * @returns A web-accessible path
   */
  public resolveRelativePath(relativePath: string, basePath: string): string {
    if (path.isAbsolute(relativePath)) {
      return relativePath;
    }

    const directoryPath = path.dirname(basePath);

    return toPosixPath(path.resolve(directoryPath, relativePath)).replace(
      /.*\/public/,
      "",
    );
  }

  /**
   * Sort post paths in reverse chronological order (newest first)
   */
  public sortPostPaths(postPaths: string[]): string[] {
    return [...postPaths].sort((pathA, pathB) => (pathA > pathB ? -1 : 1));
  }

  /**
   * Get paginated post paths
   */
  public paginatePostPaths(
    postPaths: string[],
    page: number,
    postsPerPage: number,
  ): string[] {
    const sortedPaths = this.sortPostPaths(postPaths);

    return sortedPaths.slice((page - 1) * postsPerPage, page * postsPerPage);
  }
}
