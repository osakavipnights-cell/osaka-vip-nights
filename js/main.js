const supportedLanguages = ["en", "ja", "zh", "ko"];
const languageMeta = {
  en: { htmlLang: "en" },
  ja: { htmlLang: "ja" },
  zh: { htmlLang: "zh-CN" },
  ko: { htmlLang: "ko" }
};

const storageKey = "osakaGuideLanguage";
let currentTranslations = {};
let currentLanguage = "en";

function getNestedValue(source, path) {
  return path.split(".").reduce((value, key) => {
    if (value && Object.prototype.hasOwnProperty.call(value, key)) {
      return value[key];
    }
    return undefined;
  }, source);
}

function getSavedLanguage() {
  try {
    const saved = localStorage.getItem(storageKey);
    return supportedLanguages.includes(saved) ? saved : "en";
  } catch (error) {
    return "en";
  }
}

function saveLanguage(lang) {
  try {
    localStorage.setItem(storageKey, lang);
  } catch (error) {
    console.warn("Language preference could not be saved.", error);
  }
}

async function loadTranslations(lang) {
  const response = await fetch(`locales/${lang}.json`, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Could not load locales/${lang}.json`);
  }
  return response.json();
}

function applyTranslations(translations) {
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const value = getNestedValue(translations, element.dataset.i18n);
    if (typeof value === "string") {
      element.textContent = value;
    }
  });

  document.querySelectorAll("[data-i18n-attr]").forEach((element) => {
    const bindings = element.dataset.i18nAttr.split(",");
    bindings.forEach((binding) => {
      const [attribute, key] = binding.split(":").map((item) => item.trim());
      const value = getNestedValue(translations, key);
      if (attribute && typeof value === "string") {
        element.setAttribute(attribute, value);
      }
    });
  });

  const pageTitle = getNestedValue(translations, "meta.title");
  const pageDescription = getNestedValue(translations, "meta.description");
  if (pageTitle) {
    document.title = pageTitle;
  }
  if (pageDescription) {
    const descriptionMeta = document.querySelector('meta[name="description"]');
    if (descriptionMeta) {
      descriptionMeta.setAttribute("content", pageDescription);
    }
  }
}

async function setLanguage(lang) {
  const nextLanguage = supportedLanguages.includes(lang) ? lang : "en";

  try {
    currentTranslations = await loadTranslations(nextLanguage);
    currentLanguage = nextLanguage;
  } catch (error) {
    console.error(error);
    if (nextLanguage !== "en") {
      await setLanguage("en");
    }
    return;
  }

  applyTranslations(currentTranslations);
  document.documentElement.lang = languageMeta[currentLanguage].htmlLang;
  saveLanguage(currentLanguage);

  document.querySelectorAll("[data-lang]").forEach((button) => {
    const isActive = button.dataset.lang === currentLanguage;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  updateMenuButtonLabel();
}

function updateMenuButtonLabel() {
  const navToggle = document.querySelector(".nav-toggle");
  if (!navToggle) {
    return;
  }

  const isOpen = navToggle.getAttribute("aria-expanded") === "true";
  const key = isOpen ? "nav.closeMenu" : "nav.openMenu";
  const label = getNestedValue(currentTranslations, key);
  if (label) {
    navToggle.setAttribute("aria-label", label);
  }
}

function setMenuOpen(isOpen) {
  const navToggle = document.querySelector(".nav-toggle");
  const siteNav = document.querySelector(".site-nav");
  if (!navToggle || !siteNav) {
    return;
  }

  navToggle.classList.toggle("is-open", isOpen);
  siteNav.classList.toggle("is-open", isOpen);
  document.body.classList.toggle("nav-open", isOpen);
  navToggle.setAttribute("aria-expanded", String(isOpen));
  updateMenuButtonLabel();
}

function initNavigation() {
  const navToggle = document.querySelector(".nav-toggle");
  const siteHeader = document.querySelector(".site-header");

  if (navToggle) {
    navToggle.addEventListener("click", () => {
      const isOpen = navToggle.getAttribute("aria-expanded") === "true";
      setMenuOpen(!isOpen);
    });
  }

  document.querySelectorAll("[data-scroll]").forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");
      if (!href || !href.startsWith("#")) {
        return;
      }

      const target = document.querySelector(href);
      if (!target) {
        return;
      }

      event.preventDefault();
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start"
      });
      history.pushState(null, "", href);
      setMenuOpen(false);
    });
  });

  document.addEventListener("click", (event) => {
    if (!siteHeader || siteHeader.contains(event.target)) {
      return;
    }
    setMenuOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setMenuOpen(false);
    }
  });
}

function initLanguageSwitcher() {
  document.querySelectorAll("[data-lang]").forEach((button) => {
    button.addEventListener("click", () => {
      setLanguage(button.dataset.lang);
      setMenuOpen(false);
    });
  });
}

function initFaq() {
  document.querySelectorAll(".faq-question").forEach((button) => {
    button.addEventListener("click", () => {
      const answerId = button.getAttribute("aria-controls");
      const answer = answerId ? document.getElementById(answerId) : null;
      const isOpen = button.getAttribute("aria-expanded") === "true";

      button.setAttribute("aria-expanded", String(!isOpen));
      const icon = button.querySelector(".faq-icon");
      if (icon) {
        icon.textContent = isOpen ? "+" : "-";
      }
      if (answer) {
        answer.hidden = isOpen;
      }
    });
  });
}

function initRevealAnimation() {
  const elements = document.querySelectorAll(".reveal");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14 }
  );

  elements.forEach((element) => observer.observe(element));
}

function initYear() {
  const year = document.querySelector("[data-year]");
  if (year) {
    year.textContent = new Date().getFullYear();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initLanguageSwitcher();
  initFaq();
  initRevealAnimation();
  initYear();
  setLanguage(getSavedLanguage());
});
