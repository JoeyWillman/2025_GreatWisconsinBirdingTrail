console.log("✅ map.js is running");

// Global variables
let currentLat = null;
let currentLon = null;
let siteMarkers = [];
let currentSiteIndex = -1;
let countyLabelMarkers = [];
let outerMask = null;
let countyLayers = [];
let countyHoverHandlers = new Map();

document.addEventListener("DOMContentLoaded", function () {
    function getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    const region = getQueryParam("region");
    if (!region) {
        window.location.href = "index.html";
        return;
    }

    const mapElement = document.getElementById("map");
    if (!mapElement) return;

    const regionMap = {
        "central-sands": { file: "Central_Points.csv", counties: ["Adams", "Calumet", "Clark", "Fond du Lac", "Green Lake", "Juneau", "Marathon", "Marquette", "Menominee", "Monroe", "Outagamie", "Portage", "Shawano", "Waupaca", "Waushara", "Winnebago", "Wood"] },
        "lake-michigan": { file: "Lake_Points.csv", counties: ["Brown", "Door", "Kenosha", "Kewaunee", "Manitowoc", "Marinette", "Milwaukee", "Oconto", "Ozaukee", "Racine", "Sheboygan"] },
        "mississippi": { file: "Mississippi_Points.csv", counties: ["St. Croix", "Dunn", "Chippewa", "Eau Claire", "Pierce", "Pepin", "Buffalo", "Trempealeau", "La Crosse", "Vernon", "Jackson", "Crawford", "Grant"] },
        "lake-superior": { file: "Northwoods_Points.csv", counties: ["Bayfield", "Barron", "Lincoln", "Douglas", "Sawyer", "Burnett", "Washburn", "Rusk", "Polk", "Ashland", "Iron", "Vilas", "Florence", "Oneida", "Price", "Taylor", "Langlade", "Forest"] },
        "southern-savanna": { file: "Savannah_Points.csv", counties: ["Columbia", "Dane", "Dodge", "Green", "Iowa", "Jefferson", "Lafayette", "Richland", "Rock", "Sauk", "Walworth", "Washington", "Waukesha"] }
    };

    const regionKey = region.toLowerCase();
    const regionData = regionMap[regionKey];
    if (!regionData) {
        window.location.href = "index.html";
        return;
    }

    const baseLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> contributors',
        subdomains: "abcd",
    });
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri'
    });

    const map = L.map(mapElement, {
        maxBounds: [[40.5, -94.0], [48.5, -85.0]],
        maxBoundsViscosity: 1.0,
        zoomControl: true,
        scrollWheelZoom: true,
        minZoom: 6,
        maxZoom: 18,
        layers: [baseLayer]
    });

    // ✅ UPDATED: Create a custom low z-index pane for the mask
    map.createPane("backgroundMask");
    map.getPane("backgroundMask").style.zIndex = "200";

    L.control.layers(null, { "Satellite View": satelliteLayer }, { position: "bottomleft" }).addTo(map);
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
            const countyLayer = L.geoJSON(selected, {
                style: {
                    color: "#000",
                    weight: 1.5,
                    fillOpacity: 0,
                    dashArray: "4",
                    pane: "overlayPane"
                },
                onEachFeature: (feature, layer) => {
                    layer.on("click", () => {
                        const name = feature.properties.COUNTY_NAME.trim();
                        const desc = countyDescriptions[name.toLowerCase()] || "No description available.";
                        openSidebar(name + " County", desc, null, null, false);
                    });

                    const onHover = e => {
                        e.target.setStyle({
                            weight: 3,
                            color: "#1B2F4E",  // Stroke color as backup
                            dashArray: "",
                            fillOpacity: 0
                        });
                        const el = e.target.getElement();
                        if (el) el.classList.add("hover-outline");
                    };
                    
                    const offHover = e => {
                        e.target.setStyle({
                            weight: 1.5,
                            color: "#000",
                            dashArray: "4",
                            fillOpacity: 0
                        });
                        const el = e.target.getElement();
                        if (el) el.classList.remove("hover-outline");
                    };
                    
                    layer.on("mouseover", onHover);
                    layer.on("mouseout", offHover);

                    countyHoverHandlers.set(layer, { onHover, offHover });
                    countyLayers.push(layer);
                }
            }).addTo(map);

            const bounds = countyLayer.getBounds();
            map.fitBounds(bounds, { padding: [20, 20] });
            if (regionKey === "lake-superior") map.setView(bounds.getCenter(), 8);

            selected.forEach(feature => {
                const center = L.geoJSON(feature).getBounds().getCenter();
                const label = L.divIcon({
                    className: 'county-label',
                    html: `<span style="color: black; font-weight: bold; text-shadow: 1px 1px 0 white;">${feature.properties.COUNTY_NAME}</span>`
                });
                countyLabelMarkers.push(L.marker(center, { icon: label, interactive: false }).addTo(map));
            });

            // ✅ UPDATED: Mask moved to separate low-z pane to avoid visual bleed
            const outer = [[-90, -360], [-90, 360], [90, 360], [90, -360]];
            const holes = selected.flatMap(f =>
                f.geometry.type === "Polygon"
                    ? [f.geometry.coordinates[0].map(c => [c[1], c[0]])]
                    : f.geometry.coordinates.map(p => p[0].map(c => [c[1], c[0]]))
            );
            outerMask = L.polygon([outer, ...holes], {
                fillColor: "#000",
                fillOpacity: 0.4,
                stroke: false,
                interactive: false,
                pane: "backgroundMask" // ✅ Use the new low z-index pane
            }).addTo(map);

            map.on("zoomend", () => {
                const zoom = map.getZoom();
                countyLabelMarkers.forEach(m => zoom >= 12 ? map.removeLayer(m) : map.addLayer(m));
                countyLayers.forEach(layer => {
                    const handlers = countyHoverHandlers.get(layer);
                    if (!handlers) return;
                    if (zoom >= 12) {
                        layer.off("mouseover", handlers.onHover);
                        layer.off("mouseout", handlers.offHover);
                        layer.setStyle({ fillOpacity: 0 });
                    } else {
                        layer.on("mouseover", handlers.onHover);
                        layer.on("mouseout", handlers.offHover);
                    }
                });
            });

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
            const parsed = Papa.parse(csv, { header: true }).data;
            parsed.forEach((site, index) => {
                const lat = parseFloat(site.lat);
                const lon = parseFloat(site.lon);
                if (isNaN(lat) || isNaN(lon)) return;

                const rawName = site.Name || site.name || "";
                const numberMatch = rawName.match(/^(\d+)/);
                const siteNumber = numberMatch ? numberMatch[1] : "?";
                const cleanName = rawName.replace(/^\s*\d+\s*[\.\-\s]?\s*/, "");

                const marker = L.marker([lat, lon], {
                    icon: L.divIcon({
                        className: "custom-number-icon",
                        html: `<div class="custom-number-marker">${siteNumber}</div>`,
                        iconSize: [28, 28],
                        iconAnchor: [14, 14]
                    })
                }).addTo(map);

                marker.on("click", () => {
                    currentSiteIndex = index;
                    openSidebar(cleanName, site.site_desc || "No description available.", lat, lon, true);
                    map.setView([lat, lon], 13);
                });

                siteMarkers.push({ marker, site, lat, lon, name: cleanName, siteNumber });
            });

            document.getElementById("next-button")?.addEventListener("click", () => {
                if (currentSiteIndex >= 0) {
                    let nextIndex = currentSiteIndex + 1;
                    while (nextIndex < siteMarkers.length && siteMarkers[nextIndex].siteNumber === siteMarkers[currentSiteIndex].siteNumber) {
                        nextIndex++;
                    }
                    if (nextIndex < siteMarkers.length) {
                        currentSiteIndex = nextIndex;
                        const { site, lat, lon, name } = siteMarkers[nextIndex];
                        openSidebar(name, site.site_desc || "No description available.", lat, lon, true);
                        map.setView([lat, lon], 18);
                    }
                }
            });

            document.getElementById("prev-button")?.addEventListener("click", () => {
                if (currentSiteIndex > 0) {
                    let prevIndex = currentSiteIndex - 1;
                    while (prevIndex >= 0 && siteMarkers[prevIndex].siteNumber === siteMarkers[currentSiteIndex].siteNumber) {
                        prevIndex--;
                    }
                    if (prevIndex >= 0) {
                        currentSiteIndex = prevIndex;
                        const { site, lat, lon, name } = siteMarkers[prevIndex];
                        openSidebar(name, site.site_desc || "No description available.", lat, lon, true);
                        map.setView([lat, lon], 18);
                    }
                }
            });
        });

    document.getElementById("directions-button")?.addEventListener("click", () => {
        if (currentLat !== null && currentLon !== null) {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${currentLat},${currentLon}`;
            window.open(url, "_blank");
        }
    });
});

function openSidebar(title, description, lat = null, lon = null, isSite = false) {
    const sidebar = document.getElementById("sidebar");
    document.getElementById("county-title").innerText = title;
    document.getElementById("county-description").innerHTML = description;
    sidebar.classList.add("open");
    currentLat = lat;
    currentLon = lon;
    document.getElementById("directions-button").style.display = lat !== null && lon !== null ? "block" : "none";
    document.getElementById("site-nav").style.display = isSite ? "flex" : "none";
}

function closeSidebar() {
    document.getElementById("sidebar").classList.remove("open");
}
