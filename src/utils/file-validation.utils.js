const imageSignatures = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]],
};

function startsWith(buffer, signature) {
  return signature.every((byte, index) => buffer[index] === byte);
}

// Confirms the uploaded image content matches the declared MIME type.
export function isValidImageBuffer(file) {
  if (file?.mimetype === "image/webp") {
    return startsWith(file.buffer, imageSignatures["image/webp"][0])
      && file.buffer.slice(8, 12).toString("ascii") === "WEBP";
  }

  const signatures = imageSignatures[file?.mimetype] || [];
  return signatures.some((signature) => startsWith(file.buffer, signature));
}
