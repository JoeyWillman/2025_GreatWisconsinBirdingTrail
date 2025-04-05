console.log("✅ map.js is running");

document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ DOM Loaded");

    function getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    const region = getQueryParam("region");
    console.log("Selected region:", region);

    if (!region) {
        console.error("❌ No region specified. Redirecting to home.");
        window.location.href = "index.html";
        return;
    }

    const mapElement = document.getElementById("map");
    if (!mapElement) {
        console.error("❌ Map container not found!");
        return;
    }

    const regionMap = {
        "central-sands": {
            file: "Central_Points.csv",
            counties: ["Adams", "Calumet", "Clark", "Fond du Lac", "Green Lake", "Juneau", "Marathon", "Marquette", "Menominee", "Monroe", "Outagamie", "Portage", "Shawano", "Waupaca", "Waushara", "Winnebago", "Wood"]
        },
        "lake-michigan": {
            file: "Lake_Points.csv",
            counties: ["Brown", "Door", "Kenosha", "Kewaunee", "Manitowoc", "Marinette", "Milwaukee", "Oconto", "Ozaukee", "Racine", "Sheboygan"]
        },
        "mississippi": {
            file: "Mississippi_Points.csv",
            counties: ["St. Croix", "Dunn", "Chippewa", "Eau Claire", "Pierce", "Pepin", "Buffalo", "Trempealeau", "La Crosse", "Vernon", "Jackson", "Crawford", "Grant"]
        },
        "lake-superior": {
            file: "Northwoods_Points.csv",
            counties: ["Bayfield", "Barron", "Lincoln", "Douglas", "Sawyer", "Burnett", "Washburn", "Rusk", "Polk", "Ashland", "Iron", "Vilas", "Florence", "Oneida", "Price", "Taylor", "Langlade", "Forest"]
        },
        "southern-savanna": {
            file: "Savannah_Points.csv",
            counties: ["Columbia", "Dane", "Dodge", "Green", "Iowa", "Jefferson", "Lafayette", "Richland", "Rock", "Sauk", "Walworth", "Washington", "Waukesha"]
        }
    };

    const regionKey = region.toLowerCase();
    const regionData = regionMap[regionKey];
    if (!regionData) {
        console.error("❌ Invalid region specified. Redirecting to home.");
        window.location.href = "index.html";
        return;
    }

    console.log("✅ Initializing map...");

    const map = L.map(mapElement, {
        maxBounds: [[40.5, -94.0], [48.5, -85.0]],
        maxBoundsViscosity: 1.0,
        zoomControl: true,
        scrollWheelZoom: true,
        minZoom: 6,
        maxZoom: 15,
        layers: [
            L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
                attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
                subdomains: "abcd",
                maxZoom: 19
            })
        ]
    });

    map.setMaxBounds([[41.0, -93.5], [48.0, -86.5]]);

    let countyDescriptions = {};

    fetch("assets/County_Descriptions.csv")
        .then(res => res.text())
        .then(csv => {
            const parsed = Papa.parse(csv, { header: true }).data;
            parsed.forEach(row => {
                if (row.county && row.description) {
                    countyDescriptions[row.county.trim().toLowerCase()] = row.description.trim();
                }
            });
        });

    fetch("assets/County_Boundaries.geojson")
        .then(res => res.json())
        .then(data => {
            const selected = data.features.filter(f => regionData.counties.includes(f.properties.COUNTY_NAME));
            const unselected = data.features.filter(f => !regionData.counties.includes(f.properties.COUNTY_NAME));

            const countyLayer = L.geoJSON(selected, {
                style: {
                    color: "#000",
                    weight: 1.5,
                    fillOpacity: 0,
                    dashArray: "4"
                },
                onEachFeature: function (feature, layer) {
                    layer.on({
                        mouseover: e => e.target.setStyle({ fillOpacity: 0.1 }),
                        mouseout: e => e.target.setStyle({ fillOpacity: 0 }),
                        click: e => {
                            const countyName = feature.properties.COUNTY_NAME.trim();
                            const key = countyName.toLowerCase();
                            const description = countyDescriptions[key] || "No description available for this county.";
                            openSidebar(countyName + " County", description);
                        }
                    });
                }
            }).addTo(map);

            L.geoJSON(unselected, {
                style: { fillOpacity: 0, opacity: 0 },
                interactive: false
            }).addTo(map);

            const bounds = countyLayer.getBounds();
            map.fitBounds(bounds, { padding: [20, 20] });

            if (regionKey === "lake-superior") {
                const center = bounds.getCenter();
                map.setView(center, 8);
            }

            selected.forEach(feature => {
                const center = L.geoJSON(feature).getBounds().getCenter();
                const label = L.divIcon({
                    className: 'county-label',
                    html: `<span style="color: black; font-weight: bold; text-shadow: 1px 1px 0 white, -1px 1px 0 white, 1px -1px 0 white, -1px -1px 0 white;">${feature.properties.COUNTY_NAME}</span>`
                });
                L.marker(center, { icon: label, interactive: false }).addTo(map);
            });

            const outer = [[-90, -360], [-90, 360], [90, 360], [90, -360]];
            const holes = selected.flatMap(feature => feature.geometry.type === "Polygon"
                ? [feature.geometry.coordinates[0].map(c => [c[1], c[0]])]
                : feature.geometry.coordinates.map(polygon => polygon[0].map(c => [c[1], c[0]])));

            L.polygon([outer, ...holes], {
                fillColor: "#000",
                fillOpacity: 0.4,
                stroke: false,
                interactive: false
            }).addTo(map);

            fetch("assets/WI_Boundary.geojson")
                .then(res => res.json())
                .then(wiData => {
                    L.geoJSON(wiData, {
                        style: { color: "#333", weight: 2.5, fillOpacity: 0 },
                        interactive: false
                    }).addTo(map);
                });
        });

    const dataPath = `assets/${regionData.file}`;
    fetch(dataPath)
        .then(res => res.text())
        .then(csv => {
            const parsedData = Papa.parse(csv, { header: true }).data;
            parsedData.forEach(site => {
                const lat = parseFloat(site.lat);
                const lon = parseFloat(site.lon);
                if (isNaN(lat) || isNaN(lon)) return;
          
                const rawName = site.Name || site.name || "";
                const numberMatch = rawName.match(/^(\d+)/);
                const siteNumber = numberMatch ? numberMatch[1] : "?";
                const cleanName = rawName.replace(/^\s*\d+\s*[\.\-\s]?\s*/, ""); // Removes leading number and punctuation
          
                const customIcon = L.divIcon({
                  className: "custom-number-icon",
                  html: `<div class="custom-number-marker">${siteNumber}</div>`,
                  iconSize: [28, 28],
                  iconAnchor: [14, 14]
                });

                const marker = L.marker([lat, lon], { icon: customIcon }).addTo(map);
                marker.on("click", () => {
                    const description = `
                        ${site.description || ""}<br>
                        <b>Signature Species:</b> ${site.signature_species || "N/A"}<br>
                        <b>Rare Species:</b> ${site.rare_species || "N/A"}<br>
                        <b>Seasonality:</b> ${site.seasonality || "N/A"}<br>
                        <b>Parking:</b> ${site.parking || "N/A"}<br>
                        <b>Fee:</b> ${site.fee || "N/A"}<br>
                        <b>Food/Lodging:</b> ${site.food_lodging || "N/A"}<br>
                        <b>Gazetteer:</b> ${site.gazetteer || "N/A"}<br>
                        <b>Phone:</b> ${site.phone || "N/A"}<br>
                        <b>Website:</b> ${site.web ? `<a href="${site.web}" target="_blank">${site.web}</a>` : "N/A"}
                    `;
                    openSidebar(cleanName, description);
                });
            });
        });
});

function openSidebar(title, description) {
    const sidebar = document.getElementById("sidebar");
    document.getElementById("county-title").innerText = title;
    document.getElementById("county-description").innerHTML = description;
    sidebar.classList.add("open");
}

function closeSidebar() {
    document.getElementById("sidebar").classList.remove("open");
}
