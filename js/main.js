console.log("✅ main.js is running");

// Initialize the map
var map = L.map('map').setView([43.0731, -89.4012], 10);

// Add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Fetch and display site markers from CSV
fetch('assets/data/sites.csv')
    .then(res => res.text())
    .then(data => {
        let parsedData = Papa.parse(data, { header: true }).data;
        parsedData.forEach(site => {
            let lat = parseFloat(site.lat);
            let lon = parseFloat(site.long);

            if (!isNaN(lat) && !isNaN(lon)) {
                // ✅ Add marker with valid coordinates
                L.marker([lat, lon])
                    .addTo(map)
                    .bindPopup(`<b>${site.name}</b><br>${site.description}
                    <br><button onclick="window.location.href='tour.html?site_id=${site.site_id}'">View Site</button>`);
            } else {
                console.warn(`⚠️ Skipping site due to missing coordinates: ${site.name}`);
            }
        });

        // If no markers were added, notify the user
        if (map.getBounds().isEmpty()) {
            alert("⚠️ No valid locations found. Please check if lat/long values are available in sites.csv.");
        }
    })
    .catch(error => console.error("❌ Error loading sites.csv:", error));
