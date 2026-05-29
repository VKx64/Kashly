import jsQR from "jsqr";

// Detects a QR code in `file`, crops to its bounding box (+ padding), and
// returns the cropped image as a File. Falls back to the original file if no
// QR is found, and sets the `fallback` flag in the returned value.
export async function cropQrFromFile(
  file: File,
): Promise<{ croppedFile: File; previewUrl: string; fallback: boolean }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Canvas context unavailable"));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);

      const result = jsQR(imageData.data, imageData.width, imageData.height);

      if (!result) {
        // No QR found — use original file as-is
        const previewUrl = URL.createObjectURL(file);
        resolve({ croppedFile: file, previewUrl, fallback: true });
        return;
      }

      // Compute axis-aligned bounding box from the four corner points
      const { topLeftCorner, topRightCorner, bottomLeftCorner, bottomRightCorner } = result.location;
      const xs = [topLeftCorner.x, topRightCorner.x, bottomLeftCorner.x, bottomRightCorner.x];
      const ys = [topLeftCorner.y, topRightCorner.y, bottomLeftCorner.y, bottomRightCorner.y];
      const pad = 16; // px padding around the detected QR region
      const x0 = Math.max(0, Math.min(...xs) - pad);
      const y0 = Math.max(0, Math.min(...ys) - pad);
      const x1 = Math.min(canvas.width, Math.max(...xs) + pad);
      const y1 = Math.min(canvas.height, Math.max(...ys) + pad);
      const cropW = x1 - x0;
      const cropH = y1 - y0;

      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = cropW;
      cropCanvas.height = cropH;
      const cropCtx = cropCanvas.getContext("2d");
      if (!cropCtx) {
        reject(new Error("Crop canvas context unavailable"));
        return;
      }
      cropCtx.drawImage(canvas, x0, y0, cropW, cropH, 0, 0, cropW, cropH);

      cropCanvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Could not export cropped canvas to blob"));
          return;
        }
        const croppedFile = new File([blob], "qr.png", { type: "image/png" });
        const previewUrl = URL.createObjectURL(croppedFile);
        resolve({ croppedFile, previewUrl, fallback: false });
      }, "image/png");
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not load image"));
    };

    img.src = objectUrl;
  });
}

// Draws a rounded rectangle, falling back to a normal rect if roundRect is unavailable.
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

// Composes a branded kashley share card PNG containing the given QR image.
// qrSrc may be a blob: URL (local, always safe) or a remote pb.files URL.
// Returns a PNG data URL. Throws if the image can't be loaded or the canvas is tainted.
export async function composeQrShareCard(qrSrc: string, accountName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const W = 1080;
    const H = 1350;

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context unavailable"));
        return;
      }

      // --- Background ---
      ctx.fillStyle = "#09090b"; // zinc-950
      ctx.fillRect(0, 0, W, H);

      // --- Subtle grid texture overlay ---
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 1;
      for (let gx = 0; gx < W; gx += 60) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, H);
        ctx.stroke();
      }
      for (let gy = 0; gy < H; gy += 60) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(W, gy);
        ctx.stroke();
      }

      // --- Wordmark ---
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 72px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("kashley", W / 2, 160);

      // --- Tagline ---
      ctx.fillStyle = "#a1a1aa"; // zinc-400
      ctx.font = "32px system-ui, -apple-system, sans-serif";
      ctx.fillText("Personal finance, simplified.", W / 2, 220);

      // --- White QR panel ---
      const panelSize = 680;
      const panelX = (W - panelSize) / 2;
      const panelY = 310;
      const panelRadius = 48;

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      drawRoundedRect(ctx, panelX, panelY, panelSize, panelSize, panelRadius);
      ctx.fill();

      // --- QR image inside panel (with padding) ---
      const qrPad = 48;
      const qrX = panelX + qrPad;
      const qrY = panelY + qrPad;
      const qrSize = panelSize - qrPad * 2;
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

      // --- Account name caption ---
      const name = accountName.trim();
      if (name) {
        ctx.fillStyle = "#e4e4e7"; // zinc-200
        ctx.font = "bold 44px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(name, W / 2, panelY + panelSize + 72);
      }

      // --- "Scan to pay" sub-caption ---
      ctx.fillStyle = "#71717a"; // zinc-500
      ctx.font = "32px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Scan to pay", W / 2, panelY + panelSize + (name ? 124 : 80));

      // --- Divider line ---
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(180, H - 130);
      ctx.lineTo(W - 180, H - 130);
      ctx.stroke();

      // --- Footer ---
      ctx.fillStyle = "#52525b"; // zinc-600
      ctx.font = "28px system-ui, -apple-system, sans-serif";
      ctx.fillText("Get kashley", W / 2, H - 80);

      // Export as data URL — will throw SecurityError if canvas is tainted
      try {
        const dataUrl = canvas.toDataURL("image/png");
        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      reject(new Error("Could not load QR image"));
    };

    img.src = qrSrc;
  });
}

// Triggers a browser download of a data URL (or any URL) as `filename`.
export function downloadImage(url: string, filename: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
