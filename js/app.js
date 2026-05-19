// PIT-TRACK - Logika Utama Dashboard, State Management, & Integrasi UI

// State Global Dashboard
let activeDetailUnitId = null; // Menyimpan ID unit yang sedang ditinjau di modal detail
let activeTabId = 'tab-charts';

// Peta Koordinat Start Point Default untuk Unit Baru berdasarkan Tipe Alat
const TYPE_START_COORDS = {
    'Dump Truck': ROUTE_HAULING_A[0], // Pit Tambang A
    'Excavator': LOCATIONS.pitA,
    'Bulldozer': LOCATIONS.stockpile,
    'Loader': LOCATIONS.stockpile,
    'Fuel Truck': LOCATIONS.office
};

// Bootstrap Aplikasi saat Window Selesai Memuat
window.addEventListener('DOMContentLoaded', () => {
    // 1. Jalankan Sistem Waktu Real-time
    startClock();

    // 2. Isi Opsi Pilihan Dropdown Subkon di Filter & Form Modal
    populateSubconOptions();

    // 3. Inisialisasi Peta Leaflet
    initMap();

    // 4. Inisialisasi Grafik ApexCharts
    initCharts();

    // 5. Mulai Engine Simulasi secara Otomatis
    startSimulation();

    // 6. Tampilkan Data Pertama Kali ke UI
    updateUI();
});

// Fungsi Sistem Jam Real-time (Waktu Indonesia Tengah - WITA)
function startClock() {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    setInterval(() => {
        const now = new Date();
        
        // Update current-time (compat)
        const timeSpan = document.getElementById('current-time');
        if (timeSpan) {
            timeSpan.textContent = now.toTimeString().split(' ')[0];
        }

        // Update header time in format: HH:MM:SS AM/PM
        const timeHeader = document.getElementById('header-time-string');
        if (timeHeader) {
            let hours = now.getHours();
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            const hoursStr = String(hours).padStart(2, '0');
            timeHeader.textContent = `${hoursStr}:${minutes}:${seconds} ${ampm}`;
        }

        // Update header date in Indonesian format: Hari, DD Bulan YYYY
        const dateHeader = document.getElementById('header-date-string');
        if (dateHeader) {
            const dayName = days[now.getDay()];
            const dayNum = now.getDate();
            const monthName = months[now.getMonth()];
            const year = now.getFullYear();
            dateHeader.textContent = `${dayName}, ${dayNum} ${monthName} ${year}`;
        }
    }, 1000);
}

// Fungsi Memasukkan Nama Subkon ke Elemen Dropdown secara Dinamis
function populateSubconOptions() {
    const filterSelect = document.getElementById('filter-subcon');
    const formSelect = document.getElementById('new-unit-subcon');
    
    if (!filterSelect || !formSelect) return;

    // Bersihkan isi bawaan
    filterSelect.innerHTML = '<option value="all">Semua Subkon</option>';
    formSelect.innerHTML = '';

    SUBCONTRACTORS.forEach(sub => {
        // Buat elemen pilihan untuk filter
        const optFilter = document.createElement('option');
        optFilter.value = sub.name;
        optFilter.textContent = sub.code; // Pakai kode singkatan agar rapi
        filterSelect.appendChild(optFilter);

        // Buat elemen pilihan untuk Form Tambah Unit
        const optForm = document.createElement('option');
        optForm.value = sub.name;
        optForm.textContent = sub.name;
        formSelect.appendChild(optForm);
    });
}

// Fungsi Utama Memperbarui Antarmuka Pengguna (UI Ticker & Data Binder)
function updateUI() {
    // 1. Perbarui Statistik Global (KPI Panel)
    const stats = getGlobalStats();
    
    // Set total, operating, idle, breakdown counts
    const totalEl = document.getElementById('kpi-total-units');
    if (totalEl) totalEl.textContent = stats.total;
    
    const operatingEl = document.getElementById('kpi-operating-units');
    if (operatingEl) operatingEl.textContent = stats.operating;
    
    const idleEl = document.getElementById('kpi-idle-units');
    if (idleEl) idleEl.textContent = stats.idle;
    
    const bdEl = document.getElementById('kpi-breakdown-units');
    if (bdEl) bdEl.textContent = stats.breakdown;
    
    // Compat/legacy binders
    const paLegacy = document.getElementById('kpi-pa');
    if (paLegacy) paLegacy.textContent = stats.pa;
    
    const uaLegacy = document.getElementById('kpi-ua');
    if (uaLegacy) uaLegacy.textContent = stats.ua;

    // Radial Gauge 1: Rata-Rata PA
    const paVal = parseFloat(stats.pa);
    const paFill = document.getElementById('gauge-pa-fill');
    const paText = document.getElementById('gauge-pa-val');
    if (paFill && paText) {
        paText.textContent = paVal.toFixed(1) + "%";
        const offset = 283 * (1 - paVal / 100);
        paFill.style.strokeDashoffset = offset;
    }

    // Radial Gauge 2: Rata-Rata MA
    // Mechanical Availability = (Operating + Idle) / (Operating + Idle + Breakdown) * 100
    const totalWorking = stats.operating + stats.idle;
    const totalAll = totalWorking + stats.breakdown;
    const maVal = totalAll > 0 ? (totalWorking / totalAll * 100) : 95.0;
    const maFill = document.getElementById('gauge-ma-fill');
    const maText = document.getElementById('gauge-ma-val');
    if (maFill && maText) {
        maText.textContent = maVal.toFixed(1) + "%";
        const offset = 283 * (1 - maVal / 100);
        maFill.style.strokeDashoffset = offset;
    }

    // Radial Gauge 3: Rata-Rata UA
    const uaVal = parseFloat(stats.ua);
    const uaFill = document.getElementById('gauge-ua-fill');
    const uaText = document.getElementById('gauge-ua-val');
    if (uaFill && uaText) {
        uaText.textContent = uaVal.toFixed(1) + "%";
        const offset = 283 * (1 - uaVal / 100);
        uaFill.style.strokeDashoffset = offset;
    }

    // 1b. Perbarui Ticker Cuaca & Jalan di Header
    const weatherTextEl = document.getElementById('weather-text');
    const weatherIconEl = document.getElementById('weather-icon');
    const roadConditionEl = document.getElementById('road-condition-text');
    const weatherBadgeEl = document.getElementById('weather-badge');

    if (weatherTextEl && roadConditionEl) {
        weatherTextEl.textContent = `${weatherState.condition} | ${weatherState.temp}°C`;
        
        if (weatherState.rainTriggered) {
            roadConditionEl.innerHTML = `Jalan: <strong style="color: var(--neon-breakdown);">Sangat Licin</strong>`;
            weatherIconEl.className = "fa-solid fa-cloud-showers-heavy";
            weatherIconEl.style.color = "var(--accent-blue)";
            weatherBadgeEl.style.borderColor = "rgba(255, 66, 104, 0.3)";
        } else {
            roadConditionEl.innerHTML = `Jalan: <strong style="color: var(--neon-operating);">Kering</strong>`;
            weatherIconEl.className = "fa-solid fa-cloud-sun";
            weatherIconEl.style.color = "var(--neon-idle)";
            weatherBadgeEl.style.borderColor = "rgba(255, 208, 0, 0.2)";
        }
    }

    // 2. Render Tabel Unit Berdasarkan Filter Aktif
    renderUnitTable();

    // 3. Render Panel Kontribusi & Rating Subkontraktor
    renderSubcontractors();

    // 4. Render Panel Feed Alarm / Notifikasi Live
    renderAlertsFeed();

    // 5. Perbarui Detail Modal secara Live (jika sedang terbuka)
    if (activeDetailUnitId) {
        updateDetailModalContent(activeDetailUnitId);
    }

    // 6. Perbarui tabel Database jika sedang dalam posisi aktif
    const dbUnitActive = document.getElementById('section-db-unit');
    if (dbUnitActive && dbUnitActive.classList.contains('active')) {
        renderDatabaseUnits();
    }
    const dbManActive = document.getElementById('section-db-manpower');
    if (dbManActive && dbManActive.classList.contains('active')) {
        renderDatabaseManpower();
    }
}

