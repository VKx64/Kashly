import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw, Share2, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pb } from "@/lib/pocketbase";
import { composeQrShareCard, cropQrFromFile, downloadImage } from "@/utils/qrShare";
import type { AccountRecord } from "@/types/finance";

export function QrShareModal({
  account,
  onClose,
  onSaved,
}: {
  account: AccountRecord | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}): React.ReactElement {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [markRemove, setMarkRemove] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track blob URLs we own so we can revoke them to avoid leaks
  const blobUrlRef = useRef<string | null>(null);

  const revokeBlob = (url: string | null) => {
    if (url && url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  };

  // Re-initialize when the opened account changes
  useEffect(() => {
    if (!account) return;
    // Revoke any previous blob
    revokeBlob(blobUrlRef.current);
    blobUrlRef.current = null;

    const src = account.qr ? pb.files.getURL(account, account.qr) : null;
    setPreviewUrl(src);
    setPendingFile(null);
    setFallback(false);
    setMarkRemove(false);
    setError("");
  }, [account?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Revoke blob on unmount
  useEffect(() => {
    return () => {
      revokeBlob(blobUrlRef.current);
    };
  }, []);

  const handleFileSelect = async (file: File) => {
    setProcessing(true);
    setError("");
    try {
      const { croppedFile, previewUrl: newUrl, fallback: isFallback } = await cropQrFromFile(file);
      revokeBlob(blobUrlRef.current);
      blobUrlRef.current = newUrl;
      setPreviewUrl(newUrl);
      setFallback(isFallback);
      setPendingFile(croppedFile);
      setMarkRemove(false);
    } catch {
      // Fall back to raw file if crop/detect fails
      const rawUrl = URL.createObjectURL(file);
      revokeBlob(blobUrlRef.current);
      blobUrlRef.current = rawUrl;
      setPreviewUrl(rawUrl);
      setFallback(true);
      setPendingFile(file);
      setMarkRemove(false);
    } finally {
      setProcessing(false);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void handleFileSelect(file);
  };

  const handleShare = async () => {
    if (!previewUrl || !account) return;
    const slug = account.name
      ? account.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
      : "wallet";
    const filename = `kashley-${slug}-qr.png`;
    try {
      const dataUrl = await composeQrShareCard(previewUrl, account.name);
      downloadImage(dataUrl, filename);
    } catch {
      downloadImage(previewUrl, filename);
    }
  };

  const handleRemove = () => {
    revokeBlob(blobUrlRef.current);
    blobUrlRef.current = null;
    setPreviewUrl(null);
    setPendingFile(null);
    setFallback(false);
    if (account?.qr) setMarkRemove(true);
  };

  const handleSave = async () => {
    if (!account) return;
    if (!pendingFile && !markRemove) {
      onClose();
      return;
    }
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      if (pendingFile) {
        fd.append("qr", pendingFile);
      } else {
        // markRemove: clear stored qr
        fd.append("qr", "");
      }
      await pb.collection("accounts").update(account.id, fd);
      await onSaved();
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save QR.");
    } finally {
      setSaving(false);
    }
  };

  const hasChange = Boolean(pendingFile) || markRemove;

  return (
    <AnimatePresence>
      {account && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.div
            className="w-[min(92vw,460px)] overflow-hidden rounded-[1.25rem] border border-white/10 bg-zinc-950 text-white shadow-2xl"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/10 p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Wallet</p>
                <h2 className="mt-1 text-xl font-semibold">{account.name} · Payment QR</h2>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Body */}
            <div className="space-y-4 p-5">
              {previewUrl ? (
                <>
                  {/* Large scannable QR tile */}
                  <div className="mx-auto w-full max-w-[280px] aspect-square rounded-xl bg-white p-4">
                    <img
                      src={previewUrl}
                      alt="QR code preview"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  {fallback && (
                    <p className="text-center text-xs text-zinc-500">No QR detected — using full image.</p>
                  )}
                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={processing}
                      className="flex flex-1 h-9 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-black/20 text-xs text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      {processing ? "Detecting..." : "Replace"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleShare()}
                      disabled={processing}
                      className="flex flex-1 h-9 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-black/20 text-xs text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Share card
                    </button>
                    <button
                      type="button"
                      onClick={handleRemove}
                      className="flex flex-1 h-9 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-black/20 text-xs text-rose-300 transition hover:bg-rose-400/10 hover:text-rose-200"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Empty dropzone */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={processing}
                    className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 bg-black/20 text-sm text-zinc-500 transition hover:border-white/30 hover:text-zinc-300 disabled:opacity-50"
                  >
                    <Upload className="h-5 w-5" />
                    {processing ? "Detecting QR..." : "Upload screenshot or QR"}
                  </button>
                  <p className="text-center text-xs text-zinc-600">We'll auto-crop to just the QR code.</p>
                </>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleInputChange}
              />

              {error && (
                <p className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-300">{error}</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 border-t border-white/10 p-5">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={() => void handleSave()}
                disabled={processing || saving || !hasChange}
                className="rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 disabled:opacity-40"
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
