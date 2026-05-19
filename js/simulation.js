// PIT-TRACK - Engine Simulasi Aktivitas & Pergerakan Unit Tambang Real-Time

let simulationInterval = null;
let isSimulationRunning = false;

// Memulai Engine Simulasi
function startSimulation() {
    if (isSimulationRunning) return;
    
    isSimulationRunning = true;
    simulationInterval = setInterval(() => {
        simulateMovements();
        simulateRandomEvents();
        
        // Perbarui seluruh komponen visual yang terpengaruh
        updateUI();
        updateMapMarkers();
        updateCharts();
    }, 2500); // Update setiap 2.5 detik untuk respon real-time yang optimal
}

// Menghentikan / Menjeda Simulasi
function stopSimulation() {
    if (!isSimulationRunning) return;
    clearInterval(simulationInterval);
    isSimulationRunning = false;
}

// Fungsi Utama Simulasi Pergerakan & Status Unit
function simulateMovements() {
    unitsData.forEach(unit => {
        // Hanya simulasikan unit yang sedang beroperasi atau butuh pembaruan waktu
        if (unit.status === 'Operating') {
            
            // 1. SIMULASI PERGERAKAN DUMP TRUCK DI SEPANJANG RUTE HAULING ROAD
            if (unit.route && unit.route.length > 0) {
                // Tentukan langkah pergerakan berikutnya
                let nextIndex = unit.routeIndex + unit.direction;
                
                // Cek jika Dump Truck sampai di ujung Stockpile (Tujuan Akhir)
                if (nextIndex >= unit.route.length) {
                    unit.direction = -1; // Balik arah kembali ke tambang
                    unit.routeIndex = unit.route.length - 1;
                    unit.speed = 0; // Berhenti sebentar untuk bongkar batubara (Unloading)
                    unit.payload = 'Empty';
                    
                    // Tambahkan poin produktivitas batubara ke grafik (simulasi input batubara)
                    const coalAmount = Math.round(unit.payloadCapacity);
                    const fuelBurnt = Math.round(unit.fuelCapacity * 0.03); // konsumsi solar rute tersebut
                    addProductivityPoint(5000 + Math.round(Math.random()*1500), 2500 + Math.round(Math.random()*600));
                    
                    // Buat log info pembongkaran
                    logAlert(unit.id, unit.type, unit.subcon, 'info', `Unit ${unit.id} sukses melakukan unloading batubara (${coalAmount} Ton) di Stockpile Utama.`);
                }
                // Cek jika Dump Truck kembali ke Pit Tambang (Titik Awal Loading)
                else if (nextIndex < 0) {
                    unit.direction = 1; // Balik arah menuju stockpile
                    unit.routeIndex = 0;
                    unit.speed = 0; // Berhenti sebentar untuk memuat batubara (Loading)
                    unit.payload = 'Coal';
                    
                    logAlert(unit.id, unit.type, unit.subcon, 'info', `Unit ${unit.id} berada di Loading Point tambang untuk pemuatan batubara.`);
                } 
                else {
                    // Update indeks rute & koordinat GPS
                    unit.routeIndex = nextIndex;
                    unit.lat = unit.route[nextIndex][0] + (Math.random() - 0.5) * 0.0002; // Tambah sedikit jitter acak agar natural
                    unit.lng = unit.route[nextIndex][1] + (Math.random() - 0.5) * 0.0002;
                    
                    if (weatherState.rainTriggered) {
                        // Jika hujan deras, jalan licin dan berjarak pandang pendek: Batasi kecepatan maks 15 km/jam demi K3!
                        unit.speed = 8 + Math.round(Math.random() * 6);
                        unit.temp = 88 + Math.round(Math.random() * 8); // Suhu silinder hidrolik naik akibat beban jalan licin berlumpur
                    } else {
                        // Fluktuasi kecepatan normal saat hauling (22 - 38 km/jam)
                        unit.speed = 20 + Math.round(Math.random() * 18);
                    }
                }
                
                // Tambah odometer & jam mesin (HM) secara logis
                unit.odometer += Math.round(unit.speed * 0.05); // simulasi jarak kilometer
                unit.hm += parseFloat((0.02 + Math.random() * 0.01).toFixed(2));
            } 
            
            // 2. SIMULASI ALAT BERAT STASIONER & SPECIAL UNITS (Fuel Truck FT-501)
            else {
                if (unit.id === 'FT-501' && fuelTruckSupportState.isDispatched) {
                    // JALANKAN LOGIKA LOGISTIK BBM LIVE MOVEMENT
                    let targetUnit = unitsData.find(u => u.id === fuelTruckSupportState.targetUnitId);
                    
                    if (fuelTruckSupportState.returning) {
                        // KEMBALI KE POSKO KANTOR UTAMA
                        let dLat = fuelTruckSupportState.originalCoords[0] - unit.lat;
                        let dLng = fuelTruckSupportState.originalCoords[1] - unit.lng;
                        let dist = Math.sqrt(dLat*dLat + dLng*dLng);
                        
                        if (dist < 0.001) {
                            // Tiba kembali di Posko!
                            fuelTruckSupportState.isDispatched = false;
                            fuelTruckSupportState.returning = false;
                            fuelTruckSupportState.targetUnitId = null;
                            unit.status = 'Idle';
                            unit.speed = 0;
                            logAlert(unit.id, unit.type, unit.subcon, 'info', `Fuel Support Selesai: FT-501 tiba kembali di posko logistik utama.`);
                        } else {
                            unit.status = 'Operating';
                            unit.speed = 32;
                            unit.lat += (dLat / dist) * 0.0018; // Bergerak maju
                            unit.lng += (dLng / dist) * 0.0018;
                        }
                    } else if (targetUnit) {
                        // BERGERAK MENUJU TARGET
                        let dLat = targetUnit.lat - unit.lat;
                        let dLng = targetUnit.lng - unit.lng;
                        let dist = Math.sqrt(dLat*dLat + dLng*dLng);
                        
                        if (dist < 0.001) {
                            // Tiba di target unit! Lakukan pengisian solar instan
                            forceUnitRefuel(targetUnit.id);
                            fuelTruckSupportState.returning = true;
                            logAlert(unit.id, unit.type, unit.subcon, 'info', `FT-501 tiba di lokasi ${targetUnit.id}. Pengisian solar 100% sukses. FT-501 bergerak kembali ke posko.`);
                        } else {
                            unit.status = 'Operating';
                            unit.speed = 35;
                            unit.lat += (dLat / dist) * 0.0018; // Bergerak maju
                            unit.lng += (dLng / dist) * 0.0018;
                        }
                    }
                    unit.hm += parseFloat((0.02 + Math.random() * 0.01).toFixed(2));
                } else {
                    // Berikan fluktuasi lat/lng mikro untuk mensimulasikan pekerjaan area sempit
                    unit.lat += (Math.random() - 0.5) * 0.00008;
                    unit.lng += (Math.random() - 0.5) * 0.00008;
                    unit.speed = parseFloat((0.1 + Math.random() * 0.5).toFixed(1));
                    unit.hm += parseFloat((0.01 + Math.random() * 0.01).toFixed(2));
                }
            }

            // 3. KONSUMSI BAHAN BAKAR (BBM) BERTAHAP
            // Alat berat mengkonsumsi solar lebih cepat dibanding dump truck biasa
            const fuelBurnRate = unit.type === 'Excavator' ? 0.35 : 0.2;
            unit.fuel = parseFloat((unit.fuel - (Math.random() * fuelBurnRate)).toFixed(1));
            
            // Proteksi agar tidak di bawah 0%
            if (unit.fuel < 0) unit.fuel = 0;

            // PICU ALARM BBM JIKA KURANG DARI 15% (LOW FUEL)
            if (unit.fuel <= 15 && unit.fuel > 0) {
                // Pastikan belum ada log low fuel untuk unit ini
                const existingAlert = alertsLog.find(a => a.unitId === unit.id && a.message.includes('Bahan Bakar'));
                if (!existingAlert) {
                    logAlert(unit.id, unit.type, unit.subcon, 'warning', `Tingkat Bahan Bakar ${unit.id} kritis (${unit.fuel}%). Mohon jadwalkan Fuel Truck segera.`);
                }
            } 
            else if (unit.fuel === 0) {
                unit.status = 'Idle';
                unit.speed = 0;
                logAlert(unit.id, unit.type, unit.subcon, 'critical', `Unit ${unit.id} mati mesin akibat KEHABISAN BAHAN BAKAR.`);
            }

            // Fluktuasi Suhu Mesin Normal (76°C - 88°C)
            unit.temp = 76 + Math.round(Math.random() * 12);
        }
        
        // Simulasikan unit Maintenance di workshop perlahan diperbaiki
        if (unit.status === 'Maintenance') {
            unit.temp = 40 + Math.round(Math.random() * 5); // Dingin karena tidak hidup mesin
            
            // Simulasi perbaikan bertahap (5% kemungkinan selesai per siklus)
            if (Math.random() < 0.04) {
                unit.status = 'Operating';
                unit.fuel = 100; // diisi penuh solar di workshop
                unit.temp = 75;
                logAlert(unit.id, unit.type, unit.subcon, 'info', `Perawatan Unit ${unit.id} di Workshop selesai. Unit kembali beroperasi.`);
            }
        }
    });
}

