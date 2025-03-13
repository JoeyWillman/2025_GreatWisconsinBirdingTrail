console.log("✅ map.js is running");

document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ DOM Loaded");

    function getQueryParam(param) {
        let urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    const region = getQueryParam("region");
    if (!region) {
        console.log("No region specified. Loading default map.");
    }

    const map = L.map("map").setView([44.5, -89.5], 7);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    fetch("assets/data/sites.csv")
        .then((res) => res.text())
        .then((data) => {
            let parsedData = Papa.parse(data, { header: true }).data;

            parsedData.forEach(site => {
                if (!region || site.region.toLowerCase() === region.toLowerCase()) {
                    const lat = parseFloat(site.lat);
                    const lon = parseFloat(site.long);
                    if (!isNaN(lat) && !isNaN(lon)) {
                        const marker = L.marker([lat, lon]).addTo(map);
                        marker.bindPopup(`<b>${site.name}</b><br><a href="tour.html?site_id=${site.site_id}">View Site</a>`);
                    }
                }
            });
        })
        .catch((error) => console.error("❌ Error loading site data:", error));
});
