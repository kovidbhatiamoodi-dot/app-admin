// Presentational event-image field. Pure UI only — no validation, no
// compression, no Cloudinary calls. The parent (Events.jsx) owns the File,
// preview URL, and error state and performs validate -> compress -> upload.

export default function EventImageField({
  previewUrl,
  fieldError,
  disabled,
  onSelect,
  onRemove,
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs text-slate-400 flex flex-col gap-1">
        Event image (optional)
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) onSelect(file);
          }}
          className="bg-white/[0.06] border border-white/10 text-slate-300 rounded-xl px-4 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:text-white hover:file:bg-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500/60 disabled:opacity-50"
        />
      </label>
      <p className="text-[11px] text-slate-600">JPG, PNG, or WebP · validated &amp; resized in-browser before upload</p>

      {previewUrl && (
        <div className="flex items-start gap-3">
          <img
            src={previewUrl}
            alt="Selected event preview"
            className="h-20 w-32 rounded-xl border border-white/10 object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/10 text-slate-300 hover:bg-white/[0.1] disabled:opacity-40"
          >
            Remove
          </button>
        </div>
      )}

      {fieldError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-2.5 text-sm">
          {fieldError}
        </div>
      )}
    </div>
  );
}