// Fungsi Memicu Kejadian Acak (Random Breakdown / Overheating / Fuel Refilled)
function simulateRandomEvents() {
    // 1. PELUANG UNIT BREAKDOWN SECARA TIBA-TIBA (1.5% Peluang)
    if (Math.random() < 0.015) {
        const operatingUnits = unitsData.filter(u => u.status === 'Operating');
        if (operatingUnits.length > 0) {
            // Pilih unit acak untuk dirusak
            const randomUnit = operatingUnits[Math.floor(Math.random() * operatingUnits.length)];
            forceUnitBreakdown(randomUnit.id);
        }
    }
}

// Memicu Breakdown secara instan pada satu Unit
function forceUnitBreakdown(unitId) {
    const unit = unitsData.find(u => u.id === unitId);
    if (unit && unit.status !== 'Breakdown') {
        unit.status = 'Breakdown';
        unit.speed = 0;
        unit.temp = 102 + Math.round(Math.random() * 6); // Suhu naik sangat tinggi (Overheat)
        
        logAlert(unit.id, unit.type, unit.subcon, 'critical', `Alarm Kritis: Sensor mendeteksi kegagalan silinder hidrolik pada ${unit.id}. Unit dipaksa mati.`);
        
        // Mainkan notifikasi audio sederhana (Beep) jika didukung browser
        try {
            const context = new (window.AudioContext || window.webkitAudioContext)();
            const osc = context.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(600, context.currentTime);
            osc.connect(context.destination);
            osc.start();
            osc.stop(context.currentTime + 0.15);
        } catch(e) {}
    }
}

