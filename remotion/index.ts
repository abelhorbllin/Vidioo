import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

/**
 * Entry point bundled by @remotion/bundler (see lib/video/remotion.ts).
 * This is the only file passed as `entryPoint` to bundle() - it is not part
 * of the Next.js app bundle and has no HTTP route pointing at it.
 */
registerRoot(RemotionRoot);
