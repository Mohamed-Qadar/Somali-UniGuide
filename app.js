const DATA_PATHS = {
  universities: "data/universities.json",
  departments: "data/departments.json",
  reviews: "data/reviews.json",
  deadlines: "data/deadlines.json",
  metadata: "data/metadata.json",
};

const state = {
  universities: [],
  departments: [],
  baseReviews: [],
  reviews: [],
  deadlines: [],
  metadata: {},
  filtered: [],
  filters: {
    search: "",
    cities: new Set(),
    departments: new Set(),
    types: new Set(),
    scholarshipOnly: false,
  },
  language: "en",
  translations: {},
  map: null,
  markers: new Map(),
};

const elements = {
  searchInput: document.getElementById("search-input"),
  resultsCount: document.getElementById("results-count"),
  cardsGrid: document.getElementById("cards-grid"),
  cityFilters: document.getElementById("city-filters"),
  departmentFilters: document.getElementById("department-filters"),
  typeFilters: document.getElementById("type-filters"),
  scholarshipOnly: document.getElementById("scholarship-only"),
  resetFilters: document.getElementById("reset-filters"),
  detailSection: document.getElementById("detail-section"),
  closeDetail: document.getElementById("close-detail"),
  detailLogo: document.getElementById("detail-logo"),
  detailName: document.getElementById("detail-name"),
  detailCity: document.getElementById("detail-city"),
  detailType: document.getElementById("detail-type"),
  detailDescription: document.getElementById("detail-description"),
  detailDepartments: document.getElementById("detail-departments"),
  detailTuition: document.getElementById("detail-tuition"),
  detailScholarships: document.getElementById("detail-scholarships"),
  detailAdmission: document.getElementById("detail-admission"),
  detailContact: document.getElementById("detail-contact"),
  detailWebsite: document.getElementById("detail-website"),
  recommendInterest: document.getElementById("recommend-interest"),
  recommendScholarship: document.getElementById("recommend-scholarship"),
  recommendCity: document.getElementById("recommend-city"),
  recommendCards: document.getElementById("recommend-cards"),
  reviewsList: document.getElementById("reviews-list"),
  reviewForm: document.getElementById("review-form"),
  reviewName: document.getElementById("reviewer-name"),
  reviewUniversity: document.getElementById("review-university"),
  reviewRating: document.getElementById("review-rating"),
  reviewComment: document.getElementById("review-comment"),
  deadlinesList: document.getElementById("deadlines-list"),
  deadlineAlert: document.getElementById("deadline-alert"),
  deadlineAlertList: document.getElementById("deadline-alert-list"),
  lastUpdated: document.getElementById("last-updated"),
  filterSidebar: document.getElementById("filter-sidebar"),
  openFilters: document.getElementById("mobile-filter-toggle"),
  closeFilters: document.getElementById("close-filters"),
  backToTop: document.getElementById("back-to-top"),
};

const localeMap = {
  en: "en",
  so: "so",
  ar: "ar",
};

const init = async () => {
  bindEvents();
  const savedLang = localStorage.getItem("language");
  state.language = savedLang || "en";
  await loadTranslations(state.language);
  await loadData();
  applyTranslations();
  initFilters();
  applyFilters();
  initRecommendations();
  renderReviews();
  renderDeadlines();
  initMap();
  updateLastUpdated();
  handleHash();
};

const bindEvents = () => {
  elements.searchInput.addEventListener("input", (event) => {
    state.filters.search = event.target.value.trim().toLowerCase();
    applyFilters();
  });

  elements.typeFilters.addEventListener("change", (event) => {
    if (event.target.value) {
      toggleSetValue(state.filters.types, event.target.value, event.target.checked);
      applyFilters();
    }
  });

  elements.scholarshipOnly.addEventListener("change", (event) => {
    state.filters.scholarshipOnly = event.target.checked;
    applyFilters();
  });

  elements.resetFilters.addEventListener("click", () => resetAllFilters());

  elements.closeDetail.addEventListener("click", () => closeDetail());
  elements.detailSection.addEventListener("click", (event) => {
    if (event.target === elements.detailSection) {
      closeDetail();
    }
  });

  elements.recommendInterest.addEventListener("change", () => renderRecommendations());
  elements.recommendScholarship.addEventListener("change", () => renderRecommendations());
  elements.recommendCity.addEventListener("change", () => renderRecommendations());

  elements.reviewForm.addEventListener("submit", handleReviewSubmit);

  document.querySelectorAll(".lang-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const newLang = button.dataset.lang;
      if (newLang && newLang !== state.language) {
        state.language = newLang;
        localStorage.setItem("language", newLang);
        await loadTranslations(newLang);
        applyTranslations();
        applyFilters();
        initRecommendations();
        renderReviews();
        renderDeadlines();
        updateLastUpdated();
      }
    });
  });

  elements.openFilters.addEventListener("click", () => elements.filterSidebar.classList.add("open"));
  elements.closeFilters.addEventListener("click", () => elements.filterSidebar.classList.remove("open"));

  window.addEventListener("hashchange", handleHash);

  elements.backToTop.addEventListener("click", (event) => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
};

