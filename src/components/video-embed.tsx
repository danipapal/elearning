import { parseVideoUrl } from "@/lib/video";

export function VideoEmbed({ url, title }: { url: string; title: string }) {
  const video = parseVideoUrl(url);
  if (!video) return null;
  return (
    <div className="bg-muted relative aspect-video w-full overflow-hidden rounded-lg">
      <iframe
        src={video.embedUrl}
        title={title}
        className="absolute inset-0 size-full"
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        loading="lazy"
      />
    </div>
  );
}
