(function () {
  "use strict";

  const MAX_FILE_SIZE = 7 * 1024 * 1024;

  const ALLOWED_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif"
  ]);

  const ALLOWED_EXTENSIONS = new Set([
    "jpg",
    "jpeg",
    "png",
    "webp",
    "heic",
    "heif"
  ]);

  document.addEventListener("change", function (event) {
    const input = event.target;

    if (!(input instanceof HTMLInputElement)) return;
    if (input.type !== "file") return;

    const files = Array.from(input.files || []);

    const invalid = files.some(function (file) {
      const extension = file.name
        .split(".")
        .pop()
        .toLowerCase();

      return (
        !ALLOWED_EXTENSIONS.has(extension) ||
        !ALLOWED_TYPES.has(file.type) ||
        file.size > MAX_FILE_SIZE
      );
    });

    if (invalid) {
      input.value = "";

      alert(
        "Дозволені лише JPG, PNG, WEBP, HEIC та HEIF. Максимальний розмір одного файлу — 7 МБ."
      );
    }
  }, true);
})();
