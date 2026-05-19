// Database Mock untuk Monitoring Unit Subkon Pertambangan
// Lokasi: Tambang Batubara Mahakam Prima, Kalimantan Timur

const SUBCONTRACTORS = [
    {
        id: "subcon-1",
        name: "PT. Bukit Jasa Bara (BJB)",
        code: "BJB",
        rating: 4.8,
        unitsCount: 6,
        operatorCount: 12,
        incidents: 0,
        contact: "+62 811-555-123",
        status: "Active"
    },
    {
        id: "subcon-2",
        name: "PT. Mandala Trans Borneo (MTB)",
        code: "MTB",
        rating: 4.5,
        unitsCount: 5,
        operatorCount: 10,
        incidents: 1,
        contact: "+62 812-555-456",
        status: "Active"
    },
    {
        id: "subcon-3",
        name: "PT. Sinar Mining Utama (SMU)",
        code: "SMU",
        rating: 4.2,
        unitsCount: 4,
        operatorCount: 8,
        incidents: 2,
        contact: "+62 813-555-789",
        status: "Warning"
    },
    {
        id: "subcon-4",
        name: "CV. Kaltim Persada (KP)",
        code: "KP",
        rating: 4.9,
        unitsCount: 3,
        operatorCount: 6,
        incidents: 0,
        contact: "+62 821-555-321",
        status: "Active"
    }
];

// Area Koordinat Tambang Batubara (Polygon untuk Batasan Concession Area)
const MINING_CONCESSION_BOUNDS = [
    [-0.435, 117.135],
    [-0.435, 117.175],
    [-0.465, 117.175],
    [-0.465, 117.135]
];

// Rute jalan tambang utama (Hauling Road) untuk Dump Trucks
// Dari Coal Face (Loading Point) -> Hauling Road -> Stockpile (Unloading Point)
const ROUTE_HAULING_A = [
    [-0.4480, 117.1420], // Loading Point A (Pit Mahakam)
    [-0.4465, 117.1450],
    [-0.4450, 117.1490], // Pos Pantau 1
    [-0.4485, 117.1530],
    [-0.4510, 117.1580],
    [-0.4535, 117.1620],
    [-0.4550, 117.1650]  // Stockpile Utama & Port
];

const ROUTE_HAULING_B = [
    [-0.4580, 117.1380], // Loading Point B (Pit Barat)
    [-0.4560, 117.1410],
    [-0.4520, 117.1460],
    [-0.4500, 117.1500], // Simpang Bayur
    [-0.4515, 117.1560],
    [-0.4530, 117.1600],
    [-0.4550, 117.1650]  // Stockpile Utama & Port
];

// Koordinat Lokasi Stasis (Stationary Locations)
const LOCATIONS = {
    pitA: [-0.4480, 117.1420],
    pitB: [-0.4580, 117.1380],
    stockpile: [-0.4550, 117.1650],
    workshop: [-0.4420, 117.1480],
    office: [-0.4450, 117.1550]
};

