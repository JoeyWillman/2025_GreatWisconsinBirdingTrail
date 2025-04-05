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
        maxBounds: [
            [41.5, -93.0], // Southwest corner (expanded for padding)
            [47.5, -86.0]  // Northeast corner (expanded for padding)
        ],
        maxBoundsViscosity: 1.0,  // Ensure the boundary is enforced strongly
        zoomControl: true,
        scrollWheelZoom: true,  // Enable zooming with mouse wheel
        minZoom: 6,  // Minimum zoom level (change based on your preferred zoom range)
        maxZoom: 15,  // Maximum zoom level (change based on your preferred zoom range)
        layers: [
            L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
                attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
                subdomains: "abcd",
                maxZoom: 19
            })
        ],
    });

    // Ensure the map doesn't scroll out of bounds
    map.setMaxBounds([
        [42.0, -92.0], // Southwest corner of Wisconsin
        [47.0, -87.0]  // Northeast corner of Wisconsin
    ]);

    let countyDescriptions = {};

    fetch("assets/County_Descriptions.csv")
    .then(res => res.text())
    .then(csv => {
        const parsed = Papa.parse(csv, { header: true }).data;
        console.log("🔍 Parsed county description rows:", parsed);

        parsed.forEach(row => {
            if (row.county && row.description) {
                countyDescriptions[row.county.trim().toLowerCase()] = row.description.trim();
            }
        });

        console.log("✅ Loaded county descriptions:", countyDescriptions);
    })
    .catch(err => console.error("❌ Error loading county descriptions:", err));

    fetch("assets/County_Boundaries.geojson")
.then(res => res.json())
.then(data => {
    const selected = data.features.filter(f =>
        regionData.counties.includes(f.properties.COUNTY_NAME)
    );

    const unselected = data.features.filter(f =>
        !regionData.counties.includes(f.properties.COUNTY_NAME)
    );

    // ✅ Add selected counties with interactivity
    const countyLayer = L.geoJSON(selected, {
        style: {
            color: "#000",
            weight: 1.5,
            fillOpacity: 0,
            dashArray: "4"
        },
        onEachFeature: function (feature, layer) {
            layer.on({
                mouseover: function (e) {
                    e.target.setStyle({
                        fillOpacity: 0.1
                    });
                },
                mouseout: function (e) {
                    e.target.setStyle({
                        fillOpacity: 0
                    });
                },
                click: function (e) {
                    const countyName = feature.properties.COUNTY_NAME.trim();
                    const key = countyName.toLowerCase();
                    const description = countyDescriptions[key] || "No description available for this county.";

                    document.getElementById("county-title").innerText = countyName + " County";
                    document.getElementById("county-description").innerHTML = description;
                    document.getElementById("sidebar").classList.add("open");
                }
            });
        }
    }).addTo(map);

    // 🧼 Add invisible non-interactive unselected counties to prevent ghost interactivity
    L.geoJSON(unselected, {
        style: {
            fillOpacity: 0,
            opacity: 0
        },
        interactive: false  // Ensure these counties are non-interactive
    }).addTo(map);

    map.fitBounds(countyLayer.getBounds());

    // Label code for county boundaries
    selected.forEach(feature => {
        const bounds = L.geoJSON(feature).getBounds();
        const center = bounds.getCenter();
        const label = L.divIcon({
            className: 'county-label',
            html: `<span style="color: black; font-weight: bold; text-shadow: 1px 1px 0 white, -1px 1px 0 white, 1px -1px 0 white, -1px -1px 0 white;">${feature.properties.COUNTY_NAME}</span>`
        });
        L.marker(center, { icon: label, interactive: false }).addTo(map);
    });

    // Mask everything outside selected counties (Ensure hover effect is only for counties)
    const outer = [[-90, -360], [-90, 360], [90, 360], [90, -360]];

    const holes = selected.flatMap(feature => {
        if (feature.geometry.type === "Polygon") {
            return [feature.geometry.coordinates[0].map(c => [c[1], c[0]])];
        } else if (feature.geometry.type === "MultiPolygon") {
            return feature.geometry.coordinates.map(polygon =>
                polygon[0].map(c => [c[1], c[0]]))
        } else {
            return [];
        }
    });

    const mask = L.polygon(
        [outer, ...holes],
        {
            fillColor: "#000",
            fillOpacity: 0.4,
            stroke: false,
            interactive: false  // ✅ Disable all mouse interaction
        }
    ).addTo(map);

    // Add Wisconsin State Boundary
    fetch("assets/WI_Boundary.geojson")
    .then(res => res.json())
    .then(wiData => {
        L.geoJSON(wiData, {
            style: {
                color: "#333",     // Dark gray border
                weight: 2.5,
                fillOpacity: 0
            },
            interactive: false  // Disable all interactions, including hover
        }).addTo(map);
        console.log("✅ Wisconsin boundary added.");
    })
    .catch(err => console.error("❌ Error loading Wisconsin boundary:", err));

})
.catch(err => console.error("❌ Error loading county boundaries:", err));



    const dataPath = `assets/${regionData.file}`;
    console.log("📂 Fetching data from:", dataPath);

    fetch(dataPath)
        .then((res) => {
            if (!res.ok) throw new Error(`Failed to load CSV: ${res.statusText}`);
            return res.text();
        })
        .then((csv) => {
            const parsedData = Papa.parse(csv, { header: true }).data;
            console.log(`✅ Loaded ${parsedData.length} rows from CSV.`);

            let addedSites = 0;

            parsedData.forEach(site => {
                const lat = parseFloat(site.lat);
                const lon = parseFloat(site.lon);

                if (isNaN(lat) || isNaN(lon)) {
                    console.warn(`⚠️ Skipped invalid coordinates for site: ${site.Name || site.name}`);
                    return;
                }

                if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
                    console.warn(`⚠️ Skipped out-of-range coordinates for site: ${site.Name || site.name}`);
                    return;
                }

                const name = site.Name || site.name || "";
                const numberMatch = name.match(/^(\d+)/);
                const siteNumber = numberMatch ? numberMatch[1] : "?";

                const customIcon = L.divIcon({
                    className: "custom-number-icon",
                    html: `
                        <div class="custom-number-marker">
                            ${siteNumber}
                        </div>
                    `,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14],
                    popupAnchor: [0, -14]
                });

                const marker = L.marker([lat, lon], { icon: customIcon }).addTo(map);
                marker.bindPopup(`
                    <b>${name}</b><br>
                    ${site.description || ""}<br><br>
                    <a href="tour.html?site_id=${encodeURIComponent(name)}">View Site</a>
                `);

                addedSites++;
            });

            if (addedSites === 0) {
                console.warn("⚠️ No valid coordinates found in this file.");
            } else {
                console.log(`✅ Added ${addedSites} markers to the map.`);
            }
        })
        .catch((error) => console.error("❌ Error loading site data:", error));
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
