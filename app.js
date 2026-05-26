const DATA_URL = "data/universities.json";

const pageType = document.body?.dataset.page;

const selectors = {
  searchInput: document.getElementById("searchInput"),
  cityFilter: document.getElementById("cityFilter"),
  departmentFilter: document.getElementById("departmentFilter"),
  scholarshipFilter: document.getElementById("scholarshipFilter"),
  statusFilter: document.getElementById("statusFilter"),
  summaryText: document.getElementById("summaryText"),
  universityList: document.getElementById("universityList"),
  detailCard: document.getElementById("detailCard"),
};

const state = {
  search: "",
  city: "all",
  department: "all",
  scholarship: "all",
  status: "all",
};

const createOption = (value, label) => {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
};

const normalizeText = (value) => value.toLowerCase();

const loadData = async () => {
  const response = await fetch(DATA_URL);
  if (!response.ok) {
    throw new Error("Failed to load universities data");
  }
  return response.json();
};

const buildFilters = (universities) => {
  if (!selectors.cityFilter || !selectors.departmentFilter) {
    return;
  }

  const cities = new Set();
  const departments = new Set();

  universities.forEach((uni) => {
    if (uni.city) {
      cities.add(uni.city);
    }
    (uni.departments || []).forEach((dept) => departments.add(dept));
  });

  selectors.cityFilter.append(createOption("all", "All"));
  [...cities].sort().forEach((city) => {
    selectors.cityFilter.append(createOption(city, city));
  });

  selectors.departmentFilter.append(createOption("all", "All"));
  [...departments].sort().forEach((dept) => {
    selectors.departmentFilter.append(createOption(dept, dept));
  });
};

