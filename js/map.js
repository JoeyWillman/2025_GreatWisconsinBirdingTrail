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
    const map = L.map(mapElement);

    // Base layer
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19
    }).addTo(map);

    fetch("assets/County_Boundaries.geojson")
        .then(res => res.json())
        .then(data => {
            const selected = data.features.filter(f =>
                regionData.counties.includes(f.properties.COUNTY_NAME)
            );

            const countyLayer = L.geoJSON(selected, {
                style: {
                    color: "#000",
                    weight: 1.5,
                    fillOpacity: 0,
                    dashArray: "4"
                }
            }).addTo(map);

            map.fitBounds(countyLayer.getBounds());

            // Add county labels
            selected.forEach(feature => {
                const bounds = L.geoJSON(feature).getBounds();
                const center = bounds.getCenter();
                const label = L.divIcon({
                    className: 'county-label',
                    html: `<span style="color: black; font-weight: bold; text-shadow: 1px 1px 0 white, -1px 1px 0 white, 1px -1px 0 white, -1px -1px 0 white;">${feature.properties.COUNTY_NAME}</span>`
                });
                L.marker(center, { icon: label, interactive: false }).addTo(map);
            });

            // Mask everything outside selected counties
const outer = [[-90, -360], [-90, 360], [90, 360], [90, -360]];

const holes = selected.flatMap(feature => {
    if (feature.geometry.type === "Polygon") {
        return [feature.geometry.coordinates[0].map(c => [c[1], c[0]])];
    } else if (feature.geometry.type === "MultiPolygon") {
        return feature.geometry.coordinates.map(polygon =>
            polygon[0].map(c => [c[1], c[0]])
        );
    } else {
        return [];
    }
});

const mask = L.polygon(
    [outer, ...holes],
    {
        fillColor: "#000",
        fillOpacity: 0.4,
        stroke: false
    }
).addTo(map);
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