// Fungsi Merender Data ke Tabel Unit
function renderUnitTable() {
    const tableBody = document.getElementById('unit-table-body');
    const searchQuery = document.getElementById('search-input').value.toLowerCase();
    const filterSubcon = document.getElementById('filter-subcon').value;
    const filterStatus = document.getElementById('filter-status').value;

    if (!tableBody) return;
    tableBody.innerHTML = '';

    // Saring data berdasarkan input pencarian dan dropdown seleksi
    const filteredUnits = unitsData.filter(unit => {
        const matchesSearch = unit.id.toLowerCase().includes(searchQuery) ||
                              unit.name.toLowerCase().includes(searchQuery) ||
                              unit.operator.toLowerCase().includes(searchQuery) ||
                              unit.type.toLowerCase().includes(searchQuery);
                              
        const matchesSubcon = filterSubcon === 'all' || unit.subcon === filterSubcon;
        const matchesStatus = filterStatus === 'all' || unit.status === filterStatus;

        return matchesSearch && matchesSubcon && matchesStatus;
    });

    if (filteredUnits.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 30px;">Tidak ada unit yang cocok dengan penyaringan.</td></tr>';
        return;
    }

    filteredUnits.forEach(unit => {
        const row = document.createElement('tr');
        const statusClass = unit.status.toLowerCase();
        
        // CSS Progress Bar Bahan Bakar
        let fuelClass = '';
        if (unit.fuel <= 15) fuelClass = 'critical';
        else if (unit.fuel <= 45) fuelClass = 'warning';

        row.innerHTML = `
            <td style="font-weight: 700; color: #fff;">${unit.id}</td>
            <td>${unit.name}</td>
            <td><i class="${getUnitIcon(unit.type)}" style="margin-right:6px; color: var(--text-secondary);"></i> ${unit.type}</td>
            <td style="font-size:0.8rem;">${unit.subcon.split(' (')[0]}</td>
            <td>${unit.operator}</td>
            <td>
                <span class="status-badge ${statusClass}">
                    <span class="dot"></span>${unit.status}
                </span>
            </td>
            <td>
                <div class="fuel-bar-container">
                    <div class="fuel-track">
                        <div class="fuel-fill ${fuelClass}" style="width: ${unit.fuel}%"></div>
                    </div>
                    <span class="fuel-val">${Math.round(unit.fuel)}%</span>
                </div>
            </td>
            <td style="font-family: monospace; font-weight: 600;">${unit.hm.toFixed(1)}</td>
            <td>
                <!-- Detil & Aksi Kendali -->
                <button class="btn-icon view-btn" onclick="openDetailUnitModal('${unit.id}')" title="Buka Detail Unit & Aksi">
                    <i class="fa-solid fa-sliders"></i>
                </button>
                <!-- Fokus Unit di Peta -->
                <button class="btn-icon" onclick="focusUnitOnMap('${unit.id}')" title="Fokuskan Unit di Peta">
                    <i class="fa-solid fa-location-crosshairs"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Helper untuk Mendapatkan Class Ikon FontAwesome berdasarkan Tipe Unit
function getUnitIcon(type) {
    if (type === 'Dump Truck') return 'fa-solid fa-truck';
    if (type === 'Excavator') return 'fa-solid fa-person-digging';
    if (type === 'Bulldozer') return 'fa-solid fa-tractor';
    if (type === 'Loader') return 'fa-solid fa-snowplow';
    if (type === 'Fuel Truck') return 'fa-solid fa-gas-pump';
    return 'fa-solid fa-gear';
}

// Fungsi Merender Bagian Kartu Kontribusi Subkontraktor
function renderSubcontractors() {
    const subconPanel = document.getElementById('subcontractors-panel');
    if (!subconPanel) return;

    subconPanel.innerHTML = '';

    SUBCONTRACTORS.forEach(sub => {
        // Hitung persentase unit subkon yang beroperasi dibanding total unit mereka
        const subconUnits = unitsData.filter(u => u.subcon === sub.name);
        const operatingCount = subconUnits.filter(u => u.status === 'Operating').length;
        const totalCount = subconUnits.length;
        
        const activePct = totalCount > 0 ? Math.round((operatingCount / totalCount) * 100) : 0;

        const subCard = document.createElement('div');
        subCard.className = 'subcon-card';
        
        // Generate rating star
        let starsHtml = '';
        const floorRating = Math.floor(sub.rating);
        for(let i=0; i<5; i++) {
            if (i < floorRating) starsHtml += '<i class="fa-solid fa-star"></i>';
            else if (i === floorRating && sub.rating % 1 !== 0) starsHtml += '<i class="fa-solid fa-star-half-stroke"></i>';
            else starsHtml += '<i class="fa-regular fa-star"></i>';
        }

        subCard.innerHTML = `
            <div class="subcon-header">
                <span class="subcon-name">${sub.name}</span>
                <span class="subcon-rating">${starsHtml} <span style="color:#fff; font-weight:700; margin-left:3px;">${sub.rating}</span></span>
            </div>
            <div class="subcon-stats">
                <div>Total Unit <span>${totalCount} Unit</span></div>
                <div>Aktif Operasi <span>${operatingCount} Unit</span></div>
                <div>Incident (Safety) <span style="${sub.incidents > 0 ? 'color: var(--neon-breakdown);' : ''}">${sub.incidents} Kasus</span></div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:var(--text-secondary); margin-bottom:5px;">
                <span>Utilisasi Armada</span>
                <span style="font-weight:700; color:#fff;">${activePct}%</span>
            </div>
            <div class="subcon-progress">
                <div class="subcon-progress-bar" style="width: ${activePct}%"></div>
            </div>
        `;
        subconPanel.appendChild(subCard);
    });
}

// Fungsi Merender Notifikasi / Feed Log Alarm
function renderAlertsFeed() {
    const feed = document.getElementById('alerts-feed');
    const badge = document.getElementById('alerts-count-badge');
    
    if (!feed) return;

    feed.innerHTML = '';
    
    // Hitung alarm belum selesai yang kritis
    const unresolvedCriticals = alertsLog.filter(a => !a.resolved && a.severity === 'critical').length;
    badge.textContent = unresolvedCriticals;
    
    // Tampilkan log
    if (alertsLog.length === 0) {
        feed.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 50px 0;"><i class="fa-solid fa-bell-slash" style="font-size: 2rem; margin-bottom: 10px; display:block;"></i>Tidak ada log alarm saat ini.</div>';
        return;
    }

    alertsLog.forEach(alert => {
        const item = document.createElement('div');
        item.className = `alert-item ${alert.severity}`;
        
        let sevIcon = 'fa-solid fa-info';
        if (alert.severity === 'critical') sevIcon = 'fa-solid fa-triangle-exclamation';
        else if (alert.severity === 'warning') sevIcon = 'fa-solid fa-circle-exclamation';

        // Format waktu timestamp yang ramah pengguna
        const timeObj = new Date(alert.timestamp);
        const timeStr = timeObj.toTimeString().split(' ')[0];

        item.innerHTML = `
            <div class="alert-severity-icon">
                <i class="${sevIcon}"></i>
            </div>
            <div class="alert-content">
                <div class="alert-meta">
                    <span class="alert-unit">${alert.unitId} (${alert.unitType})</span>
                    <span>${timeStr}</span>
                </div>
                <div class="alert-text">${alert.message}</div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                    <span style="font-size:0.7rem; color:var(--text-muted); font-style:italic;">Subkon: ${alert.subcon.split(' (')[0]}</span>
                    <button onclick="focusUnitOnMap('${alert.unitId}')" style="background:transparent; border:none; color:var(--accent-blue); font-size:0.75rem; font-weight:700; cursor:pointer; padding:0; display:flex; align-items:center; gap:3px;">
                        <i class="fa-solid fa-compass"></i> Lacak Unit
                    </button>
                </div>
            </div>
        `;
        feed.appendChild(item);
    });
}

// Fungsi Pencarian / Filter Unit secara Interaktif
function filterUnits() {
    renderUnitTable();
}

// Manajemen Tabs di Panel Kanan (Charts vs Logs Feed)
function switchTab(tabId, btn) {
    activeTabId = tabId;
    
    // Deaktifkan semua tombol tab
    const tabs = document.querySelectorAll('.pane-tab-btn');
    tabs.forEach(t => t.classList.remove('active'));
    
    // Aktifkan tombol yang diklik
    btn.classList.add('active');

    // Sembunyikan semua konten tab
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(c => c.classList.remove('active'));

    // Tampilkan konten terpilih
    const targetContent = document.getElementById(tabId);
    if (targetContent) {
        targetContent.classList.add('active');
    }
}

// ==========================================
// KONTROL UTAMA MODAL TAMBAH UNIT
// ==========================================
function openAddUnitModal() {
    const modal = document.getElementById('add-unit-modal');
    modal.classList.add('active');
    
    // Set default value Unit ID dengan penomoran unik
    const currentDTs = unitsData.filter(u => u.type === 'Dump Truck').length;
    document.getElementById('new-unit-id').value = `DT-${101 + currentDTs}`;
}

function closeAddUnitModal() {
    const modal = document.getElementById('add-unit-modal');
    modal.classList.remove('active');
    document.getElementById('add-unit-form').reset();
}

function submitNewUnit(event) {
    event.preventDefault();

    const id = document.getElementById('new-unit-id').value.toUpperCase().trim();
    const name = document.getElementById('new-unit-name').value.trim();
    const type = document.getElementById('new-unit-type').value;
    const subcon = document.getElementById('new-unit-subcon').value;
    const operator = document.getElementById('new-unit-operator').value.trim();
    const fuelCapacity = parseInt(document.getElementById('new-unit-fuel-cap').value);
    const odometer = parseInt(document.getElementById('new-unit-odometer').value);
    const hm = parseFloat(document.getElementById('new-unit-hm').value);

    // Validasi duplikasi ID Unit
    if (unitsData.find(u => u.id === id)) {
        alert(`Error: Unit dengan ID ${id} sudah terdaftar! Gunakan kode lambung unik.`);
        return;
    }

    // Ambil start koordinat berdasarkan jenis unit
    const startCoord = TYPE_START_COORDS[type] || LOCATIONS.office;
    
    // Rute kustom jika Dump Truck
    let unitRoute = null;
    if (type === 'Dump Truck') {
        // Bagi separuh rute A, separuh rute B
        const dtsCount = unitsData.filter(u => u.type === 'Dump Truck').length;
        unitRoute = dtsCount % 2 === 0 ? ROUTE_HAULING_A : ROUTE_HAULING_B;
    }

    // Buat objek unit baru
    const newUnit = {
        id: id,
        name: name,
        type: type,
        subcon: subcon,
        operator: operator,
        status: 'Operating',
        fuel: 100,
        fuelCapacity: fuelCapacity,
        speed: 0,
        hm: hm,
        odometer: odometer,
        temp: 75,
        lat: startCoord[0] + (Math.random() - 0.5) * 0.0003, // tambahkan jitter agar tidak tumpang tindih
        lng: startCoord[1] + (Math.random() - 0.5) * 0.0003,
        route: unitRoute,
        routeIndex: 0,
        direction: 1,
        payload: type === 'Dump Truck' ? 'Empty' : 'Ready',
        payloadCapacity: type === 'Dump Truck' ? 95 : 10
    };

    // Push ke State Global
    unitsData.push(newUnit);

    // Catat log pendaftaran
    logAlert(newUnit.id, newUnit.type, newUnit.subcon, 'info', `Pendaftaran Armada BARU Berhasil. Unit ${id} (${name}) aktif di bawah operator ${operator}.`);

    // Reset, Tutup, & Update
    closeAddUnitModal();
    updateUI();
    updateMapMarkers();
    updateCharts();
    
    // Auto pan ke unit baru yang dibuat
    setTimeout(() => {
        focusUnitOnMap(newUnit.id);
    }, 400);
}

// ==========================================
// KONTROL UTAMA MODAL DETAIL UNIT & AKSI
// ==========================================
function openDetailUnitModal(unitId) {
    activeDetailUnitId = unitId;
    
    // Isi data modal pertama kali
    updateDetailModalContent(unitId);
    
    const modal = document.getElementById('detail-unit-modal');
    modal.classList.add('active');
}

function closeDetailUnitModal() {
    const modal = document.getElementById('detail-unit-modal');
    modal.classList.remove('active');
    activeDetailUnitId = null;
}

// Memperbarui Konten Detail Modal Secara Dinamis (Saat simulasi berjalan)
function updateDetailModalContent(unitId) {
    const unit = unitsData.find(u => u.id === unitId);
    if (!unit) {
        closeDetailUnitModal();
        return;
    }

    // Detail Text binding
    document.getElementById('detail-title-id').textContent = unit.id;
    document.getElementById('det-name').textContent = unit.name;
    document.getElementById('det-subcon').textContent = unit.subcon;
    document.getElementById('det-operator').textContent = unit.operator;
    
    const statusEl = document.getElementById('det-status');
    statusEl.innerHTML = `<span class="status-badge ${unit.status.toLowerCase()}"><span class="dot"></span>${unit.status}</span>`;
    
    document.getElementById('det-hm').textContent = unit.hm.toFixed(1) + " jam kerja";
    document.getElementById('det-odometer').textContent = unit.odometer.toLocaleString('id-ID') + " km";
    
    // Suhu mesin (Kritis jika di atas 95)
    const tempEl = document.getElementById('det-temp');
    tempEl.textContent = `${unit.temp}°C`;
    if (unit.temp >= 95) {
        tempEl.className = "detail-val alert";
    } else {
        tempEl.className = "detail-val";
    }

    document.getElementById('det-speed').textContent = `${unit.speed} km/jam`;

    // BBM bar
    const fuelLiters = Math.round(unit.fuelCapacity * (unit.fuel / 100));
    document.getElementById('det-fuel-liters').textContent = fuelLiters;
    document.getElementById('det-fuel-capacity').textContent = unit.fuelCapacity;
    document.getElementById('det-fuel-pct').textContent = Math.round(unit.fuel) + "%";
    
    const fuelBar = document.getElementById('det-fuel-bar');
    fuelBar.style.width = `${unit.fuel}%`;
    
    // Kustomisasi warna bar BBM di modal detail
    fuelBar.className = "fuel-fill";
    if (unit.fuel <= 15) fuelBar.classList.add('critical');
    else if (unit.fuel <= 45) fuelBar.classList.add('warning');

    // Aktifkan / Matikan tombol simulasi breakdown berdasarkan status unit saat ini
    const btnBreakdown = document.getElementById('btn-sim-breakdown');
    if (unit.status === 'Breakdown' || unit.status === 'Maintenance') {
        btnBreakdown.disabled = true;
        btnBreakdown.style.opacity = 0.4;
        btnBreakdown.style.cursor = 'not-allowed';
    } else {
        btnBreakdown.disabled = false;
        btnBreakdown.style.opacity = 1;
        btnBreakdown.style.cursor = 'pointer';
    }
}

// Action Button: Memicu Breakdown secara Instan dari Modal Detail
function triggerUnitBreakdown() {
    if (activeDetailUnitId) {
        forceUnitBreakdown(activeDetailUnitId);
        updateUI();
        updateMapMarkers();
        updateCharts();
    }
}

// Action Button: Memicu Pengisian BBM (Refuel) secara Instan dari Modal Detail
function triggerUnitRefuel() {
    if (activeDetailUnitId) {
        forceUnitRefuel(activeDetailUnitId);
        updateUI();
        updateMapMarkers();
        updateCharts();
    }
}

// Penanganan Penutupan Modal jika Mengklik Overlay Gelap di Luar Box Modal
function closeModalOnOverlay(event) {
    if (event.target.classList.contains('modal-overlay')) {
        event.target.classList.remove('active');
        activeDetailUnitId = null;
    }
}

// Fungsi Saklar Hidup / Jeda Simulasi dari Header
function toggleSimulation() {
    const btn = document.getElementById('btn-toggle-sim');
    const icon = document.getElementById('sim-icon');
    const text = document.getElementById('sim-text');

    if (isSimulationRunning) {
        stopSimulation();
        icon.className = "fa-solid fa-play";
        text.textContent = "Lanjutkan Simulasi";
        btn.className = "btn-primary"; // Ubah warna jadi aktif untuk memikat klik
        
        // Log info penundaan
        logAlert('SYS', 'SYSTEM', 'MANAGEMENT', 'info', 'Operasional simulasi dinonaktifkan oleh administrator.');
        renderAlertsFeed();
    } else {
        startSimulation();
        icon.className = "fa-solid fa-pause";
        text.textContent = "Jeda Simulasi";
        btn.className = "btn-secondary";
        
        logAlert('SYS', 'SYSTEM', 'MANAGEMENT', 'info', 'Operasional simulasi diaktifkan kembali. Data unit bergerak real-time.');
        renderAlertsFeed();
    }
}

// ==========================================
// KENDALI SIMULASI CUACA & FUEL TRUCK SUPPORT
// ==========================================

// Memicu Simulasi Perubahan Cuaca Site & Efek Operasional
function triggerWeatherIncident(type) {
    const btnRain = document.getElementById('btn-trigger-rain');
    const btnSunny = document.getElementById('btn-trigger-sunny');

    if (type === 'rain') {
        weatherState.rainTriggered = true;
        weatherState.condition = 'Hujan Deras';
        weatherState.road = 'Sangat Licin';
        weatherState.temp = 27;

        if (btnRain && btnSunny) {
            btnRain.style.display = 'none';
            btnSunny.style.display = 'inline-block';
        }

        // Catat Alarm HSE K3
        logAlert('SYS', 'SYSTEM', 'SAFETY', 'warning', 'Peringatan K3: Hujan deras mengguyur area Pit. Kecepatan seluruh unit dibatasi maksimum 15 km/jam demi keselamatan hauling!');
    } else {
        weatherState.rainTriggered = false;
        weatherState.condition = 'Cerah Berawan';
        weatherState.road = 'Kering';
        weatherState.temp = 31;

        if (btnRain && btnSunny) {
            btnRain.style.display = 'inline-block';
            btnSunny.style.display = 'none';
        }

        // Catat Info Pemulihan Cuaca
        logAlert('SYS', 'SYSTEM', 'SAFETY', 'info', 'Kondisi Cuaca membaik: Hauling road dinyatakan kering & aman. Batas kecepatan unit dikembalikan ke normal.');
    }

    updateUI();
    updateMapMarkers();
}

// Mendelegasikan Fuel Truck FT-501 Secara Otomatis ke Unit dengan Solar Terendah
function dispatchFuelTruckSupport() {
    if (fuelTruckSupportState.isDispatched) {
        alert("Unit logistik FT-501 saat ini sedang aktif dalam misi penyuplaian solar di lapangan!");
        return;
    }

    // Cari unit non-FuelTruck yang tidak rusak/maintenance dengan BBM terendah
    const lowFuelUnit = unitsData
        .filter(u => u.id !== 'FT-501' && u.status !== 'Breakdown' && u.status !== 'Maintenance')
        .sort((a, b) => a.fuel - b.fuel)[0];

    if (!lowFuelUnit) {
        alert("Tidak ada unit aktif yang memerlukan bantuan pengisian solar saat ini.");
        return;
    }

    const ft501 = unitsData.find(u => u.id === 'FT-501');
    if (!ft501) return;

    // Aktifkan State Dispatch Misi Penyelamatan Solar!
    fuelTruckSupportState.isDispatched = true;
    fuelTruckSupportState.targetUnitId = lowFuelUnit.id;
    fuelTruckSupportState.returning = false;
    fuelTruckSupportState.originalCoords = [ft501.lat, ft501.lng]; // simpan koordinat asal kantor

    ft501.status = 'Operating';
    ft501.speed = 35;

    // Log Alarm Pemberangkatan Tim Penyelamat
    logAlert(ft501.id, ft501.type, ft501.subcon, 'info', `DISPATCH TIM LOGISTIK: FT-501 dikerahkan menuju lokasi ${lowFuelUnit.id} (Solar: ${Math.round(lowFuelUnit.fuel)}%) untuk melakukan pengisian bahan bakar darurat.`);
    
    // Alihkan tab otomatis ke alarm log feed agar user bisa memantau
    const logTabBtn = document.querySelector('button[onclick*="tab-logs"]');
    if (logTabBtn) {
        logTabBtn.click();
    } else {
        updateUI();
    }
}

// Fungsi untuk Berpindah Tab Navigasi Kiri (Home, Produksi, Plant, Safety)
function switchNavTab(tabId, element, iconClass) {
    // 1. Matikan seluruh section-content
    const sections = document.querySelectorAll('.nav-section');
    sections.forEach(sec => {
        sec.classList.remove('active');
    });

    // 2. Aktifkan section target
    const targetSection = document.getElementById(`section-${tabId}`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // 3. Bersihkan status active di semua menu sidebar (termasuk submenu)
    const menuItems = document.querySelectorAll('.sidebar-menu-item');
    menuItems.forEach(item => {
        item.classList.remove('active');
    });

    // 4. Set menu item terpilih sebagai active
    if (element) {
        element.classList.add('active');
    }

    // 5. Perbarui judul halaman di header
    const pageTitleEl = document.getElementById('current-page-title');
    if (pageTitleEl) {
        let readableTitle = tabId.charAt(0).toUpperCase() + tabId.slice(1);
        if (tabId === 'db-unit') readableTitle = 'Database Unit';
        else if (tabId === 'db-manpower') readableTitle = 'Database Man Power';
        else if (tabId === 'kpisco') readableTitle = 'KPI SCO';
        
        pageTitleEl.innerHTML = `<i class="${iconClass}" style="color: var(--accent-blue);"></i> ${readableTitle}`;
    }

    // 6. Jika berpindah ke Home, trigger refresh map (untuk memastikan Leaflet me-layout peta dengan benar setelah transisi CSS flex)
    if (tabId === 'home' && map) {
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
    }

    // 7. Jika berpindah ke tab Database, lakukan render data secara otomatis
    if (tabId === 'db-unit') {
        renderDatabaseUnits();
    } else if (tabId === 'db-manpower') {
        renderDatabaseManpower();
    }
}

// ==========================================
// PENGATURAN & KENDALI BARU (SIDEBAR & MODAL)
// ==========================================

// 1. Toggle Minimize Sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    if (!sidebar) return;
    
    sidebar.classList.toggle('collapsed');
    
    // Trigger update peta Leaflet agar menyesuaikan dengan lebar baru setelah animasi flex
    if (map) {
        setTimeout(() => {
            map.invalidateSize();
        }, 300);
    }
}

// 2. Modals Pengaturan & Logout
function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) modal.classList.add('active');
}

function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) modal.classList.remove('active');
}

function triggerLogout() {
    const modal = document.getElementById('logout-modal');
    if (modal) modal.classList.add('active');
}

function closeLogoutModal() {
    const modal = document.getElementById('logout-modal');
    if (modal) modal.classList.remove('active');
}

function confirmLogout() {
    closeLogoutModal();
    // Hentikan simulasi
    if (simIntervalId) {
        clearInterval(simIntervalId);
        simIntervalId = null;
    }
    
    // Tampilkan screen lock overlay futuristik!
    const lockOverlay = document.createElement('div');
    lockOverlay.style.position = 'fixed';
    lockOverlay.style.top = '0';
    lockOverlay.style.left = '0';
    lockOverlay.style.width = '100vw';
    lockOverlay.style.height = '100vh';
    lockOverlay.style.background = 'rgba(11, 15, 26, 0.98)';
    lockOverlay.style.backdropFilter = 'blur(20px)';
    lockOverlay.style.display = 'flex';
    lockOverlay.style.flexDirection = 'column';
    lockOverlay.style.alignItems = 'center';
    lockOverlay.style.justifyContent = 'center';
    lockOverlay.style.zIndex = '9999';
    lockOverlay.style.color = '#fff';
    lockOverlay.style.fontFamily = 'Inter, sans-serif';
    lockOverlay.style.gap = '20px';
    
    lockOverlay.innerHTML = `
        <div style="font-size: 3.5rem; color: #ff6b64; filter: drop-shadow(0 0 15px rgba(255,107,100,0.5));">
            <i class="fa-solid fa-lock"></i>
        </div>
        <h2 style="font-weight: 800; letter-spacing: 1px; margin: 0;">SISTEM MONITORING DIKUNCI</h2>
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin: 0;">Sesi operasional Anda telah diakhiri dengan aman.</p>
        <button onclick="window.location.reload()" style="margin-top: 15px; padding: 10px 24px; background: var(--accent-gradient); border: none; border-radius: 6px; color: #fff; font-weight: 600; cursor: pointer; box-shadow: 0 0 15px rgba(59,130,246,0.4);">
            <i class="fa-solid fa-key" style="margin-right: 6px;"></i> Masuk Kembali
        </button>
    `;
    
    document.body.appendChild(lockOverlay);
}

// 3. Mengubah Tema Peta Leaflet secara Dinamis
function changeMapTheme(theme) {
    if (!map) return;
    
    // Hapus layer tile yang ada saat ini
    map.eachLayer(layer => {
        if (layer instanceof L.TileLayer) {
            map.removeLayer(layer);
        }
    });
    
    let url = '';
    let attribution = '';
    
    if (theme === 'dark') {
        url = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
        attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
    } else if (theme === 'satellite') {
        url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
        attribution = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community';
    } else {
        url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    }
    
    L.tileLayer(url, {
        attribution: attribution,
        maxZoom: 20
    }).addTo(map);
    
    logAlert('SYS', 'SYSTEM', 'GENERAL', 'info', `Tema peta berhasil diubah ke: ${theme.toUpperCase()}`);
}

// 4. Mengubah Kecepatan Simulasi Live GPS
function changeSimulationSpeed(speedMs) {
    const ms = parseInt(speedMs);
    if (isNaN(ms)) return;
    
    // Hentikan interval lama jika sedang aktif
    if (simIntervalId) {
        clearInterval(simIntervalId);
        
        // Mulai ulang dengan interval baru
        simIntervalId = setInterval(() => {
            if (isSimulating) {
                simulateMovement();
                updateUI();
                updateMapMarkers();
            }
        }, ms);
    }
    
    logAlert('SYS', 'SYSTEM', 'SIMULATION', 'info', `Interval refresh GPS live disetel ke: ${ms/1000} detik.`);
}

// ==============================================================
// KONTROL SUB-TAB DI HALAMAN HOME (PREMAN v1.2 MOCKUP FLOW)
// ==============================================================
let mockupActiveChip = 'all';

function switchSubTab(subTabId, element) {
    // 1. Bersihkan kelas aktif di seluruh tombol sub-tab
    const tabs = document.querySelectorAll('.sub-tab-item');
    tabs.forEach(t => t.classList.remove('active'));

    // 2. Set tab yang diklik menjadi aktif
    if (element) {
        element.classList.add('active');
    } else {
        const targetBtn = document.getElementById(`subtab-${subTabId}`);
        if (targetBtn) targetBtn.classList.add('active');
    }

    // 3. Sembunyikan seluruh konten sub-tab
    const contents = document.querySelectorAll('.subtab-content');
    contents.forEach(c => c.style.display = 'none');

    // 4. Tampilkan sub-tab target
    const targetContent = document.getElementById(`subtab-content-${subTabId}`);
    if (targetContent) {
        targetContent.style.display = 'block';
    }

    // 5. Trigger update peta jika berpindah ke GPS live agar map me-layout ulang dengan benar
    if (subTabId === 'peta-gps') {
        if (map) {
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        }
    } else if (subTabId === 'monitoring-log') {
        // Render unit cards pertama kali
        renderMockupUnitCards();
    }
}

// Merender Grid Unit Cards di Tab Monitoring & Log Harian
function renderMockupUnitCards() {
    const container = document.getElementById('mockup-cards-container');
    if (!container) return;

    const query = document.getElementById('mockup-search-input').value.toLowerCase().trim();
    
    // Saring data units
    const filtered = unitsData.filter(u => {
        const matchesSearch = u.id.toLowerCase().includes(query) || 
                              u.name.toLowerCase().includes(query) || 
                              u.subcon.toLowerCase().includes(query);
                              
        const matchesChip = mockupActiveChip === 'all' || 
                            (mockupActiveChip === 'Operating' && u.status === 'Operating') ||
                            (mockupActiveChip === 'Standby' && u.status === 'Idle') ||
                            (mockupActiveChip === 'Breakdown' && u.status === 'Breakdown');
                            
        return matchesSearch && matchesChip;
    });

    container.innerHTML = '';

    if (filtered.length === 0) {
        container.innerHTML = `<div style="grid-column: span 3; text-align: center; padding: 40px; color: var(--text-muted);">
            <i class="fa-solid fa-magnifying-glass" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
            Tidak ada unit yang cocok dengan penyaringan.
        </div>`;
        return;
    }

    filtered.forEach(u => {
        const card = document.createElement('div');
        card.className = 'glass-panel unit-card';
        
        let statusBadgeClass = 'operating';
        let statusLabel = 'OPERASI';
        if (u.status === 'Idle') {
            statusBadgeClass = 'idle';
            statusLabel = 'STANDBY';
        } else if (u.status === 'Breakdown') {
            statusBadgeClass = 'breakdown';
            statusLabel = 'REPAIR (BD)';
        } else if (u.status === 'Maintenance') {
            statusBadgeClass = 'maintenance';
            statusLabel = 'MAINTENANCE';
        }

        // Subcon short name
        const subconShort = u.subcon.includes('Bukit Jasa Bara') ? 'BJB' :
                            u.subcon.includes('Mandala Trans') ? 'MTB' :
                            u.subcon.includes('Sinar Mining') ? 'SMU' : 'KP';

        // Hitung PA, MA, UA secara live/teoritis untuk masing-masing unit agar terkesan detail
        const unitPA = u.status === 'Breakdown' ? '0.0%' : '100.0%';
        const unitMA = u.status === 'Breakdown' ? '0.0%' : '100.0%';
        const unitUA = u.status === 'Operating' ? '100.0%' : '0.0%';

        card.innerHTML = `
            <div class="unit-card-header">
                <div class="unit-card-title-group">
                    <span class="unit-card-title">${u.id}</span>
                    <span class="unit-card-subtitle">${u.name} • ${subconShort}</span>
                </div>
                <span class="status-badge ${statusBadgeClass}">${statusLabel}</span>
            </div>
            
            <div class="unit-card-stats-row">
                <div class="unit-card-stat-item">
                    <span class="label">PA</span>
                    <span class="val green">${unitPA}</span>
                </div>
                <div class="unit-card-stat-item">
                    <span class="label">MA</span>
                    <span class="val orange">${unitMA}</span>
                </div>
                <div class="unit-card-stat-item">
                    <span class="label">UA</span>
                    <span class="val blue">${unitUA}</span>
                </div>
            </div>

            <div class="unit-card-details">
                <div class="detail-item">
                    <span>Operator:</span>
                    <strong>${u.operator}</strong>
                </div>
                <div class="detail-item" style="margin-top: 5px;">
                    <span>Hour Meter (HM):</span>
                    <strong style="font-family: monospace;">${u.hm.toLocaleString('id-ID', {minimumFractionDigits:1, maximumFractionDigits:1})} Jam</strong>
                </div>
            </div>

            <!-- Card actions matching mockup styling -->
            <div style="display: flex; gap: 8px; margin-top: 15px;">
                <button class="btn-secondary" style="flex: 1; padding: 6px; font-size: 0.7rem; border-radius: 4px;" onclick="openDetailUnitModal('${u.id}')">
                    <i class="fa-solid fa-sliders"></i> Detail & Kendali
                </button>
                <button class="btn-secondary" style="flex: 1; padding: 6px; font-size: 0.7rem; border-radius: 4px;" onclick="focusUnitOnMap('${u.id}'); switchSubTab('peta-gps')">
                    <i class="fa-solid fa-compass"></i> Lacak GPS
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

// Menangani Chips Filter di Tab Monitoring
function filterMockupChips(status, btn) {
    mockupActiveChip = status;

    // Bersihkan kelas active dari seluruh chip
    const container = document.getElementById('mockup-chips-container');
    if (container) {
        const chips = container.querySelectorAll('button');
        chips.forEach(c => {
            c.className = 'btn-secondary';
            c.style.background = 'rgba(255, 255, 255, 0.02)';
            c.style.borderColor = 'rgba(255,255,255,0.06)';
            c.style.color = 'var(--text-secondary)';
        });
    }

    // Set chip terpilih menjadi active dengan warna orange/yellow brand
    if (btn) {
        btn.className = 'btn-secondary active';
        btn.style.background = 'rgba(255, 202, 28, 0.15)';
        btn.style.borderColor = 'rgba(255, 202, 28, 0.3)';
        btn.style.color = '#ffca28';
    }

    renderMockupUnitCards();
}

// Simulasi Unggah Excel Harian
function handleExcelUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Loading overlay simulasi
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '30px';
    toast.style.right = '30px';
    toast.style.background = '#1b1f2a';
    toast.style.border = '1px solid rgba(76, 175, 80, 0.3)';
    toast.style.borderRadius = '8px';
    toast.style.padding = '15px 20px';
    toast.style.color = '#fff';
    toast.style.zIndex = '99999';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '12px';
    toast.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
    toast.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="color: #4caf50; font-size: 1.2rem;"></i> <span>Membaca berkas: <strong>${file.name}</strong>...</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.innerHTML = `<i class="fa-solid fa-check" style="color: #4caf50; font-size: 1.2rem;"></i> <span>Data berhasil diurai! Menghitung ulang KPI...</span>`;
        
        setTimeout(() => {
            document.body.removeChild(toast);
            triggerSimulateDumpData();
        }, 1200);
    }, 1500);
}

