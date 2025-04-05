console.log("✅ list.js loaded");

document.addEventListener("DOMContentLoaded", () => {
    const regionMap = {
        "Central Sand Prairie": {
            file: "Central_Points.csv",
            key: "central-sands"
        },
        "Lake Michigan": {
            file: "Lake_Points.csv",
            key: "lake-michigan"
        },
        "Mississippi/Chippewa Rivers": {
            file: "Mississippi_Points.csv",
            key: "mississippi"
        },
        "Lake Superior Northwoods": {
            file: "Northwoods_Points.csv",
            key: "lake-superior"
        },
        "Southern Savanna": {
            file: "Savannah_Points.csv",
            key: "southern-savanna"
        }
    };

    let countyDescriptions = {};

    fetch("assets/County_Descriptions.csv")
        .then(res => res.text())
        .then(csv => {
            const parsed = Papa.parse(csv, { header: true }).data;
            parsed.forEach(row => {
                if (row.county && row.description) {
                    const key = `${row.region.trim().toLowerCase()}|${row.county.trim().toLowerCase()}`;
                    countyDescriptions[key] = row.description.trim();
                }
            });
            loadAllRegions();
        });

    function loadAllRegions() {
        const container = document.getElementById("region-list");

        Object.entries(regionMap).forEach(([regionName, { file, key }]) => {
            fetch(`assets/${file}`)
                .then(res => res.text())
                .then(csv => {
                    const parsed = Papa.parse(csv, { header: true }).data;
                    const countyPoints = {};

                    parsed.forEach(site => {
                        const county = site.county?.trim();
                        if (!county) return;

                        if (!countyPoints[county]) countyPoints[county] = [];
                        countyPoints[county].push(site);
                    });

                    // REGION card
                    const regionCard = document.createElement("div");
                    regionCard.className = "card mb-3";

                    const regionHeader = document.createElement("div");
                    regionHeader.className = "card-header";

                    const regionButton = document.createElement("button");
                    regionButton.className = "btn btn-primary w-100 text-start fw-bold";
                    regionButton.setAttribute("data-bs-toggle", "collapse");
                    regionButton.setAttribute("data-bs-target", `#collapse-${key}`);
                    regionButton.textContent = regionName;

                    regionHeader.appendChild(regionButton);
                    regionCard.appendChild(regionHeader);

                    const regionBody = document.createElement("div");
                    regionBody.className = "collapse";
                    regionBody.id = `collapse-${key}`;

                    const regionInner = document.createElement("div");
                    regionInner.className = "card-body";

                    const sortedCounties = Object.keys(countyPoints).sort();
                    sortedCounties.forEach(county => {
                        const countyKey = `${key}|${county.toLowerCase()}`;
                        const countyDesc = countyDescriptions[countyKey] || "No description available.";

                        // COUNTY accordion
                        const countyId = `county-${key}-${county.replace(/\s+/g, '-')}`;
                        const countyCard = document.createElement("div");
                        countyCard.className = "accordion-item";

                        const countyHeader = document.createElement("h2");
                        countyHeader.className = "accordion-header";

                        const countyButton = document.createElement("button");
                        countyButton.className = "accordion-button collapsed fw-semibold bg-light";
                        countyButton.setAttribute("data-bs-toggle", "collapse");
                        countyButton.setAttribute("data-bs-target", `#${countyId}`);
                        countyButton.innerText = county;

                        countyHeader.appendChild(countyButton);
                        countyCard.appendChild(countyHeader);

                        const countyCollapse = document.createElement("div");
                        countyCollapse.className = "accordion-collapse collapse";
                        countyCollapse.id = countyId;

                        const countyBody = document.createElement("div");
                        countyBody.className = "accordion-body";

                        const descP = document.createElement("p");
                        descP.innerHTML = `<em>${countyDesc}</em>`;
                        countyBody.appendChild(descP);

                        const ul = document.createElement("ul");
                        countyPoints[county].sort((a, b) => a.Name.localeCompare(b.Name)).forEach(site => {
                            const li = document.createElement("li");
                            const cleanName = site.Name.replace(/^\s*\d+\.?\s*/, "");
                            const siteBtn = document.createElement("button");
                            siteBtn.className = "btn btn-link btn-sm text-start site-entry";
                            siteBtn.setAttribute("data-bs-toggle", "collapse");
                            siteBtn.setAttribute("data-bs-target", `#site-${key}-${cleanName.replace(/\s+/g, '-')}`);
                            siteBtn.textContent = cleanName;

                            const siteCollapse = document.createElement("div");
                            siteCollapse.className = "collapse mb-2";
                            siteCollapse.id = `site-${key}-${cleanName.replace(/\s+/g, '-')}`;
                            siteCollapse.innerHTML = `<div class="ms-4">${site.site_desc || "No description available."}</div>`;

                            li.appendChild(siteBtn);
                            li.appendChild(siteCollapse);
                            ul.appendChild(li);
                        });

                        countyBody.appendChild(ul);
                        countyCollapse.appendChild(countyBody);
                        countyCard.appendChild(countyCollapse);
                        regionInner.appendChild(countyCard);
                    });

                    regionBody.appendChild(regionInner);
                    regionCard.appendChild(regionBody);
                    container.appendChild(regionCard);
                });
        });
    }
});
