// PIT-TRACK - Konfigurasi Peta Pemantauan Leaflet.js Real-Time

let map = null;
let mapMarkers = {}; // Menyimpan objek marker Leaflet berdasarkan Unit ID
let concessionArea = null;

// Konfigurasi Ikon FontAwesome berdasarkan Tipe Unit Alat Berat
const UNIT_ICONS = {
    'Dump Truck': 'fa-solid fa-truck',
    'Excavator': 'fa-solid fa-person-digging',
    'Bulldozer': 'fa-solid fa-tractor',
    'Loader': 'fa-solid fa-snowplow',
    'Fuel Truck': 'fa-solid fa-gas-pump'
};

// Inisialisasi Peta
function initMap() {
    // Pusat koordinat tambang di Sangatta/Samarinda Kaltim
    const center = [-0.4500, 117.1500];
    
    // Inisialisasi Leaflet Map
    map = L.map('map', {
        center: center,
        zoom: 14,
        zoomControl: true,
        maxZoom: 18,
        minZoom: 12
    });

    // Peta Gelap CartoDB Dark Matter (sangat premium untuk dipadukan dengan aksen neon)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // Menggambar Batas Area Konsesi Tambang (Concession Bounds Polygon)
    concessionArea = L.polygon(MINING_CONCESSION_BOUNDS, {
        color: '#8b5cf6', // Aksen Ungu Neon untuk batas area tambang
        fillColor: '#8b5cf6',
        fillOpacity: 0.03,
        weight: 2,
        dashArray: '5, 8'
    }).addTo(map);
    concessionArea.bindTooltip("Batas Area Konsesi Tambang Mahakam Prima", { sticky: true, className: 'custom-tooltip' });

    // Tandai lokasi-lokasi stasis penting di peta
    drawStationaryLocations();

    // Gambar marker unit pertama kali
    updateMapMarkers();
}

// Fungsi Menggambar Lokasi Stasioner di Area Pertambangan
function drawStationaryLocations() {
    const locStyles = [
        { coords: LOCATIONS.pitA, name: "Loading Pit A (Mahakam)", color: "#10b981", radius: 100 },
        { coords: LOCATIONS.pitB, name: "Loading Pit B (Barat)", color: "#10b981", radius: 100 },
        { coords: LOCATIONS.stockpile, name: "Stockpile & Port Batubara", color: "#f59e0b", radius: 120 },
        { coords: LOCATIONS.workshop, name: "Workshop Utama & Maintenance Bay", color: "#3b82f6", radius: 80 },
        { coords: LOCATIONS.office, name: "Kantor & Mess Karyawan", color: "#6b7280", radius: 70 }
    ];

    locStyles.forEach(loc => {
        // Gambarkan lingkaran area
        L.circle(loc.coords, {
            color: loc.color,
            fillColor: loc.color,
            fillOpacity: 0.05,
            weight: 1.5,
            dashArray: '3, 5'
        }).addTo(map);

        // Tandai dengan Marker Bulat Halus
        const stationaryMarker = L.circleMarker(loc.coords, {
            radius: 5,
            color: '#fff',
            fillColor: loc.color,
            fillOpacity: 0.9,
            weight: 1
        }).addTo(map);
        
        stationaryMarker.bindTooltip(loc.name, {
            permanent: false,
            direction: 'top',
            offset: [0, -5],
            className: 'location-tooltip'
        });
    });
}

// Fungsi untuk Merender / Memperbarui Seluruh Marker Unit Real-time
function updateMapMarkers() {
    if (!map) return;

    unitsData.forEach(unit => {
        const iconClass = UNIT_ICONS[unit.type] || 'fa-solid fa-gear';
        const statusClass = unit.status.toLowerCase();
        
        // Buat HTML DivIcon kustom agar bisa di-style di CSS dengan bayangan neon berdenyut
        const customIcon = L.divIcon({
            html: `<div class="custom-marker ${statusClass}"><i class="${iconClass}"></i></div>`,
            className: 'marker-container', // Bersihkan border bawaan Leaflet
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            popupAnchor: [0, -14]
        });

        // Konten Popup Detil Unit
        const popupContent = `
            <div class="map-popup-card">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom:8px; margin-bottom:8px;">
                    <strong style="color:#fff; font-size:0.95rem;">${unit.id}</strong>
                    <span class="status-badge ${statusClass}" style="padding: 2px 8px; font-size:0.7rem;">
                        <span class="dot"></span>${unit.status}
                    </span>
                </div>
                <div style="font-size: 0.78rem; color: #9ca3af; display:flex; flex-direction:column; gap:4px; min-width:180px;">
                    <div><strong>Model:</strong> ${unit.name}</div>
                    <div><strong>Subkon:</strong> ${unit.subcon.split(' (')[0]}</div>
                    <div><strong>Operator:</strong> ${unit.operator}</div>
                    <div style="display:flex; justify-content:space-between; margin-top:4px;">
                        <span><strong>BBM:</strong> ${unit.fuel}%</span>
                        <span><strong>HM:</strong> ${unit.hm.toFixed(1)} jam</span>
                    </div>
                    <div style="margin-top:2px;"><strong>Kecepatan:</strong> ${unit.speed} km/jam</div>
                </div>
                <button onclick="openDetailUnitModal('${unit.id}')" style="margin-top: 10px; width: 100%; padding: 6px; background: var(--accent-gradient); border: none; border-radius: 4px; color: #fff; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: 0.2s;">
                    Buka Panel Detail <i class="fa-solid fa-arrow-right" style="margin-left:4px;"></i>
                </button>
            </div>
        `;

        if (mapMarkers[unit.id]) {
            // Jika marker sudah ada, update posisi, ikon, dan konten popup
            const marker = mapMarkers[unit.id];
            marker.setLatLng([unit.lat, unit.lng]);
            marker.setIcon(customIcon);
            
            // Perbarui popup jika sedang terbuka
            if (marker.getPopup() && marker.isPopupOpen()) {
                marker.setPopupContent(popupContent);
            } else {
                marker.bindPopup(popupContent);
            }
        } else {
            // Jika marker belum ada, buat marker baru
            const marker = L.marker([unit.lat, unit.lng], { icon: customIcon })
                .bindPopup(popupContent)
                .addTo(map);
            
            // Simpan referensi marker ke dictionary
            mapMarkers[unit.id] = marker;
        }
    });

    // Periksa jika ada unit yang dihapus dari unitsData (opsional)
    Object.keys(mapMarkers).forEach(id => {
        if (!unitsData.find(u => u.id === id)) {
            map.removeLayer(mapMarkers[id]);
            delete mapMarkers[id];
        }
    });
}

// Fungsi untuk Melacak & Auto-Pan Peta ke Unit Tertentu
function focusUnitOnMap(unitId) {
    const unit = unitsData.find(u => u.id === unitId);
    const marker = mapMarkers[unitId];
    
    if (unit && marker) {
        map.setView([unit.lat, unit.lng], 16, {
            animate: true,
            duration: 1.0
        });
        
        // Buka popup marker setelah pan selesai
        setTimeout(() => {
            marker.openPopup();
        }, 500);
    }
}
