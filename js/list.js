console.log("✅ list.js loaded");

document.addEventListener("DOMContentLoaded", () => {
  const regionMap = {
    "Lake Michigan": { file: "Lake_Points.csv", key: "lake-michigan" },
    "Mississippi/Chippewa Rivers": { file: "Mississippi_Points.csv", key: "mississippi" },
    "Central Sand Prairie": { file: "Central_Points.csv", key: "central" },
    "Lake Superior Northwoods": { file: "Northwoods_Points.csv", key: "northwoods" },
    "Southern Savanna": { file: "Savannah_Points.csv", key: "savanna" }
  };

  const container = document.getElementById("region-list");
  let countyDescriptions = {};

  fetch("assets/County_Descriptions.csv")
    .then(res => res.text())
    .then(csv => {
      const parsed = Papa.parse(csv, { header: true }).data;
      parsed.forEach(row => {
        if (row.county && row.description && row.region) {
          const key = `${row.region.trim().toLowerCase()}|${row.county.trim().toLowerCase()}`;
          countyDescriptions[key] = row.description.trim().replace(/\n+/g, " ");
        }
      });
      loadAllRegions();
    });

  function loadAllRegions() {
    Object.entries(regionMap).forEach(([regionName, { file, key }]) => {
      fetch(`assets/${file}`)
        .then(res => res.text())
        .then(csv => {
          const parsed = Papa.parse(csv, { header: true }).data;
          const countyMap = {};

          parsed.forEach(site => {
            const county = site.county?.trim();
            if (!county) return;
            if (!countyMap[county]) countyMap[county] = [];
            countyMap[county].push(site);
          });

          const regionCard = document.createElement("div");
          regionCard.className = `region-card`;

          const regionHeader = createToggleButton(regionName, "region", `region-${key}`);
          const regionContent = document.createElement("div");
          regionContent.className = "region-content";
          regionContent.hidden = true;

          regionHeader.addEventListener("click", () => toggle(regionHeader, regionContent, true));
          regionHeader.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggle(regionHeader, regionContent, true);
            }
          });

          const sortedCounties = Object.keys(countyMap).sort();
          sortedCounties.forEach(county => {
            const countyKey = `${key}|${county.toLowerCase()}`;
            const countyDesc = countyDescriptions[countyKey] || "No description available.";

            const countyBlock = document.createElement("div");
            countyBlock.style.marginBottom = "1rem";

            const countyHeader = createToggleButton(county, "county");
            const countyContent = document.createElement("div");
            countyContent.hidden = true;

            countyHeader.addEventListener("click", () => toggle(countyHeader, countyContent, true));
            countyHeader.addEventListener("keydown", (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggle(countyHeader, countyContent, true);
              }
            });

            const countyParagraph = document.createElement("div");
            countyParagraph.className = "county-description";
            countyParagraph.innerHTML = countyDesc;
            countyContent.appendChild(countyParagraph);

            countyMap[county].sort((a, b) => a.Name.localeCompare(b.Name)).forEach(site => {
                const cleanName = site.Name?.replace(/^\s*\d+\.?\s*/, "").trim();
                const siteBlock = document.createElement("div");
                siteBlock.style.marginLeft = "1rem";
                siteBlock.style.marginBottom = "1rem";
              
                const siteButton = createToggleButton(cleanName, "site");
              
                const siteDesc = document.createElement("div");
                siteDesc.className = "county-description";
                siteDesc.style.display = "none";
                siteDesc.innerHTML = site.site_desc || "No description available.";
              
                const directionsButton = document.createElement("a");
                directionsButton.className = "directions-button";
                directionsButton.href = `https://www.google.com/maps/dir/?api=1&destination=${site.lat},${site.lon}`;
                directionsButton.target = "_blank";
                directionsButton.rel = "noopener noreferrer";
                directionsButton.textContent = "Get Directions";
                directionsButton.style.display = "inline-block";
                directionsButton.style.marginTop = "0.5rem";
                directionsButton.style.fontSize = "0.9rem";
                directionsButton.style.color = "#1A4D7A";
                directionsButton.style.textDecoration = "underline";
              
                siteButton.addEventListener("click", () => toggle(siteButton, siteDesc, false));
                siteButton.addEventListener("keydown", (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle(siteButton, siteDesc, false);
                  }
                });
              
                siteBlock.appendChild(siteButton);
                siteBlock.appendChild(siteDesc);
                siteBlock.appendChild(directionsButton);
                countyContent.appendChild(siteBlock);
              });
              

            countyBlock.appendChild(countyHeader);
            countyBlock.appendChild(countyContent);
            regionContent.appendChild(countyBlock);
          });

          regionCard.appendChild(regionHeader);
          regionCard.appendChild(regionContent);
          container.appendChild(regionCard);
        });
    });
  }

  function createToggleButton(text, type, extraClass = "") {
    const button = document.createElement("button");
    button.className = `${type}-toggle ${extraClass}`;
    button.setAttribute("tabindex", "0");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("role", "button");
    button.innerHTML = `<span class="toggle-arrow">▸</span> ${text}`;
    button.style.display = "block";
    button.style.width = "100%";
    button.style.textAlign = "left";
    button.style.background = "none";
    button.style.border = "none";
    button.style.fontSize = type === "site" ? "1rem" : "1.2rem";
    button.style.padding = "0.5rem 0";
    button.style.marginTop = type === "site" ? "0.25rem" : "0.5rem";
    return button;
  }

  function toggle(buttonEl, contentEl, scroll = false) {
    const isExpanded = buttonEl.getAttribute("aria-expanded") === "true";
    buttonEl.setAttribute("aria-expanded", !isExpanded);
  
    const arrow = buttonEl.querySelector(".toggle-arrow");
    if (arrow) {
      arrow.textContent = isExpanded ? "▸" : "▼";
    }
  
    if (scroll && !isExpanded) {
      setTimeout(() => {
        buttonEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    }
  
    if (scroll) {
      // If it's a region or county (larger blocks)
      contentEl.hidden = isExpanded;
    } else {
      // If it's a site (small block)
      contentEl.style.display = isExpanded ? "none" : "block";
    }
  }
  
});