// Data Unit Alat Berat Awal
let unitsData = [
    {
        id: "DT-101",
        name: "Caterpillar 777D",
        type: "Dump Truck",
        subcon: "PT. Mandala Trans Borneo (MTB)",
        operator: "Yusuf Setiadi",
        status: "Operating",
        fuel: 78,
        fuelCapacity: 600,
        speed: 28,
        hm: 5410.2,
        odometer: 142050,
        temp: 82,
        lat: ROUTE_HAULING_A[0][0],
        lng: ROUTE_HAULING_A[0][1],
        route: ROUTE_HAULING_A,
        routeIndex: 0,
        direction: 1,
        payload: "Coal",
        payloadCapacity: 95 // tons
    },
    {
        id: "DT-102",
        name: "Caterpillar 777D",
        type: "Dump Truck",
        subcon: "PT. Mandala Trans Borneo (MTB)",
        operator: "Rian Hidayat",
        status: "Operating",
        fuel: 52,
        fuelCapacity: 600,
        speed: 32,
        hm: 6120.5,
        odometer: 156100,
        temp: 84,
        lat: ROUTE_HAULING_A[3][0],
        lng: ROUTE_HAULING_A[3][1],
        route: ROUTE_HAULING_A,
        routeIndex: 3,
        direction: 1,
        payload: "Empty",
        payloadCapacity: 95
    },
    {
        id: "DT-103",
        name: "Komatsu HD785",
        type: "Dump Truck",
        subcon: "PT. Bukit Jasa Bara (BJB)",
        operator: "Dedi Setiawan",
        status: "Operating",
        fuel: 91,
        fuelCapacity: 650,
        speed: 26,
        hm: 3240.8,
        odometer: 92840,
        temp: 80,
        lat: ROUTE_HAULING_B[1][0],
        lng: ROUTE_HAULING_B[1][1],
        route: ROUTE_HAULING_B,
        routeIndex: 1,
        direction: 1,
        payload: "Coal",
        payloadCapacity: 100
    },
    {
        id: "DT-104",
        name: "Komatsu HD785",
        type: "Dump Truck",
        subcon: "PT. Bukit Jasa Bara (BJB)",
        operator: "Aris Munandar",
        status: "Idle",
        fuel: 42,
        fuelCapacity: 650,
        speed: 0,
        hm: 4510.3,
        odometer: 110420,
        temp: 65,
        lat: LOCATIONS.office[0],
        lng: LOCATIONS.office[1],
        route: null,
        routeIndex: 0,
        direction: 0,
        payload: "Empty",
        payloadCapacity: 100
    },
    {
        id: "DT-105",
        name: "Scania P410 XT",
        type: "Dump Truck",
        subcon: "PT. Mandala Trans Borneo (MTB)",
        operator: "Rudi Hartono",
        status: "Operating",
        fuel: 14, // Memicu Alert Low Fuel nanti
        fuelCapacity: 400,
        speed: 38,
        hm: 2890.1,
        odometer: 78500,
        temp: 86,
        lat: ROUTE_HAULING_B[4][0],
        lng: ROUTE_HAULING_B[4][1],
        route: ROUTE_HAULING_B,
        routeIndex: 4,
        direction: -1,
        payload: "Empty",
        payloadCapacity: 40
    },
    {
        id: "EX-201",
        name: "Komatsu PC2000",
        type: "Excavator",
        subcon: "PT. Sinar Mining Utama (SMU)",
        operator: "Joni Iskandar",
        status: "Operating",
        fuel: 85,
        fuelCapacity: 1200,
        speed: 0.5, // Lambat, stasioner di Pit A
        hm: 12300.6,
        odometer: 1420,
        temp: 83,
        lat: LOCATIONS.pitA[0] + 0.0005,
        lng: LOCATIONS.pitA[1] - 0.0005,
        route: null,
        routeIndex: 0,
        direction: 0,
        payload: "Loading",
        payloadCapacity: 15 // Bucket size (m3)
    },
    {
        id: "EX-202",
        name: "Caterpillar 6015B",
        type: "Excavator",
        subcon: "PT. Bukit Jasa Bara (BJB)",
        operator: "Eko Prasetyo",
        status: "Operating",
        fuel: 63,
        fuelCapacity: 1300,
        speed: 0.8,
        hm: 8750.4,
        odometer: 1150,
        temp: 81,
        lat: LOCATIONS.pitB[0] + 0.0003,
        lng: LOCATIONS.pitB[1] + 0.0002,
        route: null,
        routeIndex: 0,
        direction: 0,
        payload: "Loading",
        payloadCapacity: 16
    },
    {
        id: "EX-203",
        name: "Caterpillar 320D",
        type: "Excavator",
        subcon: "PT. Sinar Mining Utama (SMU)",
        operator: "Lukman Hakim",
        status: "Breakdown", // Rusak, memicu alert
        fuel: 48,
        fuelCapacity: 400,
        speed: 0,
        hm: 9150.2,
        odometer: 4850,
        temp: 104, // Kepanasan / Overheat
        lat: LOCATIONS.pitA[0] - 0.0012,
        lng: LOCATIONS.pitA[1] + 0.0015,
        route: null,
        routeIndex: 0,
        direction: 0,
        payload: "Overheated Engine",
        payloadCapacity: 3
    },
    {
        id: "DZ-301",
        name: "Caterpillar D10T",
        type: "Bulldozer",
        subcon: "PT. Bukit Jasa Bara (BJB)",
        operator: "Slamet Riyadi",
        status: "Operating",
        fuel: 55,
        fuelCapacity: 900,
        speed: 4,
        hm: 11450.9,
        odometer: 6200,
        temp: 78,
        lat: LOCATIONS.stockpile[0] + 0.0008,
        lng: LOCATIONS.stockpile[1] - 0.0008,
        route: null,
        routeIndex: 0,
        direction: 0,
        payload: "Leveling Stockpile",
        payloadCapacity: 12
    },
    {
        id: "DZ-302",
        name: "Komatsu D375A",
        type: "Bulldozer",
        subcon: "PT. Sinar Mining Utama (SMU)",
        operator: "Gatot Subroto",
        status: "Maintenance", // Sedang di-service di Workshop
        fuel: 95,
        fuelCapacity: 950,
        speed: 0,
        hm: 14100.1,
        odometer: 7820,
        temp: 45,
        lat: LOCATIONS.workshop[0] - 0.0003,
        lng: LOCATIONS.workshop[1] + 0.0003,
        route: null,
        routeIndex: 0,
        direction: 0,
        payload: "Hydraulic System Service",
        payloadCapacity: 13
    },
    {
        id: "WL-401",
        name: "Caterpillar 992K",
        type: "Loader",
        subcon: "PT. Sinar Mining Utama (SMU)",
        operator: "Hendrik Wijaya",
        status: "Idle",
        fuel: 72,
        fuelCapacity: 800,
        speed: 0,
        hm: 6240.4,
        odometer: 18450,
        temp: 72,
        lat: LOCATIONS.stockpile[0] + 0.0012,
        lng: LOCATIONS.stockpile[1] + 0.0005,
        route: null,
        routeIndex: 0,
        direction: 0,
        payload: "Ready",
        payloadCapacity: 10
    },
    {
        id: "FT-501",
        name: "Hino Ranger Fuel Truck",
        type: "Fuel Truck",
        subcon: "CV. Kaltim Persada (KP)",
        operator: "Bambang Pamungkas",
        status: "Operating",
        fuel: 88,
        fuelCapacity: 350,
        speed: 35,
        hm: 4120.7,
        odometer: 125400,
        temp: 79,
        lat: LOCATIONS.office[0] + 0.0008,
        lng: LOCATIONS.office[1] - 0.0005,
        route: null,
        routeIndex: 0,
        direction: 0,
        payload: "Fuel Logistics",
        payloadCapacity: 10000 // liters fuel load
    }
];

