import { CAPTION_FONT_FAMILY } from "@/lib/video/ffmpeg";
import type { CaptionCue } from "@/types/edit";

interface CaptionStyleSpec {
  fontSize: number;
  /** ASS colors are &HAABBGGRR. */
  primaryColour: string;
  backColour: string;
  bold: boolean;
  marginV: number;
}

const STYLE_SPECS: Record<"basic" | "dynamic", (dims: { width: number; height: number }) => CaptionStyleSpec> = {
  basic: (dims) => ({
    fontSize: Math.round(dims.height * 0.045),
    primaryColour: "&H00FFFFFF", // white
    backColour: "&H99000000", // semi-transparent black
    bold: false,
    marginV: Math.round(dims.height * 0.08),
  }),
  dynamic: (dims) => ({
    fontSize: Math.round(dims.height * 0.065),
    primaryColour: "&H00FFFFFF", // white
    backColour: "&HB0FF5C7C", // semi-transparent accent (BGR order for #7C5CFF)
    bold: true,
    marginV: Math.round(dims.height * 0.12),
  }),
};

function formatAssTime(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = Math.floor(clamped % 60);
  const cs = Math.round((clamped - Math.floor(clamped)) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function escapeAssText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\{/g, "\\{").replace(/\}/g, "\\}").replace(/\n/g, "\\N");
}

/** Builds an .ass subtitle file's contents for the given cues, ready to feed to ffmpeg's `subtitles` filter. */
export function generateAssSubtitle(
  cues: CaptionCue[],
  style: "basic" | "dynamic",
  dimensions: { width: number; height: number },
): string {
  const spec = STYLE_SPECS[style](dimensions);

  const header = [
    "[Script Info]",
    "ScriptType: v4.00+",
    `PlayResX: ${dimensions.width}`,
    `PlayResY: ${dimensions.height}`,
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: Default,${CAPTION_FONT_FAMILY},${spec.fontSize},${spec.primaryColour},&H000000FF,&H00000000,${spec.backColour},${spec.bold ? -1 : 0},0,0,0,100,100,0,0,3,0,0,2,40,40,${spec.marginV},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ].join("\n");

  const events = cues
    .map(
      (cue) =>
        `Dialogue: 0,${formatAssTime(cue.start)},${formatAssTime(cue.end)},Default,,0,0,0,,${escapeAssText(cue.text)}`,
    )
    .join("\n");

  return `${header}\n${events}\n`;
}
