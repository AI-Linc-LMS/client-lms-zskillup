'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadAdminImage } from '@/lib/api/media';
import type { MediaUploadPurpose } from '@/shared/dto/media.dto';

/**
 * Reusable admin image uploader: pick a file from the device, upload it straight
 * to S3 via a short-lived presigned URL, and store the returned public URL. Shows
 * a preview with a remove button, and keeps a "paste a URL" fallback so an admin
 * can still use an external image (or when S3 isn't configured). Used for
 * live-session covers, blog covers and speaker photos.
 */
export function ImageUpload({
  value,
  onChange,
  purpose,
  previewClassName,
  urlPlaceholder = '…or paste an image URL',
  allowUrl = true,
}: {
  value: string;
  onChange: (url: string) => void;
  purpose: MediaUploadPurpose;
  previewClassName?: string;
  urlPlaceholder?: string;
  allowUrl?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      onChange(await uploadAdminImage(file, purpose));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload the image.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {value ? (
        <div className={cn('relative overflow-hidden rounded-lg border border-slate-200', previewClassName)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Preview" className="h-32 w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 top-2 rounded-full bg-slate-900/60 p-1 text-white transition-colors hover:bg-slate-900/80"
            aria-label="Remove image"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-navy transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
          {value ? 'Replace image' : 'Upload image'}
        </button>
        <span className="text-xs text-slate-400">JPG / PNG / WebP · max 5 MB</span>
      </div>

      {allowUrl ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={1000}
          placeholder={urlPlaceholder}
          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
        />
      ) : null}

      {error ? (
        <p className="rounded-md bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 ring-1 ring-red-200" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
