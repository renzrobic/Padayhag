/**
 * Parking Management System - Admin Dashboard & Analytics (admin.js)
 * Modern KPI cards, Chart.js gradient graphs, slot CRUD inventory, pricing policy, and audit logs.
 */

const AdminModule = {
    occupancyChart: null,
    vehicleChart: null,

    init() {
        this.renderAll();

        // Listen for database changes to update admin dashboard
        window.addEventListener('prms_database_changed', () => {
            this.renderAll();
        });
    },

    renderAll() {
        this.renderStats();
        this.renderCharts();
        this.renderSlotsTable();
        this.renderLogsTable();
        this.populateSettingsForm();
    },

    renderStats() {
        const stats = DB.getAnalytics();
        const settings = DB.getSettings();

        const elTotalRev = document.getElementById('admin-stat-total-revenue');
        const elTodayRev = document.getElementById('admin-stat-today-revenue');
        const elOccupancyRate = document.getElementById('admin-stat-occupancy-rate');
        const elTotalBookings = document.getElementById('admin-stat-total-bookings');

        if (elTotalRev) elTotalRev.textContent = `${settings.currencySymbol}${stats.totalRevenue.toFixed(2)}`;
        if (elTodayRev) elTodayRev.textContent = `${settings.currencySymbol}${stats.todayRevenue.toFixed(2)}`;
        if (elOccupancyRate) elOccupancyRate.textContent = `${stats.occupancyRate}%`;
        if (elTotalBookings) elTotalBookings.textContent = stats.totalBookingsCount;
    },

    renderCharts() {
        if (typeof Chart === 'undefined') return;

        const stats = DB.getAnalytics();

        // 1. Hourly Occupancy Chart with Rich Gradient
        const occCtx = document.getElementById('admin-occupancy-chart');
        if (occCtx) {
            if (this.occupancyChart) {
                this.occupancyChart.destroy();
            }

            const ctx = occCtx.getContext('2d');
            const gradient = ctx.createLinearGradient(0, 0, 0, 200);
            gradient.addColorStop(0, 'rgba(14, 165, 233, 0.45)');
            gradient.addColorStop(1, 'rgba(14, 165, 233, 0.01)');

            this.occupancyChart = new Chart(occCtx, {
                type: 'line',
                data: {
                    labels: ['8 AM', '10 AM', '12 PM', '2 PM', '4 PM', 'Live Now'],
                    datasets: [{
                        label: 'Occupancy Rate (%)',
                        data: stats.hourlyOccupancy,
                        borderColor: '#0284c7',
                        backgroundColor: gradient,
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        pointBackgroundColor: '#0284c7',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                callback: val => `${val}%`,
                                font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 }
                            },
                            grid: { color: 'rgba(226, 232, 240, 0.6)' }
                        },
                        x: {
                            ticks: { font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 } },
                            grid: { display: false }
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: '#0f172a',
                            titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: 'bold' },
                            bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
                            padding: 10,
                            cornerRadius: 8,
                            displayColors: false,
                            callbacks: {
                                label: (ctx) => `Occupancy: ${ctx.parsed.y}%`
                            }
                        }
                    }
                }
            });
        }

        // 2. Vehicle Types Doughnut Chart
        const vehCtx = document.getElementById('admin-vehicle-chart');
        if (vehCtx) {
            if (this.vehicleChart) {
                this.vehicleChart.destroy();
            }

            this.vehicleChart = new Chart(vehCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Sedan / Van', 'SUV / 4x4', 'EV Charging', 'Motorcycle'],
                    datasets: [{
                        data: [
                            stats.vehicleCounts.sedan || 2,
                            stats.vehicleCounts.suv || 1,
                            stats.vehicleCounts.ev || 1,
                            stats.vehicleCounts.motorcycle || 1
                        ],
                        backgroundColor: ['#0284c7', '#10b981', '#f59e0b', '#8b5cf6'],
                        hoverOffset: 6,
                        borderWidth: 3,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '72%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                boxWidth: 12,
                                boxHeight: 12,
                                borderRadius: 3,
                                font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: '600' },
                                padding: 12
                            }
                        },
                        tooltip: {
                            backgroundColor: '#0f172a',
                            titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: 'bold' },
                            bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
                            padding: 10,
                            cornerRadius: 8
                        }
                    }
                }
            });
        }
    },

    renderSlotsTable() {
        const tbody = document.getElementById('admin-slots-table-body');
        if (!tbody) return;

        const slots = DB.getSlots();

        tbody.innerHTML = slots.map(slot => {
            const isAvail = slot.status === 'available';
            const isOcc = slot.status === 'occupied';
            const isRes = slot.status === 'reserved';
            const badgeClass = isAvail ? 'badge-success' : isOcc ? 'badge-danger' : isRes ? 'badge-warning' : 'badge-info';

            return `
                <tr>
                    <td><strong class="table-slot-badge">${slot.code}</strong></td>
                    <td>Floor ${slot.floor}</td>
                    <td style="text-transform: capitalize; font-weight: 500;">
                        ${slot.isEV ? '⚡ ' : slot.isPWD ? '♿ ' : slot.type === 'motorcycle' ? '🏍️ ' : ''}${slot.type}
                    </td>
                    <td><span class="badge ${badgeClass}">${slot.status.toUpperCase()}</span></td>
                    <td>
                        <button type="button" class="btn-table-delete" onclick="AdminModule.deleteSlotConfirm('${slot.id}')">
                            Delete
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    renderLogsTable() {
        const tbody = document.getElementById('admin-logs-table-body');
        if (!tbody) return;

        const logs = DB.getLogs();

        tbody.innerHTML = logs.map(log => {
            const dateStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            return `
                <tr>
                    <td style="font-size: 11.5px; color: var(--color-text-muted); font-family: monospace; white-space: nowrap;">${dateStr}</td>
                    <td><span class="audit-action-tag">${log.action}</span></td>
                    <td style="font-size: 12.5px; color: var(--color-text-body);">${log.details}</td>
                </tr>
            `;
        }).join('');
    },

    populateSettingsForm() {
        const settings = DB.getSettings();
        const elName = document.getElementById('cfg-facility-name');
        const elBase = document.getElementById('cfg-base-rate');
        const elEv = document.getElementById('cfg-ev-surcharge');

        if (elName) elName.value = settings.facilityName;
        if (elBase) elBase.value = settings.baseRate;
        if (elEv) elEv.value = settings.evSurcharge;
    },

    handleSettingsSubmit(event) {
        if (event) event.preventDefault();
        const elName = document.getElementById('cfg-facility-name');
        const elBase = document.getElementById('cfg-base-rate');
        const elEv = document.getElementById('cfg-ev-surcharge');

        const newSettings = {
            facilityName: elName ? elName.value.trim() : "Robinsons Pagadian Commercial Parking Lot",
            baseRate: elBase ? parseFloat(elBase.value) || 35.00 : 35.00,
            evSurcharge: elEv ? parseFloat(elEv.value) || 50.00 : 50.00
        };

        DB.saveSettings(newSettings);
        if (typeof SoundFX !== 'undefined') SoundFX.playChime();
        App.showToast("Pricing policy updated successfully.", "success");
    },

    openAddSlotModal() {
        if (typeof SoundFX !== 'undefined') SoundFX.playSelect();
        App.openModal('admin-add-slot-modal');
    },

    handleAddSlotSubmit(event) {
        if (event) event.preventDefault();
        const codeInput = document.getElementById('add-slot-code');
        const floorSelect = document.getElementById('add-slot-floor');
        const typeSelect = document.getElementById('add-slot-type');

        const slotCode = codeInput ? codeInput.value.trim().toUpperCase() : '';
        const floor = floorSelect ? floorSelect.value : '1';
        const type = typeSelect ? typeSelect.value : 'standard';

        if (!slotCode) {
            App.showToast("Please enter a slot code.", "error");
            return;
        }

        DB.addSlot({
            code: slotCode,
            floor: floor,
            zone: `Zone ${floor === '1' ? 'C' : 'D'}`,
            type: type
        });

        App.closeModal('admin-add-slot-modal');
        if (codeInput) codeInput.value = '';
        if (typeof SoundFX !== 'undefined') SoundFX.playChime();
        App.showToast(`New slot ${slotCode} added successfully.`, "success");
    },

    deleteSlotConfirm(slotId) {
        if (confirm("Are you sure you want to delete this parking slot?")) {
            DB.deleteSlot(slotId);
            if (typeof SoundFX !== 'undefined') SoundFX.playTick();
            App.showToast("Slot deleted from inventory.", "info");
        }
    },

    exportDatabaseFile() {
        const data = DB.getSnapshot();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `parking_system_backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        if (typeof SoundFX !== 'undefined') SoundFX.playChime();
        App.showToast("Database backup downloaded.", "success");
    },

    resetDatabasePrompt() {
        if (confirm("Reset database to initial default configuration?")) {
            DB.resetDatabase();
            if (typeof SoundFX !== 'undefined') SoundFX.playTick();
            App.showToast("Database restored to defaults.", "info");
        }
    }
};
