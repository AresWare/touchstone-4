"use strict";

// One catalog array of objects drives filtering, saved labels, and contact-page interests.
const products = [
  { id: "sourdough", name: "Signature Sourdough Loaf", category: "bread" },
  { id: "artisan", name: "Artisan Bread Selection", category: "bread" },
  { id: "pastries", name: "Pastry Counter", category: "pastries" },
  { id: "seasonal", name: "Seasonal Specialties", category: "seasonal" }
];
const categories = ["all", "bread", "pastries", "seasonal", "favorites"];
const STORAGE_KEY = "northStarBakery.preferences.v1";
// favoriteIds is a second array; preferences is the current, validated state object.
let preferences = { favoriteIds: [], category: "all" };
let storageAvailable = true;
let storageMessage = "";

function loadPreferences() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      storageMessage = "Your favorites and filter will be saved in this browser.";
      return;
    }
    const saved = JSON.parse(raw);
    if (!saved || !Array.isArray(saved.favoriteIds) || !categories.includes(saved.category)) {
      throw new Error("Invalid saved preferences");
    }
    preferences = {
      favoriteIds: [...new Set(saved.favoriteIds.filter(id => products.some(product => product.id === id)))],
      category: saved.category
    };
    storageMessage = `Restored ${preferences.favoriteIds.length} saved favorite(s) and your product filter from this browser.`;
  } catch (error) {
    // Malformed data must not crash the page. A later action can overwrite it.
    storageAvailable = !(error.name === "SecurityError" || error.name === "QuotaExceededError");
    storageMessage = storageAvailable
      ? "Saved preferences could not be read. Starting with an empty list; save a product to start again."
      : "Browser storage is unavailable. Changes work on this page but may not survive a refresh.";
  }
}

function savePreferences() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    storageAvailable = true;
    storageMessage = "Saved in this browser. Your favorites and filter will return on your next visit.";
  } catch (error) {
    storageAvailable = false;
    storageMessage = "Browser storage is unavailable. Changes work on this page but will not be remembered.";
  }
}

function getFavorites() {
  return products.filter(product => preferences.favoriteIds.includes(product.id));
}

function renderFavorites() {
  const list = document.getElementById("favorites-list");
  if (!list) return;
  list.replaceChildren();
  getFavorites().forEach(product => {
    const item = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = product.name;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "button-secondary";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", `Remove ${product.name} from favorites`);
    remove.addEventListener("click", () => {
      toggleFavorite(product.id);
      // The clicked list button is removed; keep keyboard focus at the feature.
      document.getElementById("product-filter").focus();
    });
    item.append(name, remove);
    list.append(item);
  });
  document.getElementById("favorite-count").textContent = `(${preferences.favoriteIds.length})`;
  document.getElementById("favorites-empty").hidden = preferences.favoriteIds.length > 0;
  document.getElementById("clear-favorites").disabled = preferences.favoriteIds.length === 0;
  document.getElementById("storage-status").textContent = storageMessage;
  document.querySelectorAll("[data-save]").forEach(button => {
    const selected = preferences.favoriteIds.includes(button.dataset.save);
    const product = products.find(item => item.id === button.dataset.save);
    button.setAttribute("aria-pressed", String(selected));
    button.textContent = selected ? "Saved to favorites" : "Save to favorites";
    button.setAttribute("aria-label", `${selected ? "Unsave" : "Save"} ${product.name}`);
  });
}

function filterProducts() {
  let visible = 0;
  document.querySelectorAll("[data-product]").forEach(card => {
    const product = products.find(item => item.id === card.dataset.product);
    const show = preferences.category === "all"
      || product.category === preferences.category
      || (preferences.category === "favorites" && preferences.favoriteIds.includes(product.id));
    card.hidden = !show;
    if (show) visible += 1;
  });
  const row = document.querySelector(".product-list");
  row.hidden = !Array.from(row.children).some(card => !card.hidden);
  document.getElementById("product-count").textContent = `${visible} of ${products.length} products shown`;
  document.getElementById("filter-empty").hidden = visible !== 0;
}

function toggleFavorite(id) {
  if (!products.some(product => product.id === id)) return;
  preferences.favoriteIds = preferences.favoriteIds.includes(id)
    ? preferences.favoriteIds.filter(savedId => savedId !== id)
    : [...preferences.favoriteIds, id];
  savePreferences();
  renderFavorites();
  filterProducts();
}

function initProducts() {
  const feature = document.getElementById("favorites-feature");
  if (!feature) return;
  feature.hidden = false;
  const filter = document.getElementById("product-filter");
  filter.value = preferences.category;
  filter.addEventListener("change", () => {
    preferences.category = filter.value;
    savePreferences();
    filterProducts();
    renderFavorites();
  });
  document.querySelectorAll("[data-save]").forEach(button => {
    button.hidden = false;
    button.addEventListener("click", () => {
      toggleFavorite(button.dataset.save);
      if (button.closest("[data-product]").hidden) filter.focus();
    });
  });
  document.getElementById("clear-favorites").addEventListener("click", () => {
    preferences.favoriteIds = [];
    savePreferences();
    renderFavorites();
    filterProducts();
    filter.focus();
  });
  renderFavorites();
  filterProducts();
}

