import { useRef, useState, type DragEvent } from 'react';

export function UploadDropzone({ files, onFilesChange }: { files: File[]; onFilesChange: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function addFiles(list: FileList | null) {
    if (!list) return;
    onFilesChange([...files, ...Array.from(list)]);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }

  function removeFile(index: number) {
    onFilesChange(files.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`cursor-pointer rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragging ? 'border-clay bg-clay-soft' : 'border-border-strong hover:border-clay'
        }`}
      >
        <p className="text-sm text-ink">Drop photos or video here, or click to browse</p>
        <p className="mt-1 text-xs text-ink-muted">JPEG, PNG, WEBP, MP4, MOV, WEBM</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>
      {files.length > 0 && (
        <ul className="mt-3 space-y-1">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center justify-between rounded bg-black/5 px-3 py-1.5 text-sm text-ink"
            >
              <span className="truncate">{f.name}</span>
              <button type="button" onClick={() => removeFile(i)} className="ml-2 text-ink-muted hover:text-danger">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
