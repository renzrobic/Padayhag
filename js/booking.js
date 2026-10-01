/**
 * Parking Management System - Customer Booking & Passes (booking.js)
 * Live pricing previews, vehicle type discounts, QR passes, and boarding-pass style tickets.
 */

const BookingModule = {
    selectedSlot: null,
    selectedVehicleType: 'sedan',

    init() {
        this.populateSlotDropdown();
        this.calculatePricingPreview();
        this.renderUserBookings();

        // Listen for database changes
        window.addEventListener('prms_database_changed', () => {
            this.populateSlotDropdown(this.selectedSlot?.code);
            this.calculatePricingPreview();
            this.renderUserBookings();
        });
    },

    populateSlotDropdown(preSelectedCode = null) {
        const select = document.getElementById('book-slot-select');
        if (!select) return;

        const allSlots = DB.getSlots();
        const availableSlots = allSlots.filter(s => s.status === 'available');

        if (allSlots.length === 0) {
            select.innerHTML = '<option value="">No Slots Available</option>';
            return;
        }

        select.innerHTML = allSlots.map(s => {
            const isAvail = s.status === 'available';
            const isSelected = preSelectedCode && (s.code === preSelectedCode || s.id === preSelectedCode) ? 'selected' : (!preSelectedCode && isAvail ? 'selected' : '');
            const typeLabel = s.isEV ? ' ⚡ (EV Charging)' : s.isPWD ? ' ♿ (Accessible)' : s.type === 'motorcycle' ? ' 🏍️ (Motorcycle)' : '';
            const statusLabel = isAvail ? ' • Vacant' : ` • [${s.status.toUpperCase()}]`;
            return `<option value="${s.code}" ${isSelected}>${s.code} (Floor ${s.floor})${typeLabel}${statusLabel}</option>`;
        }).join('');

        const selectedOption = select.value;
        this.selectedSlot = DB.getSlotById(selectedOption) || allSlots[0];
    },

    calculatePricingPreview() {
        const slotSelect = document.getElementById('book-slot-select');
        const durationSelect = document.getElementById('reserve-duration-select');
        const vehicleSelect = document.getElementById('book-vehicle-type-select');

        if (!slotSelect || !durationSelect) return;

        const slotCode = slotSelect.value;
        const slot = DB.getSlotById(slotCode);
        const duration = parseInt(durationSelect.value, 10) || 2;
        const vehicleType = vehicleSelect ? vehicleSelect.value : 'sedan';
        const settings = DB.getSettings();

        const estimatedFee = DB.calculateEstimatedFee(slot, duration, vehicleType, settings);

        // Update Invoice Preview Elements
        const baseRateEl = document.getElementById('invoice-base-rate');
        const multEl = document.getElementById('invoice-multiplier');
        const totalEl = document.getElementById('invoice-total-due');
        const evRow = document.getElementById('invoice-ev-row');
        const mcRow = document.getElementById('invoice-mc-row');

        if (baseRateEl) baseRateEl.textContent = `${settings.currencySymbol}${settings.baseRate.toFixed(2)}`;
        if (multEl) multEl.textContent = `× ${duration} hrs`;
        if (totalEl) totalEl.textContent = `${settings.currencySymbol}${estimatedFee.toFixed(2)}`;

        if (evRow) {
            evRow.style.display = (vehicleType === 'ev' || slot?.isEV) ? 'flex' : 'none';
        }

        if (mcRow) {
            mcRow.style.display = (vehicleType === 'motorcycle') ? 'flex' : 'none';
        }

        // Highlight selected vehicle category pill if present
        document.querySelectorAll('.vehicle-cat-card').forEach(card => {
            if (card.dataset.vehicleType === vehicleType) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });
    },

    renderUserBookings() {
        const container = document.getElementById('user-bookings-container');
        const badge = document.getElementById('badge-my-bookings');
        if (!container) return;

        const reservations = DB.getReservations();
        const profile = DB.getProfile();
        
        // Filter active passes for current driver
        const userPasses = reservations.filter(r => r.plateNumber === profile.plate.toUpperCase() || r.driverName.toLowerCase() === profile.name.toLowerCase());

        const bottomBadge = document.getElementById('bottom-badge-passes');
        const activeCount = userPasses.filter(r => r.status === 'active').length;
        if (badge) {
            badge.textContent = activeCount;
            badge.style.display = activeCount > 0 ? 'inline-block' : 'none';
        }
        if (bottomBadge) {
            bottomBadge.textContent = activeCount;
            bottomBadge.style.display = activeCount > 0 ? 'flex' : 'none';
        }

        if (userPasses.length === 0) {
            container.innerHTML = `
                <div class="empty-passes-state">
                    <div class="empty-pass-icon">🎫</div>
                    <h4>No Active Parking Passes</h4>
                    <p>Reserve an available space to generate an instant QR clearance pass for barrier entry and exit.</p>
                    <button type="button" class="btn-primary-blue" style="width: auto; padding: 10px 22px; margin-top: 10px;" onclick="App.switchView('view-allocation')">
                        Browse Vacant Bays →
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = userPasses.map(pass => {
            const isCurrentActive = pass.status === 'active';
            const badgeClass = isCurrentActive ? 'badge-success' : 'badge-info';
            const statusLabel = isCurrentActive ? '🟢 Active Pass' : pass.status.toUpperCase();
            const formattedTime = new Date(pass.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

            return `
                <div class="pass-ticket-card ${isCurrentActive ? 'is-active-pass' : ''}">
                    <!-- Left Pass Stub -->
                    <div class="pass-stub-left">
                        <div class="pass-slot-callout">
                            <span class="pass-space-label">ASSIGNED BAY</span>
                            <span class="pass-slot-code">${pass.slotCode}</span>
                        </div>
                        <div class="pass-status-pill ${isCurrentActive ? 'active' : ''}">${statusLabel}</div>
                    </div>

                    <!-- Perforated Cutout Separator -->
                    <div class="pass-perforation">
                        <span class="perforation-notch top"></span>
                        <div class="perforation-dashed-line"></div>
                        <span class="perforation-notch bottom"></span>
                    </div>

                    <!-- Right Pass Details Body -->
                    <div class="pass-body-right">
                        <div class="pass-meta-top">
                            <div>
                                <span class="pass-ref-label">RESERVATION PASS CODE</span>
                                <div class="pass-code-mono">${pass.id}</div>
                            </div>
                            <div class="pass-time-stamp">Created: ${formattedTime}</div>
                        </div>

                        <div class="pass-info-grid">
                            <div class="pass-info-cell">
                                <span class="pass-cell-label">VEHICLE PLATE</span>
                                <span class="pass-cell-value plate">${pass.plateNumber}</span>
                            </div>
                            <div class="pass-info-cell">
                                <span class="pass-cell-label">Driver</span>
                                <span class="pass-cell-value">${pass.driverName}</span>
                            </div>
                            <div class="pass-info-cell">
                                <span class="pass-cell-label">Duration</span>
                                <span class="pass-cell-value">${pass.durationHours} Hours</span>
                            </div>
                            <div class="pass-info-cell">
                                <span class="pass-cell-label">Total Paid</span>
                                <span class="pass-cell-value price">₱${pass.estimatedFee.toFixed(2)}</span>
                            </div>
                        </div>

                        <div class="pass-actions-strip">
                            <button type="button" class="btn-pass-action secondary" onclick="SoundFX.playSelect(); App.showQRForPass('${pass.id}', '${pass.slotCode}', '${pass.plateNumber}')">
                                Show QR Pass
                            </button>
                            ${isCurrentActive ? `
                                <button type="button" class="btn-pass-action primary" onclick="SoundFX.playTick(); App.selectPassForExit('${pass.id}')">
                                    Proceed to Exit Barrier →
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
};
