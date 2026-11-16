/** @type {import('next').NextConfig} */
const isGitHubPages = process.env.GITHUB_ACTIONS === "true";
const nextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: isGitHubPages ? "/CLIPFORGE-AI" : "",
  assetPrefix: isGitHubPages ? "/CLIPFORGE-AI/" : undefined,
  images: { unoptimized: true },
};
export default nextConfig;
