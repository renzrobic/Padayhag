/**
 * Parking Management System - Gate Operator Console (attendant.js)
 * Vehicle entry check-in, HTML5 camera QR reader, walk-in allocations,
 * and live active vehicles monitoring table.
 */

const AttendantModule = {
    html5QrCode: null,
    isScannerRunning: false,
    selectedSessionForCheckout: null,

    init() {
        this.renderActiveSessionsTable();

        // Listen for database changes
        window.addEventListener('prms_database_changed', () => {
            this.renderActiveSessionsTable();
        });
    },

    handleCheckInSubmit(event) {
        if (event) event.preventDefault();
        const codeInput = document.getElementById('gate-ticket-input');
        const code = codeInput ? codeInput.value.trim() : '';

        if (!code) {
            App.showToast("Please enter a Ticket Code or Vehicle Plate Number.", "error");
            return;
        }

        try {
            const result = DB.checkIn(code);
            if (typeof SoundFX !== 'undefined') SoundFX.playChime();
            App.showToast(`Check-In SUCCESS: Vehicle ${result.session.plateNumber} entered into ${result.session.slotCode}`, "success");
            
            if (codeInput) codeInput.value = '';
            this.renderActiveSessionsTable();
        } catch (error) {
            App.showToast(error.message, "error");
        }
    },

    handleWalkInEntry() {
        const plateInput = document.getElementById('gate-walkin-plate-input');
        const plate = plateInput ? plateInput.value.trim().toUpperCase() : '';

        if (!plate) {
            App.showToast("Please enter a vehicle plate number for walk-in entry.", "error");
            return;
        }

        try {
            const result = DB.checkIn(null, plate);
            if (typeof SoundFX !== 'undefined') SoundFX.playChime();
            App.showToast(`Walk-In Entry Granted: ${plate} assigned to ${result.session.slotCode}`, "success");
            
            if (plateInput) plateInput.value = '';
            this.renderActiveSessionsTable();
        } catch (error) {
            App.showToast(error.message, "error");
        }
    },

    toggleCameraScanner() {
        const readerElement = document.getElementById('qr-reader-container');
        const scanBtn = document.getElementById('btn-toggle-camera-scan');
        if (!readerElement) return;

        if (this.isScannerRunning) {
            if (this.html5QrCode) {
                this.html5QrCode.stop().then(() => {
                    this.isScannerRunning = false;
                    readerElement.innerHTML = '';
                    if (scanBtn) scanBtn.innerHTML = '📷 Camera Scanner';
                });
            }
            return;
        }

        if (typeof Html5Qrcode === 'undefined') {
            App.showToast("Camera scanner module loading. You can type the code manually.", "info");
            return;
        }

        this.html5QrCode = new Html5Qrcode("qr-reader-container");
        this.html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 220, height: 220 } },
            (decodedText) => {
                if (typeof SoundFX !== 'undefined') SoundFX.playScanBeep();
                App.showToast(`Scanned Ticket: ${decodedText}`, "info");
                try {
                    const res = DB.checkIn(decodedText);
                    if (typeof SoundFX !== 'undefined') SoundFX.playChime();
                    App.showToast(`Check-In SUCCESS: ${res.session.plateNumber} -> ${res.session.slotCode}`, "success");
                } catch (e) {
                    App.showToast(e.message, "error");
                }
                this.toggleCameraScanner();
            },
            () => {}
        ).then(() => {
            this.isScannerRunning = true;
            if (scanBtn) scanBtn.innerHTML = '⏹ Stop Scanner';
        }).catch(() => {
            App.showToast("Camera access unavailable. Please type ticket code manually.", "warning");
        });
    },

    renderActiveSessionsTable() {
        const tbody = document.getElementById('active-sessions-table-body');
        const countEl = document.getElementById('active-vehicles-count');
        if (!tbody) return;

        const db = DB.getSnapshot();
        const activeSessions = (db.sessions || []).filter(s => s.status === 'active');

        if (countEl) {
            countEl.textContent = `${activeSessions.length} Active Vehicle${activeSessions.length === 1 ? '' : 's'}`;
        }

        if (activeSessions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: var(--color-text-muted); padding: 2rem;">
                        <div style="font-size: 24px; margin-bottom: 6px;">🅿️</div>
                        <p style="font-weight: 600; color: var(--color-text-dark);">No vehicles currently parked in facility</p>
                        <p style="font-size: 12px;">Active drive-in sessions and confirmed reservations will display here in real-time.</p>
                    </td>
                </tr>
            `;
            return;
        }

        const now = new Date();

        tbody.innerHTML = activeSessions.map(session => {
            const checkInDate = new Date(session.checkInTime);
            const durationMinutes = Math.max(1, Math.round((now.getTime() - checkInDate.getTime()) / 60000));
            const formattedDuration = DB.formatDuration(durationMinutes);
            const timeStr = checkInDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return `
                <tr>
                    <td><strong class="table-slot-badge">${session.slotCode}</strong></td>
                    <td><span class="table-plate-badge">${session.plateNumber}</span></td>
                    <td><strong>${session.driverName}</strong></td>
                    <td>${timeStr}</td>
                    <td><span class="duration-live-pill">${formattedDuration}</span></td>
                    <td>
                        <button type="button" class="btn-table-action" onclick="AttendantModule.openCheckOutModal('${session.id}')">
                            Checkout & Exit →
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    openCheckOutModal(sessionId) {
        const db = DB.getSnapshot();
        const session = (db.sessions || []).find(s => s.id === sessionId && s.status === 'active');

        if (!session) {
            App.showToast("Active session not found.", "error");
            return;
        }

        const checkInTime = new Date(session.checkInTime);
        const now = new Date();
        const durationMinutes = Math.max(1, Math.round((now.getTime() - checkInTime.getTime()) / 60000));
        const billing = DB.computeFinalBilling(session, durationMinutes, db.settings);
        const settings = db.settings;

        const modalBody = document.getElementById('checkout-modal-body');
        if (modalBody) {
            modalBody.innerHTML = `
                <div class="checkout-summary-header">
                    <div>
                        <span class="checkout-bay-tag">BAY ${session.slotCode}</span>
                        <div class="checkout-plate-large">${session.plateNumber}</div>
                    </div>
                    <div style="text-align: right;">
                        <span class="checkout-driver-name">${session.driverName}</span>
                        <div style="color: var(--color-text-muted); font-size: 12px;">In: ${checkInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                </div>

                <div class="checkout-receipt-calc">
                    <div class="checkout-calc-row">
                        <span class="calc-label">Total Duration:</span>
                        <strong class="calc-val">${DB.formatDuration(durationMinutes)}</strong>
                    </div>
                    <div class="checkout-calc-row">
                        <span class="calc-label">Base Rate (${settings.baseHours} hrs):</span>
                        <span class="calc-val">${settings.currencySymbol}${billing.baseFee.toFixed(2)}</span>
                    </div>
                    ${billing.hourlyFee > 0 ? `
                        <div class="checkout-calc-row">
                            <span class="calc-label">Succeeding Hours:</span>
                            <span class="calc-val">+${settings.currencySymbol}${billing.hourlyFee.toFixed(2)}</span>
                        </div>
                    ` : ''}
                    ${billing.evFee > 0 ? `
                        <div class="checkout-calc-row">
                            <span class="calc-label">⚡ EV Fast Charging:</span>
                            <span class="calc-val text-blue">+${settings.currencySymbol}${billing.evFee.toFixed(2)}</span>
                        </div>
                    ` : ''}
                    <div class="calc-divider"></div>
                    <div class="checkout-total-row">
                        <span class="checkout-total-label">Total Amount Due:</span>
                        <span class="checkout-total-val">${settings.currencySymbol}${billing.totalDue.toFixed(2)}</span>
                    </div>
                </div>

                <div style="display: flex; gap: 10px; margin-top: 18px;">
                    <button type="button" class="btn-confirm-payment" style="margin-top: 0; flex: 1;" onclick="AttendantModule.processCheckoutSession('${session.id}')">
                        Collect Payment & Open Barrier
                    </button>
                    <button type="button" class="btn-secondary" onclick="App.closeModal('gate-checkout-modal')">
                        Cancel
                    </button>
                </div>
            `;
        }

        App.openModal('gate-checkout-modal');
    },

    processCheckoutSession(sessionId) {
        try {
            const result = DB.checkOut(sessionId);
            App.closeModal('gate-checkout-modal');
            if (typeof SoundFX !== 'undefined') SoundFX.playChime();
            App.showToast(`Cleared Vehicle ${result.session.plateNumber}. Official Receipt ${result.payment.orNumber} generated.`, "success");
            
            // Switch to Exit view to show active receipt and release gate
            App.activeReceipt = {
                orNumber: result.payment.orNumber,
                timestamp: new Date(result.payment.timestamp).toLocaleString(),
                method: result.payment.method,
                totalPaid: `₱${result.billing.totalDue.toFixed(2)}`
            };
            App.currentUser.plate = result.session.plateNumber;
            App.selectedSlot = result.session.slotCode;
            App.saveState();
            App.switchView('view-exit');
        } catch (e) {
            App.showToast(e.message, "error");
        }
    }
};
