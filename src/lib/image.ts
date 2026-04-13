export function dataUrlToBlob(dataUrl: string) {
  const [meta, base64] = dataUrl.split(",");
  if (!meta || !base64) {
    throw new Error("Invalid image payload.");
  }

  const mime = meta.match(/data:(.*?);base64/)?.[1] ?? "image/png";
  const bytes = atob(base64);
  const buffer = new Uint8Array(bytes.length);

  for (let i = 0; i < bytes.length; i += 1) {
    buffer[i] = bytes.charCodeAt(i);
  }

  return new Blob([buffer], { type: mime });
}
