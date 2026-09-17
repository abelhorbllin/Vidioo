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
  serverExternalPackages: ["fluent-ffmpeg", "ffmpeg-static", "@ffprobe-installer/ffprobe"],
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