function renderContactFavorites() {
  const panel = document.getElementById("saved-interests");
  if (!panel) return;
  panel.hidden = false;
  const favorites = getFavorites();
  document.getElementById("contact-favorites").textContent = favorites.length
    ? favorites.map(product => product.name).join(" • ")
    : "No saved products yet. Visit Products to make a list before writing your inquiry.";
  document.getElementById("contact-storage-status").textContent = storageAvailable
    ? "Loaded from this browser. Favorites are not an order, and your contact details are never stored."
    : storageMessage;
}

// Separate validator functions return an error message, or an empty string.
function requiredName(value) {
  return value.trim() ? "" : "Please enter your name.";
}
function validateEmail(value) {
  if (!value.trim()) return "Please enter your email address.";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
    ? "" : "Enter a valid email address, such as you@example.com.";
}
function validatePhone(value, form) {
  if (!value.trim()) {
    return form.elements.contactMethod.value === "phone"
      ? "Enter a phone number when Phone is your preferred contact method." : "";
  }
  return /^\d{3}-\d{3}-\d{4}$/.test(value.trim())
    ? "" : "Use the phone format 860-555-0142.";
}
function validateQuantity(value) {
  if (value === "") return "";
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 100
    ? "" : "Enter a whole number from 1 to 100, or leave blank.";
}
function validateMessage(value) {
  return value.trim().length >= 10 ? "" : "Please enter at least 10 characters for your message.";
}
// A rules object keeps field IDs and validators together instead of a long submit handler.
const validationRules = {
  firstName: requiredName,
  lastName: requiredName,
  email: validateEmail,
  phone: validatePhone,
  subject: value => value ? "" : "Please choose a subject.",
  quantity: validateQuantity,
  message: validateMessage
};

function validateField(form, id) {
  const input = form.elements[id];
  const message = id === "quantity" && input.validity.badInput
    ? "Enter a whole number from 1 to 100, or leave blank."
    : validationRules[id](input.value, form);
  const error = document.getElementById(`${id}-error`);
  error.textContent = message;
  error.hidden = !message;
  input.setAttribute("aria-invalid", String(Boolean(message)));
  return !message;
}

function initValidation() {
  const form = document.getElementById("contact-form");
  if (!form) return;
  // Native HTML constraints stay in the markup as a no-JavaScript fallback.
  form.noValidate = true;
  document.getElementById("form-demo").hidden = true;
  const feedback = document.getElementById("form-feedback");
  let submitted = false;
  function clearFeedback() {
    feedback.hidden = true;
    feedback.textContent = "";
  }
  Object.keys(validationRules).forEach(id => {
    const input = form.elements[id];
    const error = document.createElement("span");
    error.id = `${id}-error`;
    error.className = "field-error";
    error.hidden = true;
    input.insertAdjacentElement("afterend", error);
    input.setAttribute("aria-describedby", `${input.getAttribute("aria-describedby") || ""} ${error.id}`.trim());
    input.addEventListener("blur", () => validateField(form, id));
    input.addEventListener("input", () => {
      clearFeedback();
      if (submitted || input.getAttribute("aria-invalid") === "true") validateField(form, id);
    });
    input.addEventListener("change", () => {
      clearFeedback();
      if (submitted) validateField(form, id);
    });
  });
  form.querySelectorAll('[name="contactMethod"]').forEach(radio => {
    radio.addEventListener("change", () => {
      clearFeedback();
      if (submitted) validateField(form, "phone");
    });
  });
  form.addEventListener("submit", event => {
    // This coursework site has no backend: never transmit personal form entries.
    event.preventDefault();
    submitted = true;
    const invalidIds = Object.keys(validationRules).filter(id => !validateField(form, id));
    feedback.hidden = false;
    if (invalidIds.length) {
      feedback.textContent = `Please correct ${invalidIds.length} highlighted field(s). Your entries have been kept.`;
      form.elements[invalidIds[0]].focus();
    } else {
      feedback.textContent = "Your entries passed validation. Demo only: no message was sent, no order was placed, and no contact details were saved.";
      feedback.focus();
    }
  });
  form.addEventListener("reset", () => {
    submitted = false;
    clearFeedback();
    Object.keys(validationRules).forEach(id => {
      form.elements[id].removeAttribute("aria-invalid");
      const error = document.getElementById(`${id}-error`);
      error.textContent = "";
      error.hidden = true;
    });
  });
}

loadPreferences();
initProducts();
renderContactFavorites();
initValidation();
// Keep two open tabs consistent, including when a visitor clears site data.
window.addEventListener("storage", event => {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  preferences = { favoriteIds: [], category: "all" };
  loadPreferences();
  if (document.getElementById("favorites-feature")) {
    document.getElementById("product-filter").value = preferences.category;
    renderFavorites();
    filterProducts();
  }
  renderContactFavorites();
});
