import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Video files can be large; raise the body size limit for server actions
  // that may handle metadata, while actual uploads stream through the API route.
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // These packages ship native binaries / dynamic requires that webpack
  // can't statically bundle - keep them as real Node.js requires at runtime.
  // @remotion/bundler and @remotion/renderer spawn a headless browser and
  // read files off disk in ways webpack can't statically analyze either.
  serverExternalPackages: [
    "fluent-ffmpeg",
    "ffmpeg-static",
    "@ffprobe-installer/ffprobe",
    "@remotion/bundler",
    "@remotion/renderer",
  ],
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