// Log Alert & Notifikasi Awal
let alertsLog = [
    {
        id: "alert-1",
        timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 jam lalu
        unitId: "EX-203",
        unitType: "Excavator",
        subcon: "PT. Sinar Mining Utama (SMU)",
        severity: "critical", // critical, warning, info
        message: "Mesin EX-203 mengalami OVERHEATING (104°C). Unit dihentikan darurat.",
        resolved: false
    },
    {
        id: "alert-2",
        timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 menit lalu
        unitId: "DT-105",
        unitType: "Dump Truck",
        subcon: "PT. Mandala Trans Borneo (MTB)",
        severity: "warning",
        message: "Tingkat Bahan Bakar DT-105 di bawah batas aman (14%). Membutuhkan pengisian ulang segera.",
        resolved: false
    },
    {
        id: "alert-3",
        timestamp: new Date(Date.now() - 900000).toISOString(), // 15 menit lalu
        unitId: "DZ-302",
        unitType: "Bulldozer",
        subcon: "PT. Sinar Mining Utama (SMU)",
        severity: "info",
        message: "Unit DZ-302 masuk area Workshop untuk perawatan berkala PM 250 jam.",
        resolved: true
    }
];

// Data Keadaan Cuaca & HSE Tambang
let weatherState = {
    temp: 31,
    condition: "Cerah Berawan",
    road: "Kering",
    rainTriggered: false
};

// Data Dukungan Logistik BBM (Fuel Truck Dispatch)
let fuelTruckSupportState = {
    isDispatched: false,
    targetUnitId: null,
    originalCoords: [ROUTE_HAULING_B[0][0], ROUTE_HAULING_B[0][1]], // Default position backup
    routeToTarget: [],
    currentRouteIndex: 0,
    returning: false
};

// Fungsi Helper untuk Mendapatkan Statistik Global Real-time
function getGlobalStats() {
    const totalUnits = unitsData.length;
    const operatingUnits = unitsData.filter(u => u.status === 'Operating').length;
    const idleUnits = unitsData.filter(u => u.status === 'Idle').length;
    const breakdownUnits = unitsData.filter(u => u.status === 'Breakdown').length;
    const maintenanceUnits = unitsData.filter(u => u.status === 'Maintenance').length;
    
    // Perhitungan Physical Availability (PA) = (Total - Breakdown) / Total * 100
    const physicalAvailability = totalUnits > 0 
        ? (((totalUnits - breakdownUnits) / totalUnits) * 100).toFixed(1) 
        : 0;

    // Perhitungan Utilization of Availability (UA) = Operating / (Total - Breakdown) * 100
    const divisor = totalUnits - breakdownUnits;
    const utilization = divisor > 0 
        ? ((operatingUnits / divisor) * 100).toFixed(1) 
        : 0;

    // Total konsumsi bahan bakar total (kalkulasi teoritis sederhana)
    const totalFuelUsed = unitsData.reduce((acc, u) => acc + (u.fuelCapacity * (100 - u.fuel) / 100), 0).toFixed(0);

    return {
        total: totalUnits,
        operating: operatingUnits,
        idle: idleUnits,
        breakdown: breakdownUnits,
        maintenance: maintenanceUnits,
        pa: physicalAvailability,
        ua: utilization,
        totalFuelUsed: totalFuelUsed
    };
}
