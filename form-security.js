(function () {
  "use strict";

  const MIN_FILL_TIME = 3000;
  const MAX_TOTAL_FILE_SIZE = 7 * 1024 * 1024;

  const formStartTimes = new WeakMap();
  const submittingForms = new WeakSet();

  function isLocalEnvironment() {
    const hostname = window.location.hostname;

    return (
      window.location.protocol === "file:" ||
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "terminal.local" ||
      hostname === "[::1]" ||
      /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname)
    );
  }

  function initializeForm(form) {
    if (!formStartTimes.has(form)) {
      formStartTimes.set(form, Date.now());
    }
  }

  function validateFiles(form) {
    let totalSize = 0;

    const inputs = form.querySelectorAll('input[type="file"]');

    for (const input of inputs) {
      for (const file of input.files || []) {
        totalSize += file.size;
      }
    }

    if (totalSize > MAX_TOTAL_FILE_SIZE) {
      alert("Загальний розмір файлів не повинен перевищувати 7 МБ.");
      return false;
    }

    return true;
  }

  function validateHoneypot(form) {
    const field = form.querySelector('[name="bot-field"]');

    return !field || field.value.trim() === "";
  }

  function initializeAllForms() {
    document
      .querySelectorAll("form[data-request-form]")
      .forEach(initializeForm);
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeAllForms
    );
  } else {
    initializeAllForms();
  }

  document.addEventListener(
    "submit",
    function (event) {
      const form = event.target;

      if (!(form instanceof HTMLFormElement)) return;
      if (!form.matches("[data-request-form]")) return;

      initializeForm(form);

      // Захист від повторного надсилання
      if (submittingForms.has(form)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      // Захист від надто швидкого заповнення
      const elapsed = Date.now() - formStartTimes.get(form);

      if (elapsed < MIN_FILL_TIME) {
        event.preventDefault();
        event.stopImmediatePropagation();

        alert("Зачекайте кілька секунд перед надсиланням заявки.");
        return;
      }

      // Honeypot
      if (!validateHoneypot(form)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      // Перевірка обов'язкових полів
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopImmediatePropagation();

        form.reportValidity();
        return;
      }

      // Перевірка розміру файлів
      if (!validateFiles(form)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      // У локальному режимі script.js показує чернетку.
      // Тому блокування повторного надсилання не потрібне.
      if (isLocalEnvironment()) {
        return;
      }

      // Блокуємо дублікати тільки під час реального надсилання.
      submittingForms.add(form);

      // Якщо браузер повернув сторінку з кешу,
      // дозволяємо нову спробу.
    },
    true
  );

  window.addEventListener("pageshow", function () {
    document
      .querySelectorAll("form[data-request-form]")
      .forEach(function (form) {
        submittingForms.delete(form);
      });
  });
})();