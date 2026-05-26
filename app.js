const DATA_URL = "data/universities.json";

const pageType = document.body?.dataset.page;

const selectors = {
  searchInput: document.getElementById("searchInput"),
  cityFilter: document.getElementById("cityFilter"),
  departmentFilter: document.getElementById("departmentFilter"),
  summaryText: document.getElementById("summaryText"),
  universityList: document.getElementById("universityList"),
  detailCard: document.getElementById("detailCard"),
};

const state = {
  search: "",
  city: "all",
  department: "all",
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

  return matchesSearch && matchesCity && matchesDepartment;
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

const slugifyName = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

let cityChartInstance = null;
let deptChartInstance = null;

const renderCharts = (universities) => {
  if (typeof Chart === "undefined") {
    console.warn("Chart.js is not loaded yet.");
    return;
  }
  const cityCtx = document.getElementById("cityChart")?.getContext("2d");
  const deptCtx = document.getElementById("departmentChart")?.getContext("2d");
  if (!cityCtx || !deptCtx) return;

  // Aggregate Universities by City
  const cityCounts = {};
  universities.forEach((u) => {
    if (u.city) {
      cityCounts[u.city] = (cityCounts[u.city] || 0) + 1;
    }
  });

  // Aggregate Universities by Department
  const deptCounts = {};
  universities.forEach((u) => {
    (u.departments || []).forEach((dept) => {
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });
  });

  // Destroy old charts to prevent drawing glitches
  if (cityChartInstance) cityChartInstance.destroy();
  if (deptChartInstance) deptChartInstance.destroy();

  const cities = Object.keys(cityCounts);
  const cityValues = Object.values(cityCounts);

  const depts = Object.keys(deptCounts);
  const deptValues = Object.values(deptCounts);

  if (cities.length === 0 && depts.length === 0) {
    return;
  }

  // Create City Pie Chart
  cityChartInstance = new Chart(cityCtx, {
    type: "pie",
    data: {
      labels: cities,
      datasets: [
        {
          data: cityValues,
          backgroundColor: [
            "#0f766e",
            "#14b8a6",
            "#f59e0b",
            "#2563eb",
            "#ef4444",
            "#8b5cf6",
            "#06b6d4",
            "#10b981",
            "#f43f5e",
            "#ec4899",
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            boxWidth: 12,
            font: { size: 11 },
          },
        },
      },
    },
  });

  // Create Department Bar Chart
  deptChartInstance = new Chart(deptCtx, {
    type: "bar",
    data: {
      labels: depts,
      datasets: [
        {
          label: "Universities",
          data: deptValues,
          backgroundColor: "#0f766e",
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            precision: 0,
          },
        },
        x: {
          ticks: {
            font: { size: 9 },
          },
        },
      },
    },
  });
};

const renderList = (universities, metadata) => {
  if (!selectors.universityList || !selectors.summaryText) {
    return;
  }

  selectors.universityList.innerHTML = "";

  const filtered = universities.filter(matchesFilters);
  const lastUpdated = metadata?.last_updated || "unknown";
  selectors.summaryText.textContent = `${filtered.length} universities found · Last updated ${lastUpdated}`;

  // Dynamically render charts based on current filter state
  renderCharts(filtered);

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

    const meta = document.createElement("div");
    meta.className = "card-meta";
    meta.innerHTML = `
      <span><strong>City:</strong> ${uni.city}</span>
      <span><strong>Rector:</strong> ${uni.rector || "Rector info not found"}</span>
    `;

    const link = document.createElement("a");
    link.className = "card-link";
    const slug = slugifyName(uni.name);
    link.href = `university.html?id=${encodeURIComponent(slug)}`;
    link.textContent = "View details →";

    card.append(title, meta, renderTags(uni.departments || []), link);
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
};

const renderDetail = (universities) => {
  if (!selectors.detailCard) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const university = universities.find((uni) => slugifyName(uni.name) === id);

  if (!university) {
    selectors.detailCard.innerHTML =
      "<p>We couldn't find that university. Please return to the directory.</p>";
    return;
  }

  selectors.detailCard.innerHTML = "";

  const header = document.createElement("div");
  header.className = "detail-grid";

  const overview = document.createElement("div");
  const title = document.createElement("h2");
  title.textContent = university.name;
  const subtitle = document.createElement("p");
  subtitle.textContent = `City: ${university.city}`;

  overview.append(title, subtitle);
  header.append(overview);

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
  addInfoItem("Rector", createTextNode(university.rector));

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

  details.append(detailsTitle, infoList);
  selectors.detailCard.append(header, details);
};

const startIndexPage = async () => {
  try {
    const data = await loadData();
    buildFilters(data.universities || []);
    renderList(data.universities || [], data.metadata || { last_updated: "" });
    attachFilterListeners(data.universities || [], data.metadata || {});
  } catch (error) {
    console.error("Error starting index page:", error);
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
    console.error("Error starting detail page:", error);
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