// Aksi Trigger: Mengimpor Data Telemetri & Mengatur Nilai Gauges Persis Mockup!
function triggerSimulateDumpData() {
    // 1. Set values to match mockup EXACTLY!
    // Total: 132, Operasi: 93, Standby: 20, Repair: 13
    // PA: 91.7%, MA: 96.9%, UA: 36.3%
    
    // Kita ubah total data agar sesuai visual mockup
    unitsData = [];
    
    // Kita generate 93 operating units, 20 idle units, 13 breakdown units secara dinamis agar maps & list sangat hidup!
    // 93 Operating units
    for(let i=0; i<93; i++) {
        const id = `DT-${100 + i}`;
        unitsData.push({
            id: id,
            name: i % 2 === 0 ? "Komatsu PC300" : "Caterpillar 777D",
            type: i % 3 === 0 ? "Excavator" : "Dump Truck",
            subcon: SUBCONTRACTORS[i % SUBCONTRACTORS.length].name,
            operator: `Operator ${i+1}`,
            status: "Operating",
            fuel: 50 + Math.random() * 45,
            fuelCapacity: 500,
            speed: 22 + Math.random() * 15,
            hm: 4000 + Math.random() * 8000,
            lat: ROUTE_HAULING_A[i % ROUTE_HAULING_A.length][0] + (Math.random() - 0.5) * 0.003,
            lng: ROUTE_HAULING_A[i % ROUTE_HAULING_A.length][1] + (Math.random() - 0.5) * 0.003,
            route: i % 2 === 0 ? ROUTE_HAULING_A : ROUTE_HAULING_B,
            routeIndex: i % ROUTE_HAULING_A.length,
            direction: 1
        });
    }

    // 20 Standby units
    for(let i=0; i<20; i++) {
        const id = `DZ-${300 + i}`;
        unitsData.push({
            id: id,
            name: "Caterpillar D10T",
            type: "Bulldozer",
            subcon: SUBCONTRACTORS[i % SUBCONTRACTORS.length].name,
            operator: `Standby Op ${i+1}`,
            status: "Idle",
            fuel: 40 + Math.random() * 30,
            fuelCapacity: 800,
            speed: 0,
            hm: 8000 + Math.random() * 5000,
            lat: LOCATIONS.stockpile[0] + (Math.random() - 0.5) * 0.001,
            lng: LOCATIONS.stockpile[1] + (Math.random() - 0.5) * 0.001,
            route: null,
            routeIndex: 0,
            direction: 0
        });
    }

    // 13 Breakdown units
    for(let i=0; i<13; i++) {
        const id = `EX-400-${i}`;
        unitsData.push({
            id: id,
            name: "Caterpillar 6015B",
            type: "Excavator",
            subcon: SUBCONTRACTORS[i % SUBCONTRACTORS.length].name,
            operator: `Breakdown Op ${i+1}`,
            status: "Breakdown",
            fuel: 10 + Math.random() * 30,
            fuelCapacity: 1200,
            speed: 0,
            hm: 12000 + Math.random() * 3000,
            lat: LOCATIONS.workshop[0] + (Math.random() - 0.5) * 0.001,
            lng: LOCATIONS.workshop[1] + (Math.random() - 0.5) * 0.001,
            route: null,
            routeIndex: 0,
            direction: 0
        });
    }

    // Update charts & maps to reflect the massive imported mockup data!
    updateUI();
    updateMapMarkers();
    updateCharts();
    renderMockupUnitCards();

    // Force exact radial ring offsets to match the mockup exactly!
    const paFill = document.getElementById('gauge-pa-fill');
    const paText = document.getElementById('gauge-pa-val');
    if (paFill && paText) {
        paText.textContent = "91.7%";
        paFill.style.strokeDashoffset = 283 * (1 - 0.917);
    }
    const maFill = document.getElementById('gauge-ma-fill');
    const maText = document.getElementById('gauge-ma-val');
    if (maFill && maText) {
        maText.textContent = "96.9%";
        maFill.style.strokeDashoffset = 283 * (1 - 0.969);
    }
    const uaFill = document.getElementById('gauge-ua-fill');
    const uaText = document.getElementById('gauge-ua-val');
    if (uaFill && uaText) {
        uaText.textContent = "36.3%";
        uaFill.style.strokeDashoffset = 283 * (1 - 0.363);
    }

    // Log alert
    logAlert('EXCEL', 'IMPORT', 'SYSTEM', 'info', 'Pemberitahuan: Sukses mengimpor 132 log telemetri harian. KPI PA (91.7%), MA (96.9%), dan UA (36.3%) telah dihitung ulang sesuai standard tambang.');

    // Tampilkan Custom Premium Sweet Alert Toast di atas kanan
    const alertBox = document.createElement('div');
    alertBox.style.position = 'fixed';
    alertBox.style.top = '25px';
    alertBox.style.right = '25px';
    alertBox.style.background = 'rgba(18, 22, 33, 0.96)';
    alertBox.style.borderLeft = '4px solid #4caf50';
    alertBox.style.borderRadius = '6px';
    alertBox.style.padding = '16px 20px';
    alertBox.style.color = '#fff';
    alertBox.style.zIndex = '99999';
    alertBox.style.boxShadow = '0 10px 40px rgba(0,0,0,0.6)';
    alertBox.style.display = 'flex';
    alertBox.style.gap = '15px';
    alertBox.style.width = '350px';
    alertBox.style.backdropFilter = 'blur(10px)';
    alertBox.style.transition = 'all 0.5s ease';
    
    alertBox.innerHTML = `
        <div style="font-size: 1.5rem; color: #4caf50;"><i class="fa-solid fa-circle-check"></i></div>
        <div style="flex: 1;">
            <div style="font-weight: 800; font-size: 0.85rem; margin-bottom: 4px; letter-spacing: 0.5px;">SUKSES IMPOR DATA TELEMETRI</div>
            <div style="font-size: 0.72rem; color: var(--text-secondary); line-height: 1.4;">
                132 unit berhasil diperbarui. Rata-rata PA terhitung pada tingkat optimal <strong>91.7%</strong>.
            </div>
        </div>
    `;
    
    document.body.appendChild(alertBox);

    setTimeout(() => {
        alertBox.style.opacity = '0';
        alertBox.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            document.body.removeChild(alertBox);
        }, 500);
    }, 4500);
}

