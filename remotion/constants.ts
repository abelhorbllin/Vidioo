/**
 * Plain, framework-free constants shared between the Remotion project
 * (Root.tsx, bundled via @remotion/bundler) and the Next.js server code that
 * drives it (lib/video/remotion.ts). This file must NEVER import from
 * "remotion" or React - lib/video/remotion.ts imports it as a normal value
 * import, and pulling any React/Remotion component code into that import
 * chain breaks Next's server bundle (Remotion's components assume a full
 * client React runtime, which Next's server/RSC React build doesn't provide).
 */
export const MAIN_COMPOSITION_ID = "MainVideo";