const loadJson = async (path, fallback = []) => {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      return fallback;
    }
    return await response.json();
  } catch (error) {
    return fallback;
  }
};

const loadData = async () => {
  const [universities, departmentsData, reviews, deadlines, metadata] = await Promise.all([
    loadJson(DATA_PATHS.universities, []),
    loadJson(DATA_PATHS.departments, { departments: [] }),
    loadJson(DATA_PATHS.reviews, []),
    loadJson(DATA_PATHS.deadlines, []),
    loadJson(DATA_PATHS.metadata, {}),
  ]);

  state.universities = universities;
  state.departments = departmentsData.departments || [];
  state.deadlines = deadlines;
  state.metadata = metadata;
  const storedReviews = loadStoredReviews();
  state.baseReviews = reviews;
  state.reviews = [...reviews, ...storedReviews];
  state.filtered = [...universities];
};

const loadTranslations = async (language) => {
  const translations = await loadJson(`lang/${language}.json`, {});
  state.translations = translations;
  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
};

const applyTranslations = () => {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    const value = t(key);
    if (value) {
      el.textContent = value;
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    const value = t(key);
    if (value) {
      el.placeholder = value;
    }
  });

  document.querySelectorAll(".lang-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.lang === state.language);
  });
};

const t = (key, values = {}) => {
  const result = key.split(".").reduce((acc, part) => (acc && acc[part] ? acc[part] : null), state.translations);
  if (!result || typeof result !== "string") {
    return "";
  }
  return result.replace(/\{(\w+)\}/g, (_, token) => (values[token] !== undefined ? values[token] : ""));
};

const initFilters = () => {
  const cities = [...new Set(state.universities.map((uni) => uni.city))].sort();
  const departments = state.departments.length
    ? state.departments
    : [...new Set(state.universities.flatMap((uni) => uni.departments))].sort();

  elements.cityFilters.innerHTML = cities
    .map(
      (city) =>
        `<label class="checkbox"><input type="checkbox" value="${city}" /> <span>${city}</span></label>`
    )
    .join("");

  elements.departmentFilters.innerHTML = departments
    .map(
      (dept) =>
        `<label class="checkbox"><input type="checkbox" value="${dept}" /> <span>${dept}</span></label>`
    )
    .join("");

  elements.cityFilters.addEventListener("change", (event) => {
    if (event.target.value) {
      toggleSetValue(state.filters.cities, event.target.value, event.target.checked);
      applyFilters();
    }
  });

  elements.departmentFilters.addEventListener("change", (event) => {
    if (event.target.value) {
      toggleSetValue(state.filters.departments, event.target.value, event.target.checked);
      applyFilters();
    }
  });
};

const toggleSetValue = (set, value, shouldAdd) => {
  if (shouldAdd) {
    set.add(value);
  } else {
    set.delete(value);
  }
};

const applyFilters = () => {
  const query = state.filters.search;

  state.filtered = state.universities.filter((uni) => {
    const matchesSearch =
      !query ||
      [uni.name, uni.city, uni.description, ...uni.departments]
        .join(" ")
        .toLowerCase()
        .includes(query);

    const matchesCity = state.filters.cities.size === 0 || state.filters.cities.has(uni.city);
    const matchesDept =
      state.filters.departments.size === 0 || uni.departments.some((dept) => state.filters.departments.has(dept));
    const matchesType = state.filters.types.size === 0 || state.filters.types.has(uni.type);
    const matchesScholarship = !state.filters.scholarshipOnly || uni.hasScholarship;

    return matchesSearch && matchesCity && matchesDept && matchesType && matchesScholarship;
  });

  renderCards();
  updateResultsCount();
};

const renderCards = () => {
  if (state.filtered.length === 0) {
    elements.cardsGrid.innerHTML = `<div class="empty">${t("results.empty")}</div>`;
    return;
  }

  elements.cardsGrid.innerHTML = state.filtered.map((uni) => createCard(uni)).join("");

  document.querySelectorAll(".view-details").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.id;
      openDetail(id);
    });
  });
};

