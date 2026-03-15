/** @type {import('next').NextConfig} */
// Set basePath for subdirectory deployment
// Example: NEXT_PUBLIC_BASE_PATH=/games/flauschipauschi npm run build
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  reactStrictMode: true,
  pageExtensions: ["ts", "tsx"],
  output: "export",
  basePath: basePath,
};

export default nextConfig;
