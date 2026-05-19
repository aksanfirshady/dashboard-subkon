// PIT-TRACK - Inisialisasi & Manajemen Visualisasi Grafik menggunakan ApexCharts

let statusDonutChart = null;
let productivityTrendChart = null;

// Fungsi untuk Inisialisasi Grafik
function initCharts() {
    // 1. OPSI DONUT CHART - DISTRIBUSI STATUS UNIT
    const donutOptions = {
        series: [0, 0, 0, 0], // Operating, Idle, Breakdown, Maintenance
        labels: ['Operating', 'Standby / Idle', 'Breakdown', 'Maintenance'],
        chart: {
            type: 'donut',
            height: 250,
            background: 'transparent',
            foreColor: '#9ca3af',
            animations: {
                enabled: true,
                easing: 'easeinout',
                speed: 600
            }
        },
        colors: ['#05ffc4', '#ffd000', '#ff3b30', '#00c2ff'],
        stroke: {
            show: true,
            colors: ['#111827'],
            width: 2
        },
        dataLabels: {
            enabled: false
        },
        legend: {
            position: 'bottom',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: '11px',
            labels: {
                colors: '#9ca3af'
            },
            markers: {
                width: 8,
                height: 8,
                radius: 12
            },
            itemMargin: {
                horizontal: 8,
                vertical: 5
            }
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '72%',
                    background: 'transparent',
                    labels: {
                        show: true,
                        name: {
                            show: true,
                            fontSize: '12px',
                            fontFamily: 'Plus Jakarta Sans, sans-serif',
                            fontWeight: 600,
                            color: '#9ca3af',
                            offsetY: -5
                        },
                        value: {
                            show: true,
                            fontSize: '20px',
                            fontFamily: 'Plus Jakarta Sans, sans-serif',
                            fontWeight: 800,
                            color: '#ffffff',
                            offsetY: 5,
                            formatter: function (val) {
                                return val;
                            }
                        },
                        total: {
                            show: true,
                            label: 'Total Unit',
                            fontFamily: 'Plus Jakarta Sans, sans-serif',
                            fontWeight: 600,
                            color: '#9ca3af',
                            formatter: function (w) {
                                return w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                            }
                        }
                    }
                }
            }
        },
        theme: {
            mode: 'dark'
        },
        tooltip: {
            theme: 'dark',
            style: {
                fontSize: '11px',
                fontFamily: 'Plus Jakarta Sans, sans-serif'
            },
            y: {
                formatter: function (val) {
                    return val + " Unit";
                }
            }
        }
    };

    // 2. OPSI AREA CHART - PRODUKTIVITAS HAULING BATUBARA (7 HARI TERAKHIR)
    const areaOptions = {
        series: [{
            name: 'Tonase Batubara (Ton)',
            data: [4200, 4800, 5100, 4600, 5500, 6200, 6800]
        }, {
            name: 'Konsumsi Solar (Liter)',
            data: [2100, 2300, 2500, 2200, 2650, 3100, 3250]
        }],
        chart: {
            type: 'area',
            height: 160,
            background: 'transparent',
            toolbar: {
                show: false
            },
            sparkline: {
                enabled: false
            },
            foreColor: '#6b7280'
        },
        colors: ['#3b82f6', '#ffd000'],
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.35,
                opacityTo: 0.05,
                stops: [0, 90, 100]
            }
        },
        stroke: {
            curve: 'smooth',
            width: 2
        },
        dataLabels: {
            enabled: false
        },
        grid: {
            borderColor: 'rgba(255, 255, 255, 0.04)',
            strokeDashArray: 3,
            padding: {
                top: 0,
                right: 0,
                bottom: 0,
                left: 10
            }
        },
        xaxis: {
            categories: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'],
            axisBorder: {
                show: false
            },
            axisTicks: {
                show: false
            },
            labels: {
                style: {
                    fontSize: '9px',
                    fontFamily: 'Plus Jakarta Sans, sans-serif'
                }
            }
        },
        yaxis: {
            labels: {
                style: {
                    fontSize: '9px',
                    fontFamily: 'Plus Jakarta Sans, sans-serif'
                }
            }
        },
        legend: {
            show: true,
            position: 'top',
            horizontalAlign: 'right',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: '9px',
            labels: {
                colors: '#9ca3af'
            },
            markers: {
                width: 6,
                height: 6,
                radius: 12
            }
        },
        theme: {
            mode: 'dark'
        },
        tooltip: {
            theme: 'dark',
            style: {
                fontSize: '10px',
                fontFamily: 'Plus Jakarta Sans, sans-serif'
            }
        }
    };

    // Render Charts
    statusDonutChart = new ApexCharts(document.querySelector("#status-donut-chart"), donutOptions);
    statusDonutChart.render();

    productivityTrendChart = new ApexCharts(document.querySelector("#productivity-trend-chart"), areaOptions);
    productivityTrendChart.render();

    // Jalankan pembaruan data pertama
    updateCharts();
}

// Fungsi untuk Memperbarui Data Grafik Berdasarkan State
function updateCharts() {
    if (!statusDonutChart) return;

    // Kalkulasi sebaran status unit dari unitsData
    const operating = unitsData.filter(u => u.status === 'Operating').length;
    const idle = unitsData.filter(u => u.status === 'Idle').length;
    const breakdown = unitsData.filter(u => u.status === 'Breakdown').length;
    const maintenance = unitsData.filter(u => u.status === 'Maintenance').length;

    // Update data Donut Chart secara dinamis
    statusDonutChart.updateSeries([operating, idle, breakdown, maintenance]);
}

// Fungsi simulasi untuk memperbarui tonase harian
function addProductivityPoint(coalTons, fuelLiters) {
    if (!productivityTrendChart) return;
    
    let currentSeries = productivityTrendChart.w.config.series;
    let tonsData = [...currentSeries[0].data];
    let fuelData = [...currentSeries[1].data];
    
    // Geser data (hapus hari pertama, tambah hari baru di akhir)
    tonsData.shift();
    tonsData.push(coalTons);
    
    fuelData.shift();
    fuelData.push(fuelLiters);
    
    productivityTrendChart.updateSeries([
        { name: currentSeries[0].name, data: tonsData },
        { name: currentSeries[1].name, data: fuelData }
    ]);
}
