interface VideoPreviewProps {
  src: string;
  title?: string;
}

export function VideoPreview({ src, title }: VideoPreviewProps) {
  return (
    <div className="card overflow-hidden p-2">
      <video key={src} src={src} controls className="max-h-[70vh] w-full rounded-xl bg-black" />
      {title && <p className="px-2 pt-2 text-xs text-zinc-500">{title}</p>}
    </div>
  );
}
