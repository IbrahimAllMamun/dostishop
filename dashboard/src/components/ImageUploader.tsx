import { useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { uploadFile } from '@/lib/media';
import { MediaPicker } from '@/components/MediaPicker';

export function ImageUploader({
  value,
  onChange,
  multiple = true,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  multiple?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  /** Adding from the library must not duplicate what is already on the form. */
  function addFromLibrary(urls: string[]) {
    if (!multiple) {
      onChange(urls.slice(-1));
      return;
    }
    onChange([...value, ...urls.filter((u) => !value.includes(u))]);
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        urls.push(await uploadFile(file));
      }
      onChange(multiple ? [...value, ...urls] : urls.slice(-1));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {value.map((url, i) => (
          <div key={url + i} className="relative h-24 w-24 overflow-hidden rounded-lg ring-1 ring-ink/10">
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink/70 text-xs text-canvas"
              aria-label="Remove image"
            >
              ✕
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex h-24 w-24 flex-col items-center justify-center rounded-lg border-2 border-dashed border-ink/20 text-xs text-muted-foreground transition-[border-color,color,transform] duration-200 ease-out hover:border-primary hover:text-primary active:scale-95 disabled:opacity-50"
        >
          {busy ? 'Uploading…' : (
            <>
              <span className="text-2xl leading-none">+</span>
              <span>{multiple ? 'Add image' : 'Upload'}</span>
            </>
          )}
        </button>

        {/* The library is the cheaper path — no upload, no duplicate file */}
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-ink/20 text-xs text-muted-foreground transition-[border-color,color,transform] duration-200 ease-out hover:border-primary hover:text-primary active:scale-95"
        >
          <ImagePlus className="h-5 w-5" aria-hidden />
          <span>From library</span>
        </button>
      </div>

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={addFromLibrary}
        multiple={multiple}
        existing={value}
      />

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && <p className="text-sm text-sale">{error}</p>}
    </div>
  );
}