// Batal & Reset Impor Terakhir
function resetExcelImport() {
    window.location.reload();
}

// ==============================================================
// KONTROL DROPDOWN DATABASE DI SIDEBAR (UNIT & MAN POWER)
// ==============================================================

// 1. Toggle Sidebar Dropdown
function toggleSidebarDropdown(element) {
    const parent = element.parentElement;
    const submenu = parent.querySelector('.sidebar-dropdown-menu');
    const arrow = element.querySelector('.dropdown-arrow');
    
    if (submenu) {
        const isOpen = submenu.style.display === 'flex';
        submenu.style.display = isOpen ? 'none' : 'flex';
        
        if (arrow) {
            arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
        }
    }
}

// 2. Render Database Unit Table
function renderDatabaseUnits() {
    const tableBody = document.getElementById('db-unit-table-body');
    if (!tableBody) return;

    const query = document.getElementById('db-unit-search').value.toLowerCase().trim();
    const typeFilter = document.getElementById('db-unit-filter-type').value;

    const filtered = unitsData.filter(u => {
        const matchesSearch = u.id.toLowerCase().includes(query) || 
                              u.name.toLowerCase().includes(query);
        const matchesType = typeFilter === 'all' || u.type === typeFilter;
        return matchesSearch && matchesType;
    });

    tableBody.innerHTML = '';

    if (filtered.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 30px;">Tidak ada data unit yang cocok.</td></tr>`;
        return;
    }

    filtered.forEach(u => {
        const row = document.createElement('tr');
        
        let statusBadgeClass = 'operating';
        let statusLabel = 'OPERASI';
        if (u.status === 'Idle') {
            statusBadgeClass = 'idle';
            statusLabel = 'STANDBY';
        } else if (u.status === 'Breakdown') {
            statusBadgeClass = 'breakdown';
            statusLabel = 'REPAIR';
        } else if (u.status === 'Maintenance') {
            statusBadgeClass = 'maintenance';
            statusLabel = 'PM';
        }

        // Color coding for high temperatures (>95°C is critical)
        let tempColor = 'var(--text-secondary)';
        if (u.temp > 95) tempColor = 'var(--neon-breakdown)';
        else if (u.temp > 85) tempColor = 'var(--neon-idle)';

        row.innerHTML = `
            <td style="font-weight: 700; color: #ffca28;">${u.id}</td>
            <td style="color: #fff; font-weight: 600;">${u.name}</td>
            <td><i class="${getUnitIcon(u.type)}" style="color: var(--text-secondary); margin-right: 6px;"></i> ${u.type}</td>
            <td>${u.subcon.split(' (')[0]}</td>
            <td>${u.operator}</td>
            <td>${Math.round(u.fuel)}%</td>
            <td style="color: ${tempColor}; font-weight: bold;">${u.temp}°C</td>
            <td style="font-size: 0.75rem;">PM 250 (+${Math.round(15 + Math.random() * 50)}j)</td>
            <td>
                <span class="status-badge ${statusBadgeClass}">
                    <span class="dot"></span>${statusLabel}
                </span>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function filterDatabaseUnits() {
    renderDatabaseUnits();
}

// 3. Render Database Man Power Table
function renderDatabaseManpower() {
    const tableBody = document.getElementById('db-manpower-table-body');
    if (!tableBody) return;

    const query = document.getElementById('db-manpower-search').value.toLowerCase().trim();
    const subconFilter = document.getElementById('db-manpower-filter-subcon').value;

    // Map units data to manpower
    const crewList = unitsData.map((u, i) => {
        const subconCode = u.subcon.includes('Bukit Jasa Bara') ? 'BJB' :
                           u.subcon.includes('Mandala Trans') ? 'MTB' :
                           u.subcon.includes('Sinar Mining') ? 'SMU' : 'KP';
        
        const sioClass = u.type === 'Excavator' ? 'SIO KELAS I' :
                         u.type === 'Dump Truck' ? 'SIO KELAS II' : 'SIO KELAS III';

        return {
            id: `OP-${201 + i}`,
            name: u.operator,
            subcon: u.subcon,
            subconCode: subconCode,
            sio: sioClass,
            expiry: `12 Des 202${7 + (i % 3)}`,
            unit: u.id,
            shift: i % 2 === 0 ? 'Shift 1 (Day)' : 'Shift 2 (Night)',
            status: u.status === 'Breakdown' ? 'Standby' : 'Active Duty',
            contact: `+62 852-555-${1000 + i}`
        };
    });

    const filtered = crewList.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(query) || 
                              c.id.toLowerCase().includes(query);
        const matchesSubcon = subconFilter === 'all' || c.subconCode === subconFilter;
        return matchesSearch && matchesSubcon;
    });

    tableBody.innerHTML = '';

    if (filtered.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 30px;">Tidak ada data crew yang cocok.</td></tr>`;
        return;
    }

    filtered.forEach(c => {
        const row = document.createElement('tr');
        
        let statusBadgeClass = 'operating';
        if (c.status === 'Standby') statusBadgeClass = 'idle';
        else if (c.status === 'Off Duty') statusBadgeClass = 'breakdown';

        row.innerHTML = `
            <td style="font-weight: 700; color: var(--accent-blue); font-family: monospace;">${c.id}</td>
            <td style="color: #fff; font-weight: 600;">${c.name}</td>
            <td>${c.subcon.split(' (')[0]}</td>
            <td style="font-size: 0.72rem; font-weight: 700; color: #ffca28;"><i class="fa-solid fa-id-card" style="margin-right: 4px;"></i> ${c.sio}</td>
            <td style="color: var(--neon-operating); font-weight: 600; font-size: 0.75rem;">${c.expiry}</td>
            <td style="font-weight: 800; color: #fff;">${c.unit}</td>
            <td style="font-size: 0.75rem;">${c.shift}</td>
            <td>
                <span class="status-badge ${statusBadgeClass}">
                    <span class="dot"></span>${c.status}
                </span>
            </td>
            <td style="font-family: monospace; font-size: 0.75rem;">${c.contact}</td>
        `;
        tableBody.appendChild(row);
    });
}

function filterDatabaseManpower() {
    renderDatabaseManpower();
}