// Memicu Pengisian Bahan Bakar secara instan pada satu Unit
function forceUnitRefuel(unitId) {
    const unit = unitsData.find(u => u.id === unitId);
    if (unit) {
        const oldFuel = unit.fuel;
        unit.fuel = 100;
        
        // Selesaikan peringatan BBM lama
        alertsLog = alertsLog.filter(a => !(a.unitId === unit.id && a.message.includes('Bahan Bakar')));
        
        // Kembalikan ke beroperasi jika sebelumnya mati karena kehabisan solar atau standby
        if (unit.status === 'Idle' && oldFuel === 0) {
            unit.status = 'Operating';
        }
        
        logAlert(unit.id, unit.type, unit.subcon, 'info', `Pengisian bahan bakar solar unit ${unit.id} selesai (100% terisi).`);
    }
}

// Fungsi Pembantu untuk Membuka Log Alarm Baru
function logAlert(unitId, unitType, subcon, severity, message) {
    const newAlert = {
        id: "alert-" + Date.now(),
        timestamp: new Date().toISOString(),
        unitId: unitId,
        unitType: unitType,
        subcon: subcon,
        severity: severity,
        message: message,
        resolved: false
    };
    
    // Taruh di bagian teratas logs feed
    alertsLog.unshift(newAlert);
    
    // Batasi log alarm maksimal 30 item untuk menghemat memori
    if (alertsLog.length > 30) {
        alertsLog.pop();
    }
}
