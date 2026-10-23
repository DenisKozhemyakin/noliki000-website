(function () {
  "use strict";

  var hostname = location.hostname;
  var isPrivateHost = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname);
  var isLocal = location.protocol === "file:" || hostname === "localhost" || hostname === "127.0.0.1" || hostname === "terminal.local" || hostname === "[::1]" || isPrivateHost;

  function setupScrollReset() {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.addEventListener("pageshow", function () {
      requestAnimationFrame(function () {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      });
    });
  }

  function setupMenu() {
    var button = document.querySelector(".menu-button");
    var menu = document.querySelector(".mobile-menu");
    if (!button || !menu) return;

    var scrollPosition = 0;
    var pageSections = document.querySelectorAll("main, .footer");
    var icon = button.querySelector(".menu-icon");

    function closeMenu() {
      if (button.getAttribute("aria-expanded") !== "true") return;
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", "Відкрити меню");
      menu.setAttribute("aria-hidden", "true");
      menu.setAttribute("inert", "");
      menu.classList.remove("is-open");
      if (icon) icon.classList.remove("is-open");
      pageSections.forEach(function (section) { section.removeAttribute("inert"); });
      document.body.classList.remove("menu-locked");
      document.body.style.top = "";
      window.scrollTo({ top: scrollPosition, behavior: "instant" });
    }

    button.addEventListener("click", function () {
      if (button.getAttribute("aria-expanded") === "true") {
        closeMenu();
        return;
      }
      scrollPosition = Math.max(0, window.scrollY);
      document.body.style.top = -scrollPosition + "px";
      document.body.classList.add("menu-locked");
      pageSections.forEach(function (section) { section.setAttribute("inert", ""); });
      button.setAttribute("aria-expanded", "true");
      button.setAttribute("aria-label", "Закрити меню");
      menu.removeAttribute("inert");
      menu.setAttribute("aria-hidden", "false");
      menu.classList.add("is-open");
      if (icon) icon.classList.add("is-open");
    });

    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", function (event) {
      if (button.getAttribute("aria-expanded") !== "true") return;
      if (event.key === "Escape") {
        closeMenu();
        button.focus({ preventScroll: true });
      } else if (event.key === "Tab") {
        var links = menu.querySelectorAll("a[href], button:not(:disabled)");
        var last = links[links.length - 1] || button;
        if (event.shiftKey && document.activeElement === button) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          button.focus();
        }
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 820) closeMenu();
    });
  }

  function getCarouselState(carousel, cards) {
    var maximum = Math.max(0, carousel.scrollWidth - carousel.clientWidth);
    var position = Math.min(maximum, Math.max(0, carousel.scrollLeft));
    var styles = window.getComputedStyle(carousel);
    var gap = parseFloat(styles.columnGap || styles.gap) || 0;
    var step = cards.length ? cards[0].getBoundingClientRect().width + gap : 0;
    var index = step > 0 ? Math.min(cards.length - 1, Math.round(position / step)) : 0;
    // The last card can be fully visible before its left edge reaches the start.
    if (maximum > 1 && position >= maximum - 1) index = cards.length - 1;
    return {
      index: Math.max(0, index),
      step: step,
      canPrevious: position > 1,
      canNext: position < maximum - 1
    };
  }

  function setupReveal() {
    var elements = document.querySelectorAll("[data-reveal]");
    if (!("IntersectionObserver" in window)) {
      elements.forEach(function (element) { element.classList.add("is-visible"); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px" });

    elements.forEach(function (element) { observer.observe(element); });
  }

  function setupFilters() {
    var buttons = document.querySelectorAll("[data-filter]");
    var cards = Array.prototype.slice.call(document.querySelectorAll(".project-card[data-category]"));
    var carousel = document.getElementById("portfolio-carousel");
    var previous = document.getElementById("portfolio-prev");
    var next = document.getElementById("portfolio-next");
    var counter = document.getElementById("portfolio-counter");
    if (!buttons.length || !cards.length || !carousel || !previous || !next || !counter) return;

    var visibleCards = cards.slice();
    var animationFrame = null;

    function updateCounter() {
      var state = getCarouselState(carousel, visibleCards);
      counter.innerHTML = String(visibleCards.length ? state.index + 1 : 0).padStart(2, "0") + " <i></i> " + String(visibleCards.length).padStart(2, "0");
      previous.disabled = !state.canPrevious;
      next.disabled = !state.canNext;
    }

    function move(direction) {
      var state = getCarouselState(carousel, visibleCards);
      carousel.scrollBy({ left: direction * state.step, behavior: "smooth" });
    }

    previous.addEventListener("click", function () { move(-1); });
    next.addEventListener("click", function () { move(1); });
    carousel.addEventListener("scroll", function () {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(updateCounter);
    }, { passive: true });

    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        var filter = button.getAttribute("data-filter");
        buttons.forEach(function (item) {
          item.classList.remove("is-active");
          item.setAttribute("aria-pressed", "false");
        });
        button.classList.add("is-active");
        button.setAttribute("aria-pressed", "true");

        cards.forEach(function (card) {
          var show = filter === "all" ||
            (filter === "videos" && card.getAttribute("data-video") === "true") ||
            card.getAttribute("data-category") === filter;
          card.classList.toggle("is-hidden", !show);
          var video = card.querySelector("video");
          if (!show && video) video.pause();
        });
        visibleCards = cards.filter(function (card) { return !card.classList.contains("is-hidden"); });
        carousel.scrollTo({ left: 0, behavior: "instant" });
        updateCounter();
      });
    });

    window.addEventListener("resize", updateCounter);
    updateCounter();
  }

  function setupVideos() {
    var videos = document.querySelectorAll(".project-card video");
    var observer = "IntersectionObserver" in window ? new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) entry.target.pause();
      });
    }) : null;

    document.querySelectorAll(".project-card.has-video").forEach(function (card) {
      var video = card.querySelector("video");
      var playButton = card.querySelector(".video-play");
      if (!video || !playButton) return;

      playButton.addEventListener("click", function () {
        var playPromise = video.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(function () { card.classList.remove("is-playing"); });
        }
      });
      video.addEventListener("play", function () {
        videos.forEach(function (other) { if (other !== video) other.pause(); });
        card.classList.add("is-playing");
      });
      video.addEventListener("pause", function () { card.classList.remove("is-playing"); });
      video.addEventListener("ended", function () { card.classList.remove("is-playing"); });
      if (observer) observer.observe(video);
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) videos.forEach(function (video) { video.pause(); });
    });
  }

  function setupHeroVideo() {
    var video = document.querySelector("[data-hero-video]");
    if (!video || !video.querySelector("source")) return;
    var motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    var visible = false;

    function syncPlayback() {
      var saveData = navigator.connection && navigator.connection.saveData;
      if (!visible || document.hidden || motion.matches || saveData) {
        video.pause();
        return;
      }
      var playPromise = video.play();
      if (playPromise && typeof playPromise.catch === "function") playPromise.catch(function () {});
    }

    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        syncPlayback();
      }, { rootMargin: "120px 0px" });
      observer.observe(video);
    } else {
      visible = true;
      syncPlayback();
    }
    document.addEventListener("visibilitychange", syncPlayback);
    if (motion.addEventListener) motion.addEventListener("change", syncPlayback);
  }

  function setupChips() {
    document.querySelectorAll(".chips[data-input]").forEach(function (group) {
      var hiddenInput = document.getElementById(group.getAttribute("data-input"));
      group.querySelectorAll("button[data-value]").forEach(function (button) {
        button.addEventListener("click", function () {
          group.querySelectorAll("button").forEach(function (item) {
            item.classList.remove("is-active");
            item.setAttribute("aria-pressed", "false");
          });
          button.classList.add("is-active");
          button.setAttribute("aria-pressed", "true");
          if (hiddenInput) hiddenInput.value = button.getAttribute("data-value");
        });
      });
    });
  }

  function setupUploads() {
    var maxTotalSize = 7 * 1024 * 1024;
    var fields = [
      {
        input: document.getElementById("referenceFile"),
        label: document.getElementById("reference-upload-label"),
        defaultLabel: "＋ Додати готовий макет, ескіз або референс",
        extensions: ["jpg", "jpeg", "png", "webp", "heic", "heif", "pdf"]
      },
      {
        input: document.getElementById("wallPhoto"),
        label: document.getElementById("wall-upload-label"),
        defaultLabel: "Додати JPG, PNG, WEBP або HEIC",
        extensions: ["jpg", "jpeg", "png", "webp", "heic", "heif"]
      },
      {
        input: document.getElementById("paintWallPhoto"),
        label: document.getElementById("paint-wall-upload-label"),
        defaultLabel: "Додати JPG, PNG, WEBP або HEIC",
        extensions: ["jpg", "jpeg", "png", "webp", "heic", "heif"]
      }
    ].filter(function (field) { return field.input && field.label; });

    function fileExtension(file) {
      var parts = file.name.toLowerCase().split(".");
      return parts.length > 1 ? parts.pop() : "";
    }

    function totalSelectedSize(currentInput) {
      var currentForm = currentInput.closest("form");
      return fields.reduce(function (total, field) {
        if (field.input.closest("form") !== currentForm) return total;
        var file = field.input.files && field.input.files[0];
        return total + (file ? file.size : 0);
      }, 0);
    }

    function resetLabel(field) {
      field.input.removeAttribute("aria-invalid");
      field.label.classList.remove("is-error", "is-selected");
      field.label.textContent = field.defaultLabel;
    }

    fields.forEach(function (field) {
      field.input.addEventListener("change", function () {
        var file = field.input.files && field.input.files[0];
        resetLabel(field);

        if (!file) return;

        if (field.extensions.indexOf(fileExtension(file)) === -1) {
          field.input.value = "";
          field.input.setAttribute("aria-invalid", "true");
          field.label.classList.add("is-error");
          field.label.textContent = "Цей формат не підтримується. Оберіть інший файл.";
          return;
        }

        if (file.size > maxTotalSize || totalSelectedSize(field.input) > maxTotalSize) {
          field.input.value = "";
          field.input.setAttribute("aria-invalid", "true");
          field.label.classList.add("is-error");
          field.label.textContent = "Файли разом мають важити не більше 7 МБ.";
          return;
        }

        field.label.classList.add("is-selected");
        field.label.textContent = file.name + " · " + (file.size / 1024 / 1024).toFixed(1) + " МБ";
      });
    });
  }

  function setupReviews() {
    var carousel = document.getElementById("reviews-carousel");
    var cards = carousel ? Array.prototype.slice.call(carousel.querySelectorAll(".review-card")) : [];
    var counter = document.getElementById("reviews-counter");
    var previous = document.getElementById("reviews-prev");
    var next = document.getElementById("reviews-next");
    if (!carousel || !cards.length || !counter || !previous || !next) return;

    var animationFrame = null;

    function update() {
      var state = getCarouselState(carousel, cards);
      counter.innerHTML = String(state.index + 1).padStart(2, "0") + " <i></i> " + String(cards.length).padStart(2, "0");
      previous.disabled = !state.canPrevious;
      next.disabled = !state.canNext;
    }

    function move(direction) {
      var state = getCarouselState(carousel, cards);
      carousel.scrollBy({ left: direction * state.step, behavior: "smooth" });
    }

    previous.addEventListener("click", function () { move(-1); });
    next.addEventListener("click", function () { move(1); });
    carousel.addEventListener("scroll", function () {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(update);
    }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  function setupPhoneValidation() {
    document.querySelectorAll('input[name="phone"]').forEach(function (field) {
      function validate() {
        field.setCustomValidity("");
        if (field.validity.valueMissing) {
          field.setCustomValidity("Вкажіть номер телефону.");
        } else if (field.validity.patternMismatch) {
          field.setCustomValidity("Введіть телефон із 7–15 цифр. Наприклад, +380 67 000 00 00. Дозволені пробіли, дужки та дефіси.");
        }
      }
      field.addEventListener("input", validate);
      field.addEventListener("invalid", validate);
      field.addEventListener("blur", function () {
        field.value = field.value.trim();
        validate();
      });
    });
  }

  function setupForms() {
    var forms = Array.prototype.slice.call(document.querySelectorAll("[data-request-form]"));
    var viewOptions = Array.prototype.slice.call(document.querySelectorAll(".form-view-radio"));
    var triggers = Array.prototype.slice.call(document.querySelectorAll("[data-request-type], .project-link, .services-grid article > a"));
    var badge = document.getElementById("local-draft-badge");

    if (isLocal && badge) badge.classList.add("is-visible");
    if (!forms.length) return;

    function activateForm(type) {
      var option = viewOptions.find(function (item) { return item.value === type; });
      if (option) option.checked = true;
    }

    triggers.forEach(function (trigger) {
      trigger.addEventListener("click", function () {
        activateForm(trigger.getAttribute("data-request-type") || "mural");
      });
    });

    forms.forEach(function (form) {
      form.addEventListener("invalid", function () {
        form.classList.add("was-validated");
      }, true);

      form.addEventListener("submit", function (event) {
        var message = form.querySelector(".draft-form-message");
        form.classList.add("was-validated");
        if (!isLocal) return;
        event.preventDefault();
        if (message) {
          message.hidden = false;
          message.textContent = "Це локальна чернетка. Після завантаження цієї папки на Netlify заявка надсилатиметься через Netlify Forms.";
          message.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      });
    });

  }

  setupScrollReset();
  setupMenu();
  setupReveal();
  setupFilters();
  setupVideos();
  setupHeroVideo();
  setupChips();
  setupUploads();
  setupReviews();
  setupPhoneValidation();
  setupForms();
})();
