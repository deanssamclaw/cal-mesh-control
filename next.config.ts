import type { NextConfig } from "next";

// cacheComponents stays OFF on purpose. Under it, Vercel's serverless instances may drop
// runtime cache entries between requests; the previous model (route `revalidate` + the fetch
// cache) is the one documented to keep serving the last good page when a refresh throws, and
// that is the whole availability story here: rflab goes down, this page does not.
const nextConfig: NextConfig = {};

export default nextConfig;
