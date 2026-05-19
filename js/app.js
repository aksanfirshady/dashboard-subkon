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
    setInterval(() => {
        const timeSpan = document.getElementById('current-time');
        if (timeSpan) {
            const now = new Date();
            // Format jam HH:MM:SS
            const timeStr = now.toTimeString().split(' ')[0];
            timeSpan.textContent = timeStr;
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
    document.getElementById('kpi-total-units').textContent = stats.total;
    document.getElementById('kpi-operating-units').textContent = stats.operating;
    document.getElementById('kpi-idle-units').textContent = stats.idle;
    document.getElementById('kpi-breakdown-units').textContent = stats.breakdown;
    document.getElementById('kpi-pa').textContent = stats.pa;
    document.getElementById('kpi-ua').textContent = stats.ua;

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