const createCard = (uni, size = "default") => {
  const scholarshipBadge = uni.hasScholarship ? `<span class="badge">${t("labels.scholarship")}</span>` : "";

  return `
    <article class="university-card" data-id="${uni.id}">
      <div class="card-header">
        <img class="card-logo" src="${uni.logo}" alt="${uni.name}" />
        <div>
          <h4 class="card-title">${uni.name}</h4>
          <p class="card-city">${uni.city}</p>
        </div>
      </div>
      ${scholarshipBadge}
      <p class="card-description">${uni.description}</p>
      <div class="card-footer">
        <span class="pill">${t(uni.type === "Public" ? "labels.public" : "labels.private")}</span>
        <button class="primary-btn view-details" data-id="${uni.id}">${t("actions.viewDetails")}</button>
      </div>
    </article>
  `;
};

const updateResultsCount = () => {
  elements.resultsCount.textContent = t("search.resultsCount", { count: state.filtered.length });
};

const openDetail = (id) => {
  const uni = state.universities.find((item) => item.id === id);
  if (!uni) return;

  elements.detailLogo.src = uni.logo;
  elements.detailLogo.alt = uni.name;
  elements.detailName.textContent = uni.name;
  elements.detailCity.textContent = uni.city;
  elements.detailType.textContent = t(uni.type === "Public" ? "labels.public" : "labels.private");
  elements.detailDescription.textContent = uni.description;
  elements.detailTuition.textContent = uni.tuition;
  elements.detailScholarships.textContent = uni.scholarships;
  elements.detailContact.textContent = `${uni.contact.email} · ${uni.contact.phone}`;
  elements.detailWebsite.href = uni.website;
  elements.detailWebsite.textContent = t("detail.website", { name: uni.name }) || uni.website;

  elements.detailDepartments.innerHTML = uni.departments.map((dept) => `<li>${dept}</li>`).join("");
  elements.detailAdmission.innerHTML = uni.admissionRequirements.map((req) => `<li>${req}</li>`).join("");

  elements.detailSection.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  history.replaceState(null, "", `#university=${uni.id}`);
};

const closeDetail = () => {
  elements.detailSection.classList.add("hidden");
  document.body.style.overflow = "";
  if (window.location.hash.startsWith("#university=")) {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }
};

const handleHash = () => {
  const hash = window.location.hash;
  if (hash.startsWith("#university=")) {
    const id = hash.replace("#university=", "");
    openDetail(id);
  }
};

const resetAllFilters = () => {
  state.filters.search = "";
  state.filters.cities.clear();
  state.filters.departments.clear();
  state.filters.types.clear();
  state.filters.scholarshipOnly = false;

  elements.searchInput.value = "";
  elements.scholarshipOnly.checked = false;
  elements.typeFilters.querySelectorAll("input").forEach((input) => (input.checked = false));
  elements.cityFilters.querySelectorAll("input").forEach((input) => (input.checked = false));
  elements.departmentFilters.querySelectorAll("input").forEach((input) => (input.checked = false));

  applyFilters();
};

const initMap = () => {
  if (!window.L || state.map || !state.universities.length) return;

  state.map = L.map("map").setView([5.1521, 46.1996], 6);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(state.map);

  state.universities.forEach((uni) => {
    const marker = L.marker([uni.coordinates.lat, uni.coordinates.lng]).addTo(state.map);
    marker.bindPopup(`<strong>${uni.name}</strong><br/>${uni.city}`);
    marker.on("click", () => {
      openDetail(uni.id);
      highlightCard(uni.id);
    });
    state.markers.set(uni.id, marker);
  });
};

const highlightCard = (id) => {
  const card = document.querySelector(`.university-card[data-id="${id}"]`);
  if (card) {
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.add("highlight");
    setTimeout(() => card.classList.remove("highlight"), 1200);
  }
};

const initRecommendations = () => {
  const interests = [t("recommend.any"), ...state.departments];
  elements.recommendInterest.innerHTML = interests
    .map((interest, index) => `<option value="${index === 0 ? "" : interest}">${interest}</option>`)
    .join("");

  elements.recommendScholarship.innerHTML = [
    `<option value="">${t("recommend.any")}</option>`,
    `<option value="yes">${t("recommend.yes")}</option>`,
    `<option value="no">${t("recommend.no")}</option>`,
  ].join("");

  const cities = [t("recommend.any"), ...new Set(state.universities.map((uni) => uni.city))];
  elements.recommendCity.innerHTML = cities
    .map((city, index) => `<option value="${index === 0 ? "" : city}">${city}</option>`)
    .join("");

  renderRecommendations();

  elements.reviewUniversity.innerHTML = state.universities
    .map((uni) => `<option value="${uni.id}">${uni.name}</option>`)
    .join("");
};

