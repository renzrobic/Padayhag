/**
 * Parking Management System - 2D Interactive Parking Deck Map (map.js)
 * Behance Parking Solution UI Overhaul:
 * - Realistic white top-down aerodynamic cars with tinted glass sunroofs & headlights
 * - Blueprint tarmac with dark navy background (#0D131F) & subtle grid
 * - Active selected slot (M12) as a glowing solid royal blue card (#1D4ED8)
 * - Maintenance/Caution slot with diagonal yellow/black hazard stripes
 * - Directional stencils: Entry →, Exit →, Reserved, and stall codes
 */

const ParkingMap = {
    currentFloor: '1',
    currentTypeFilter: 'all',

    init() {
        this.renderMap();
        this.updateOverviewStats();
        this.bindEvents();

        // Listen for database changes to update map visually
        window.addEventListener('prms_database_changed', () => {
            this.renderMap();
            this.updateOverviewStats();
        });
    },

    bindEvents() {
        // Events managed via App delegates
    },

    /**
     * Top-Down Realistic White Aerodynamic Car SVG matching Behance render
     */
    getBehanceCarSVG(angle = 0) {
        return `
            <svg class="behance-car-svg" viewBox="0 0 84 140" fill="none" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(${angle}deg);">
                <!-- Ground Drop Shadow -->
                <ellipse cx="42" cy="74" rx="34" ry="58" fill="rgba(0,0,0,0.5)" filter="blur(4px)" />
                <!-- Sleek White Metallic Body -->
                <path d="M20 24 C20 14, 30 8, 42 8 C54 8, 64 14, 64 24 L67 65 C69 82, 68 112, 66 126 C64 133, 55 137, 42 137 C29 137, 20 133, 18 126 L17 65 C15 82, 16 32, 20 24 Z" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1.2" />
                <!-- Side Aerodynamic Mirrors -->
                <path d="M14 38 C10 38, 9 43, 11 46 L17 44 Z" fill="#E2E8F0" stroke="#CBD5E1" stroke-width="0.8" />
                <path d="M70 38 C74 38, 75 43, 73 46 L67 44 Z" fill="#E2E8F0" stroke="#CBD5E1" stroke-width="0.8" />
                <!-- Dark Tinted Front Windshield -->
                <path d="M22 36 C29 32, 55 32, 62 36 L59 52 C52 50, 32 50, 25 52 Z" fill="#1E293B" />
                <!-- Panoramic Tinted Glass Roof -->
                <rect x="26" y="56" width="32" height="34" rx="4" fill="#0F172A" />
                <!-- Dark Tinted Rear Window -->
                <path d="M24 96 C32 98, 52 98, 60 96 L62 108 C55 111, 29 111, 22 108 Z" fill="#1E293B" />
                <!-- Headlights (Subtle Warm LED) -->
                <ellipse cx="22" cy="15" rx="4" ry="2" fill="#FEF08A" transform="rotate(-15 22 15)" />
                <ellipse cx="62" cy="15" rx="4" ry="2" fill="#FEF08A" transform="rotate(15 62 15)" />
                <!-- Rear Red Taillights -->
                <rect x="20" y="131" width="10" height="3" rx="1.5" fill="#EF4444" />
                <rect x="54" y="131" width="10" height="3" rx="1.5" fill="#EF4444" />
            </svg>
        `;
    },

    getVehicleSVG(type, isEV = false) {
        return this.getBehanceCarSVG();
    },

    renderMap() {
        // Render into both the Behance Deck container and any legacy grid containers
        const containers = [
            document.getElementById('behance-deck-container'),
            document.getElementById('parking-lot-grid-container')
        ].filter(Boolean);

        if (containers.length === 0) return;

        containers.forEach(container => {
            this.renderBehanceDeck(container);
        });

        this.updateOverviewStats();
    },

    renderBehanceDeck(container) {
        const slots = DB.getSlots(this.currentFloor);
        const selectedCode = App.selectedSlot || 'M12';

        // Filter / map slots by key positions to mirror the Behance layout
        const slotMap = {};
        slots.forEach(s => { slotMap[s.code] = s; });

        // Ensure key Behance stalls exist with proper default states
        const leftStalls = [
            { code: 'L14', status: 'occupied', rotate: 0 },
            { code: 'L13', status: (slotMap['L13'] && slotMap['L13'].status) || 'available', rotate: 0 },
            { code: 'L12', status: (slotMap['L12'] && slotMap['L12'].status) || 'available', rotate: 0 },
            { code: 'S1',  status: 'hazard', isHazard: true, rotate: 0 },
            { code: 'L11', status: 'occupied', rotate: 0 }
        ];

        const rightStalls = [
            { code: 'S0',  status: 'reserved-stencil', label: 'Reserved' },
            { code: 'M13', status: 'occupied', rotate: 0 },
            { code: 'M12', status: (slotMap['M12'] && slotMap['M12'].status) || 'available', rotate: 0 },
            { code: 'M11', status: (slotMap['M11'] && slotMap['M11'].status) || 'available', rotate: 0 },
            { code: 'N13', status: 'occupied', rotate: 0 },
            { code: 'N12', status: 'occupied', rotate: 0 },
            { code: 'N11', status: 'occupied', rotate: 0 }
        ];

        let html = `
            <div class="behance-deck-canvas" id="deck-canvas">
                <!-- Tarmac Grid Background & Markings -->
                <div class="deck-grid-overlay"></div>

                <!-- Left Column Bays -->
                <div class="deck-column deck-column-left">
        `;

        leftStalls.forEach(stall => {
            html += this.generateBehanceStallHTML(stall, selectedCode);
        });

        html += `
                </div>

                <!-- Center Driving Lane / Aisle -->
                <div class="deck-center-aisle">
                    <div class="aisle-lane-markings">
                        <span class="aisle-arrow exit">Exit →</span>
                        <div class="aisle-center-dashes"></div>
                        <span class="aisle-arrow entry">Entry →</span>
                    </div>
                </div>

                <!-- Right Column Bays -->
                <div class="deck-column deck-column-right">
        `;

        rightStalls.forEach(stall => {
            html += this.generateBehanceStallHTML(stall, selectedCode);
        });

        html += `
                </div>
            </div>
        `;

        container.innerHTML = html;
    },

    generateBehanceStallHTML(stall, selectedCode) {
        const isSelected = stall.code === selectedCode;
        const isHazard = stall.isHazard || stall.status === 'hazard' || stall.status === 'maintenance';
        const isOccupied = stall.status === 'occupied';
        const isReservedStencil = stall.status === 'reserved-stencil';

        if (isHazard) {
            return `
                <div class="behance-stall-box stall-hazard" title="Maintenance / Blocked">
                    <div class="hazard-stripe-fill"></div>
                    <span class="stall-hazard-label">${stall.code}</span>
                </div>
            `;
        }

        if (isReservedStencil) {
            return `
                <div class="behance-stall-box stall-reserved-stencil">
                    <span class="stall-stencil-text">Reserved</span>
                    <span class="stall-sub-text">S1</span>
                </div>
            `;
        }

        if (isSelected) {
            // THE BEHANCE SIGNATURE: Solid Royal Blue Card with bold white text M12
            return `
                <div class="behance-stall-box stall-selected-blue" data-code="${stall.code}" onclick="App.selectSlotForBooking('${stall.code}')" title="Selected Slot: ${stall.code}">
                    <span class="stall-blue-code">${stall.code}</span>
                </div>
            `;
        }

        if (isOccupied) {
            return `
                <div class="behance-stall-box stall-occupied">
                    <span class="stall-stencil-ghost">${stall.code}</span>
                    ${this.getBehanceCarSVG(stall.rotate || 0)}
                </div>
            `;
        }

        // Vacant space with tarmac stencil code
        return `
            <div class="behance-stall-box stall-vacant" data-code="${stall.code}" onclick="App.selectSlotForBooking('${stall.code}')" title="Click to choose ${stall.code}">
                <span class="stall-vacant-stencil">${stall.code}</span>
            </div>
        `;
    },

    updateOverviewStats() {
        const stats = DB.getAnalytics();
        const settings = DB.getSettings();

        // Update Behance header count: "12 Slots Available"
        const behanceAvailableCount = document.querySelectorAll('.behance-available-count');
        behanceAvailableCount.forEach(el => {
            el.textContent = `${stats.vacantSlots} Slots Available`;
        });

        const countEl = document.getElementById('stat-vacant-count');
        if (countEl) {
            countEl.innerHTML = `<span class="stat-highlight">${stats.vacantSlots}</span> <span class="stat-divider">/</span> ${stats.totalSlots} Vacant`;
        }

        const rateEl = document.getElementById('stat-standard-rate');
        if (rateEl) {
            rateEl.textContent = `${settings.currencySymbol}${settings.baseRate.toFixed(2)} / hr`;
        }

        const occEl = document.getElementById('stat-occupancy-percent');
        if (occEl) {
            occEl.textContent = `${stats.occupancyRate}%`;
        }

        const occBar = document.getElementById('stat-occupancy-bar');
        if (occBar) {
            occBar.style.width = `${stats.occupancyRate}%`;
            occBar.style.backgroundColor = stats.occupancyRate > 80 ? '#ef4444' : stats.occupancyRate > 50 ? '#f59e0b' : '#10b981';
        }
    }
};

window.ParkingMap = ParkingMap;
