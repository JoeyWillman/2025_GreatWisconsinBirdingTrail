console.log("✅ index.js is running");

document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ DOM Loaded");

    const regions = {
        "superior": { element: "map-superior", center: [46.5, -91], zoom: 7 },
        "northwoods": { element: "map-northwoods", center: [45.8, -89.5], zoom: 7 },
        "central": { element: "map-central", center: [44.5, -89.5], zoom: 7 },
        "southeast": { element: "map-southeast", center: [43.2, -88.5], zoom: 7 },
        "southwest": { element: "map-southwest", center: [43.0, -90.5], zoom: 7 },
        "mississippi": { element: "map-mississippi", center: [43.5, -91.0], zoom: 7 }
    };

    function loadMap(regionKey) {
        const region = regions[regionKey];
        if (!region) return;

        const map = L.map(region.element).setView(region.center, region.zoom);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors"
        }).addTo(map);

        fetch("assets/data/sites.csv")
            .then((res) => res.text())
            .then((data) => {
                let parsedData = Papa.parse(data, { header: true }).data;

                parsedData.forEach(site => {
                    if (site.region.toLowerCase().includes(regionKey)) {
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
    }

    Object.keys(regions).forEach(regionKey => {
        loadMap(regionKey);
    });
});