const matchesFilters = (uni) => {
  const searchTarget = [
    uni.name,
    uni.city,
    uni.description,
    ...(uni.departments || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const matchesSearch =
    !state.search || searchTarget.includes(normalizeText(state.search));
  const matchesCity = state.city === "all" || uni.city === state.city;
  const matchesDepartment =
    state.department === "all" ||
    (uni.departments || []).includes(state.department);
  const matchesScholarship =
    state.scholarship === "all" ||
    (state.scholarship === "available"
      ? uni.scholarships?.available
      : !uni.scholarships?.available);
  const matchesStatus =
    state.status === "all" || uni.status === state.status;

  return (
    matchesSearch &&
    matchesCity &&
    matchesDepartment &&
    matchesScholarship &&
    matchesStatus
  );
};

const renderTags = (items) => {
  const list = document.createElement("ul");
  list.className = "tag-list";
  items.forEach((item) => {
    const tag = document.createElement("li");
    tag.textContent = item;
    list.append(tag);
  });
  return list;
};

const renderList = (universities, metadata) => {
  if (!selectors.universityList || !selectors.summaryText) {
    return;
  }

  selectors.universityList.innerHTML = "";

  const filtered = universities.filter(matchesFilters);
  const lastUpdated = metadata?.last_updated || "unknown";
  selectors.summaryText.textContent = `${filtered.length} universities found · Last updated ${lastUpdated}`;

  if (!filtered.length) {
    selectors.universityList.innerHTML =
      '<div class="university-card">No universities match your filters.</div>';
    return;
  }

  filtered.forEach((uni) => {
    const card = document.createElement("article");
    card.className = "university-card";

    const title = document.createElement("h3");
    title.textContent = uni.name;

    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = uni.status === "public" ? "Public" : "Private";

    const description = document.createElement("p");
    description.textContent = uni.description;

    const meta = document.createElement("div");
    meta.className = "card-meta";
    meta.innerHTML = `
      <span>City: ${uni.city}</span>
      <span>Scholarships: ${uni.scholarships?.available ? "Yes" : "No"}</span>
      <span>Tuition: ${uni.tuition}</span>
    `;

    const link = document.createElement("a");
    link.className = "card-link";
    link.href = `university.html?id=${encodeURIComponent(uni.id)}`;
    link.textContent = "View details →";

    card.append(title, badge, description, renderTags(uni.departments || []), meta, link);
    selectors.universityList.append(card);
  });
};

const attachFilterListeners = (universities, metadata) => {
  if (selectors.searchInput) {
    selectors.searchInput.addEventListener("input", (event) => {
      state.search = event.target.value.trim();
      renderList(universities, metadata);
    });
  }

  if (selectors.cityFilter) {
    selectors.cityFilter.addEventListener("change", (event) => {
      state.city = event.target.value;
      renderList(universities, metadata);
    });
  }

  if (selectors.departmentFilter) {
    selectors.departmentFilter.addEventListener("change", (event) => {
      state.department = event.target.value;
      renderList(universities, metadata);
    });
  }

  if (selectors.scholarshipFilter) {
    selectors.scholarshipFilter.addEventListener("change", (event) => {
      state.scholarship = event.target.value;
      renderList(universities, metadata);
    });
  }

  if (selectors.statusFilter) {
    selectors.statusFilter.addEventListener("change", (event) => {
      state.status = event.target.value;
      renderList(universities, metadata);
    });
  }
};

const renderDetail = (universities) => {
  if (!selectors.detailCard) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const university = universities.find((uni) => uni.id === id);

  if (!university) {
    selectors.detailCard.innerHTML =
      "<p>We couldn't find that university. Please return to the directory.</p>";
    return;
  }

  selectors.detailCard.innerHTML = "";

  const header = document.createElement("div");
  header.className = "detail-grid";

  const logo = document.createElement("img");
  logo.className = "detail-logo";
  logo.src = university.logo;
  logo.alt = `${university.name} logo`;

  const overview = document.createElement("div");
  const title = document.createElement("h2");
  title.textContent = university.name;
  const subtitle = document.createElement("p");
  subtitle.textContent = `${university.city} · ${
    university.status === "public" ? "Public" : "Private"
  }`;
  const description = document.createElement("p");
  description.textContent = university.description;

  overview.append(title, subtitle, description);
  header.append(logo, overview);

  const details = document.createElement("div");
  const detailsTitle = document.createElement("h3");
  detailsTitle.className = "section-title";
  detailsTitle.textContent = "Key details";

  const infoList = document.createElement("ul");
  infoList.className = "info-list";

  const addInfoItem = (label, valueNode) => {
    const item = document.createElement("li");
    const strong = document.createElement("strong");
    strong.textContent = `${label}: `;
    item.append(strong);
    item.append(valueNode);
    infoList.append(item);
  };

  const createTextNode = (text) => document.createTextNode(text || "Not listed");

  addInfoItem(
    "Departments",
    createTextNode((university.departments || []).join(", ") || "Not listed")
  );
  addInfoItem("Tuition", createTextNode(university.tuition));

  const scholarshipText = university.scholarships?.available
    ? "Available"
    : "Not available";
  const scholarshipDetails = university.scholarships?.details || "";
  addInfoItem(
    "Scholarships",
    createTextNode(
      scholarshipDetails ? `${scholarshipText} - ${scholarshipDetails}` : scholarshipText
    )
  );

  addInfoItem(
    "Admission requirements",
    createTextNode(university.admission_requirements)
  );

  const website = university.website || "";
  if (website) {
    const websiteLink = document.createElement("a");
    websiteLink.href = website;
    websiteLink.target = "_blank";
    websiteLink.rel = "noreferrer";
    websiteLink.textContent = website;
    addInfoItem("Website", websiteLink);
  } else {
    addInfoItem("Website", createTextNode("Not listed"));
  }

  const contactParts = [university.contact?.email, university.contact?.phone].filter(
    Boolean
  );
  addInfoItem("Contact", createTextNode(contactParts.join(" · ")));

  const locationText = university.location?.address || "Not listed";
  if (university.location?.map) {
    const locationLink = document.createElement("a");
    locationLink.href = university.location.map;
    locationLink.target = "_blank";
    locationLink.rel = "noreferrer";
    locationLink.textContent = locationText;
    addInfoItem("Location", locationLink);
  } else {
    addInfoItem("Location", createTextNode(locationText));
  }

  details.append(detailsTitle, infoList);

  const social = document.createElement("div");
  social.innerHTML = "<h3 class=\"section-title\">Social media</h3>";
  const socialList = document.createElement("ul");
  socialList.className = "info-list";

  const socialLinks = university.social_links || {};
  Object.entries(socialLinks).forEach(([label, url]) => {
    if (!url) return;
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = label.toUpperCase();
    item.append(link);
    socialList.append(item);
  });

  if (!socialList.children.length) {
    const item = document.createElement("li");
    item.textContent = "No social links listed.";
    socialList.append(item);
  }

  social.append(socialList);
  selectors.detailCard.append(header, details, social);
};

const startIndexPage = async () => {
  try {
    const data = await loadData();
    buildFilters(data.universities || []);
    renderList(data.universities || [], data.metadata || { last_updated: "" });
    attachFilterListeners(data.universities || [], data.metadata || {});
  } catch (error) {
    if (selectors.summaryText) {
      selectors.summaryText.textContent = "Unable to load university data.";
    }
  }
};

const startDetailPage = async () => {
  try {
    const data = await loadData();
    renderDetail(data.universities || []);
  } catch (error) {
    if (selectors.detailCard) {
      selectors.detailCard.textContent = "Unable to load university data.";
    }
  }
};

if (pageType === "index") {
  startIndexPage();
}

if (pageType === "detail") {
  startDetailPage();
}
