console.log("✅ map.js is running");

document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ DOM Loaded");

    function getQueryParam(param) {
        let urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    const region = getQueryParam("region");
    console.log("Selected region:", region);

    if (!region) {
        console.error("No region specified. Redirecting to home.");
        window.location.href = "index.html";
        return;
    }

    if (!document.getElementById("map")) {
        console.error("❌ Map container not found!");
        return;
    }

    console.log("✅ Initializing map...");
    const map = L.map("map").setView([44.5, -89.5], 7);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    console.log("✅ Fetching sites data...");
    fetch("assets/data/sites.csv")
        .then((res) => res.text())
        .then((data) => {
            let parsedData = Papa.parse(data, { header: true }).data;
            console.log(`✅ Loaded ${parsedData.length} sites.`);

            let addedSites = 0;

            parsedData.forEach(site => {
                if (site.region.toLowerCase().replace(/\s+/g, "-") === region.toLowerCase()) {
                    const lat = parseFloat(site.lat);
                    const lon = parseFloat(site.long);
                    if (!isNaN(lat) && !isNaN(lon)) {
                        const marker = L.marker([lat, lon]).addTo(map);
                        marker.bindPopup(`<b>${site.name}</b><br><a href="tour.html?site_id=${site.site_id}">View Site</a>`);
                        addedSites++;
                    }
                }
            });

            if (addedSites === 0) {
                console.warn("⚠️ No sites found for this region.");
            } else {
                console.log(`✅ Added ${addedSites} markers to the map.`);
            }
        })
        .catch((error) => console.error("❌ Error loading site data:", error));
});