const renderRecommendations = () => {
  const interest = elements.recommendInterest.value;
  const scholarship = elements.recommendScholarship.value;
  const city = elements.recommendCity.value;

  const matches = state.universities.filter((uni) => {
    const matchesInterest = !interest || uni.departments.includes(interest) || uni.tags.includes(interest);
    const matchesScholarship =
      !scholarship || (scholarship === "yes" ? uni.hasScholarship : !uni.hasScholarship);
    const matchesCity = !city || uni.city === city;

    return matchesInterest && matchesScholarship && matchesCity;
  });

  if (!matches.length) {
    elements.recommendCards.innerHTML = `<div class="empty">${t("recommend.empty")}</div>`;
    return;
  }

  elements.recommendCards.innerHTML = matches.map((uni) => createCard(uni, "small")).join("");

  elements.recommendCards.querySelectorAll(".view-details").forEach((button) => {
    button.addEventListener("click", () => openDetail(button.dataset.id));
  });
};

const loadStoredReviews = () => {
  try {
    const data = localStorage.getItem("reviews");
    return data ? JSON.parse(data) : [];
  } catch (error) {
    return [];
  }
};

const saveStoredReviews = (reviews) => {
  localStorage.setItem("reviews", JSON.stringify(reviews));
};

const handleReviewSubmit = (event) => {
  event.preventDefault();
  const newReview = {
    name: elements.reviewName.value.trim(),
    universityId: elements.reviewUniversity.value,
    rating: Number(elements.reviewRating.value),
    comment: elements.reviewComment.value.trim(),
    date: new Date().toISOString(),
  };

  if (!newReview.name || !newReview.universityId || !newReview.rating || !newReview.comment) {
    return;
  }

  const storedReviews = loadStoredReviews();
  storedReviews.unshift(newReview);
  saveStoredReviews(storedReviews);
  state.reviews = [...state.baseReviews, ...storedReviews];
  renderReviews();
  elements.reviewForm.reset();
};

const renderReviews = () => {
  if (!state.reviews.length) {
    elements.reviewsList.innerHTML = `<div class="empty">${t("reviews.empty")}</div>`;
    return;
  }

  const universityMap = new Map(state.universities.map((uni) => [uni.id, uni.name]));

  elements.reviewsList.innerHTML = state.reviews
    .slice(0, 6)
    .map((review) => {
      const uniName = universityMap.get(review.universityId) || "";
      const ratingStars = "★".repeat(review.rating) + "☆".repeat(5 - review.rating);
      return `
        <article class="review-card">
          <h4>${review.name}</h4>
          <div class="review-meta">${uniName} · ${ratingStars}</div>
          <p>${review.comment}</p>
        </article>
      `;
    })
    .join("");
};

const renderDeadlines = () => {
  if (!state.deadlines.length) {
    elements.deadlinesList.innerHTML = "";
    return;
  }

  const upcoming = [];

  elements.deadlinesList.innerHTML = state.deadlines
    .map((deadline) => {
      const daysLeft = getDaysLeft(deadline.deadline);
      if (daysLeft >= 0 && daysLeft <= 30) {
        upcoming.push(deadline);
      }
      return `
        <div class="deadline-card">
          <div>
            <h4>${deadline.university}</h4>
            <p class="deadline-meta">${deadline.program}</p>
            <p class="deadline-meta">${t("deadlines.opens", { date: formatDate(deadline.openingDate) })}</p>
            <p class="deadline-meta">${t("deadlines.deadline", { date: formatDate(deadline.deadline) })}</p>
          </div>
          <div class="badge">${t("deadlines.daysLeft", { days: daysLeft })}</div>
        </div>
      `;
    })
    .join("");

  if (upcoming.length) {
    elements.deadlineAlert.classList.remove("hidden");
    elements.deadlineAlertList.innerHTML = upcoming
      .slice(0, 3)
      .map((deadline) => `${deadline.university} · ${t("deadlines.daysLeft", { days: getDaysLeft(deadline.deadline) })}`)
      .join(" | ");
  } else {
    elements.deadlineAlert.classList.add("hidden");
  }
};

const updateLastUpdated = () => {
  if (!state.metadata.lastUpdated) return;
  elements.lastUpdated.textContent = t("footer.lastUpdated", { date: formatDate(state.metadata.lastUpdated) });
};

const getDaysLeft = (deadlineDate) => {
  const today = new Date();
  const deadline = new Date(deadlineDate);
  const diff = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
  return diff;
};

const formatDate = (value) => {
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(localeMap[state.language] || "en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  } catch (error) {
    return value;
  }
};

init();
