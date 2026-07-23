import { VideoPlaceholder } from './VideoPlaceholder';

/**
 * Renders an admin-set intro video as a 16:9 embed. When `embedUrl` is set (a
 * ready player URL derived server-side — Vimeo/Drive/YouTube), it drops it into a
 * plain iframe, mirroring the study-material player. When it's null, it falls back
 * to the styled `VideoPlaceholder`. Provider is deliberately never surfaced.
 */
export function HubVideoEmbed({
  embedUrl,
  title,
  subtitle,
  eyebrow = 'Intro video',
  accent = '#f5b400',
  className = '',
}: {
  embedUrl?: string | null;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  accent?: string;
  className?: string;
}) {
  if (!embedUrl) {
    return (
      <VideoPlaceholder
        title={title}
        subtitle={subtitle}
        eyebrow={eyebrow}
        accent={accent}
        className={className}
      />
    );
  }
  return (
    <div
      className={`relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black ${className}`}
    >
      <iframe
        src={embedUrl}
        className="absolute inset-0 size-full"
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        allowFullScreen
        title={title}
      />
    </div>
  );
}
