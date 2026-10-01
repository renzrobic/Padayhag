/**
 * Parking Management System - Master Controller (app.js)
 * Coordinates sidebar navigation, facility switching, interactive 2D bay map,
 * smart checkout with integrated driver info, electronic receipts, animated barrier boom gate,
 * QR tickets, gate operator console, admin analytics, and SoundFX.
 */

const FACILITIES = {
    timessquare: {
        key: "timessquare",
        name: "Times Square Parking",
        city: "SECTOR 6, VAISHALI",
        address: "0014-9255 Broadway, New York • Open 24/7",
        rate: 35.00,
        rateDisplay: "$2.7/Day",
        distance: "2.4 Km",
        thumb: "images/parking_thumb_1.jpg",
        slotsAvailable: 12,
        mapQuery: "Times%20Square%20New%20York",
        gmapsUrl: "https://www.google.com/maps/search/?api=1&query=Times+Square+New+York"
    },
    pagadian: {
        key: "pagadian",
        name: "Robinsons Pagadian Commercial",
        city: "PAGADIAN CITY",
        address: "F. Duterte St, Pagadian City • Open 24/7 • Smart Barrier & EV Enabled",
        rate: 30.00,
        rateDisplay: "₱35.00 / hr",
        distance: "0.65 km",
        thumb: "images/parking_thumb_2.jpg",
        slotsAvailable: 8,
        mapQuery: "Rotonda%20Park%20Pagadian%20City",
        gmapsUrl: "https://www.google.com/maps/search/?api=1&query=Rotonda+Park+Pagadian+City"
    },
    manila: {
        key: "manila",
        name: "BGC Smart Parking Complex",
        city: "METRO MANILA",
        address: "7th Ave, Bonifacio Global City, Taguig • Ultra-Fast EV Hub",
        rate: 50.00,
        rateDisplay: "$3.5/Day",
        distance: "2.10 km",
        thumb: "images/parking_thumb_1.jpg",
        slotsAvailable: 10,
        mapQuery: "Bonifacio%20High%20Street%20Taguig",
        gmapsUrl: "https://www.google.com/maps/search/?api=1&query=Bonifacio+High+Street+Taguig"
    }
};

const App = {
    currentView: 'view-allocation',
    currentFacilityKey: 'timessquare',
    deviceMode: 'trio', // 'trio' | 'mobile' | 'wide'
    
    // User Profile (Integrated inside flows)
    currentUser: {
        name: 'jap',
        plate: 'JUN-321'
    },

    // Reservation State
    selectedSlot: 'M12',
    selectedDuration: 2,
    selectedVehicleType: 'car',
    selectedPaymentMethod: 'GCASH',

    // Active Receipt
    activeReceipt: {
        orNumber: 'OR-PH-649139',
        timestamp: '7/16/2026 12:00 AM',
        method: 'GCASH',
        totalPaid: '₱70.00'
    },

    gateTimer: null,

    init() {
        console.log("Parking Management System v2.4 initialized.");
        
        this.loadProfile();
        ParkingMap.init();
        BookingModule.init();
        AttendantModule.init();
        AdminModule.init();
        IoTSimulator.init();

        this.bindEvents();
        this.renderUserProfile();
        this.applyFacility(this.currentFacilityKey);
        this.updateQuickBookingWidget();

        // Set arrival default
        const startTimeInput = document.getElementById('reserve-start-time-input');
        if (startTimeInput) {
            const now = new Date();
            const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            startTimeInput.value = localIso;
        }

        const initialHash = window.location.hash ? window.location.hash.replace('#', '') : '';
        if (initialHash && document.getElementById(initialHash)) {
            this.switchView(initialHash);
        } else {
            this.switchView('view-allocation');
        }

        window.addEventListener('hashchange', () => {
            const h = window.location.hash.replace('#', '');
            if (h && document.getElementById(h) && h !== this.currentView) {
                this.switchView(h);
            }
        });

        window.addEventListener('prms_database_changed', () => {
            this.updateOverviewStats();
            this.renderUserProfile();
        });
    },

    loadProfile() {
        const profile = DB.getProfile();
        this.currentUser = { ...profile };
    },

    saveState() {
        DB.saveProfile(this.currentUser.name, this.currentUser.plate);
        this.renderUserProfile();
    },

    bindEvents() {
        // Sidebar and Bottom Nav Links
        document.querySelectorAll('.nav-link, .bottom-nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetView = btn.dataset.view;
                if (targetView) {
                    if (typeof SoundFX !== 'undefined') SoundFX.playTick();
                    this.switchView(targetView);
                    // Close mobile sidebar if open
                    document.body.classList.remove('sidebar-open');
                }
            });
        });

        // Close modals on background click or ESC key
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('open');
                }
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
            }
        });
    },

    switchView(viewId) {
        document.querySelectorAll('.nav-link, .bottom-nav-item').forEach(btn => {
            if (btn.dataset.view === viewId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        document.querySelectorAll('.view-section').forEach(view => {
            view.classList.remove('active');
        });

        const targetEl = document.getElementById(viewId);
        if (targetEl) {
            targetEl.classList.add('active');
            this.currentView = viewId;
            // Scroll to top of content area smoothly
            const mainContent = document.querySelector('.content-area');
            if (mainContent) mainContent.scrollTo({ top: 0, behavior: 'smooth' });
        }

        if (viewId === 'view-allocation') {
            ParkingMap.renderMap();
            ParkingMap.updateOverviewStats();
        } else if (viewId === 'view-reserve') {
            BookingModule.populateSlotDropdown(this.selectedSlot);
            BookingModule.calculatePricingPreview();
        } else if (viewId === 'view-exit') {
            this.updateExitView();
        } else if (viewId === 'view-my-bookings') {
            BookingModule.renderUserBookings();
        } else if (viewId === 'view-attendant') {
            AttendantModule.renderActiveSessionsTable();
        } else if (viewId === 'view-admin') {
            AdminModule.renderAll();
        }
    },

    /* =========================================================================
       PHILIPPINE FACILITY SWITCHER
       ========================================================================= */
    switchFacility(facilityKey) {
        if (!FACILITIES[facilityKey]) return;
        this.currentFacilityKey = facilityKey;
        if (typeof SoundFX !== 'undefined') SoundFX.playSelect();

        // Update active chip
        document.querySelectorAll('.facility-chip').forEach(chip => {
            if (chip.textContent.toLowerCase().includes(facilityKey)) {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        });

        this.applyFacility(facilityKey);
        this.showToast(`Switched facility to ${FACILITIES[facilityKey].name}`, "info");
    },

    applyFacility(facilityKey) {
        const fac = FACILITIES[facilityKey];
        if (!fac) return;

        const cityEl = document.getElementById('facility-city-name');
        const titleEl = document.getElementById('facility-lot-name');
        const distEl = document.getElementById('stat-facility-distance');
        const mapFrame = document.getElementById('google-maps-frame');
        const mapLink = document.getElementById('link-open-maps');

        if (cityEl) cityEl.textContent = fac.city;
        if (titleEl) titleEl.textContent = fac.name;
        if (distEl) distEl.textContent = fac.distance;
        if (mapFrame) mapFrame.src = `https://maps.google.com/maps?q=${fac.mapQuery}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
        if (mapLink) mapLink.href = fac.gmapsUrl;

        // Behance Showcase Elements
        const behanceLocName = document.getElementById('behance-loc-name');
        const deckFacName = document.getElementById('deck-fac-name');
        const deckFacAddr = document.getElementById('deck-fac-addr');
        const mapSheetTitle = document.getElementById('map-sheet-title');
        const mapSheetAddr = document.getElementById('map-sheet-addr');
        const mapSheetPrice = document.getElementById('map-sheet-price');
        const mapSheetDist = document.getElementById('map-sheet-dist');

        if (behanceLocName) behanceLocName.textContent = fac.city;
        if (deckFacName) deckFacName.textContent = fac.name;
        if (deckFacAddr) deckFacAddr.textContent = fac.address;
        if (mapSheetTitle) mapSheetTitle.textContent = fac.name;
        if (mapSheetAddr) mapSheetAddr.textContent = fac.address;
        if (mapSheetPrice) mapSheetPrice.textContent = fac.rateDisplay || `${fac.rate} $`;
        if (mapSheetDist) mapSheetDist.textContent = fac.distance;

        // Update DB rate
        const settings = DB.getSettings();
        settings.baseRate = fac.rate;
        settings.facilityName = fac.name;
        settings.city = fac.city;
        DB.saveSettings(settings);

        ParkingMap.updateOverviewStats();
        BookingModule.calculatePricingPreview();
    },

    /* =========================================================================
       SPOT ALLOCATION CONTROLS
       ========================================================================= */
    setFloorFilter(floorNum) {
        if (typeof SoundFX !== 'undefined') SoundFX.playTick();
        document.querySelectorAll('.deck-btn').forEach(btn => {
            if (btn.dataset.floor === floorNum.toString()) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        ParkingMap.currentFloor = floorNum;
        ParkingMap.renderMap();
    },

    handleTypeFilterChange(type) {
        if (typeof SoundFX !== 'undefined') SoundFX.playTick();
        ParkingMap.currentTypeFilter = type;
        const filterSelect = document.getElementById('map-type-filter');
        if (filterSelect) filterSelect.value = type;
        ParkingMap.renderMap();
    },

    selectSlotForBooking(slotCode) {
        const slot = DB.getSlotById(slotCode);
        if (!slot || slot.status !== 'available') {
            if (typeof SoundFX !== 'undefined') SoundFX.playTick();
            this.showToast(`${slotCode} is not available for reservation.`, 'info');
            return;
        }

        this.selectedSlot = slotCode;
        if (typeof SoundFX !== 'undefined') SoundFX.playSelect();
        ParkingMap.renderMap();
        BookingModule.populateSlotDropdown(slotCode);
        BookingModule.calculatePricingPreview();
        this.updateQuickBookingWidget();
        this.showToast(`Selected Slot ${slotCode}`, 'success');
    },

    updateQuickBookingWidget() {
        const slotEl = document.getElementById('quick-slot-code');
        const btnSlotEl = document.getElementById('quick-btn-slot-label');
        const zoneEl = document.getElementById('quick-slot-zone');
        const priceEl = document.getElementById('quick-price-display');

        if (slotEl) slotEl.textContent = this.selectedSlot;
        if (btnSlotEl) btnSlotEl.textContent = this.selectedSlot;

        const slot = DB.getSlotById(this.selectedSlot);
        if (zoneEl && slot) {
            zoneEl.textContent = `Floor ${slot.floor} • ${slot.type === 'ev' ? 'EV Charging ⚡' : slot.type === 'motorcycle' ? 'Motorcycle 🏍️' : 'Standard Bay 🚗'}`;
        }

        const settings = DB.getSettings();
        if (priceEl && settings) {
            priceEl.textContent = `${settings.currencySymbol}${settings.baseRate.toFixed(2)} / hr`;
        }
    },

    goToChooseSlot(slotCode = 'M12') {
        if (typeof SoundFX !== 'undefined') SoundFX.playSelect();
        this.selectedSlot = slotCode;
        ParkingMap.renderMap();
        this.updateQuickBookingWidget();
        this.switchView('view-allocation');
    },

    confirmSlotAndCheckout() {
        if (typeof SoundFX !== 'undefined') SoundFX.playSuccess();
        BookingModule.populateSlotDropdown(this.selectedSlot);
        BookingModule.calculatePricingPreview();
        this.switchView('view-reserve');
        this.showToast(`Proceeding to checkout with ${this.selectedSlot}`, 'success');
    },

    setTransportation(vehicleType) {
        if (typeof SoundFX !== 'undefined') SoundFX.playSelect();
        this.selectedVehicleType = vehicleType;
        document.querySelectorAll('.transport-pill, .quick-vehicle-chip').forEach(pill => {
            if (pill.dataset.type === vehicleType) {
                pill.classList.add('active');
            } else {
                pill.classList.remove('active');
            }
        });
        const select = document.getElementById('book-vehicle-type-select');
        if (select) select.value = vehicleType;
        BookingModule.calculatePricingPreview();
    },

    toggleFloorBehance() {
        if (typeof SoundFX !== 'undefined') SoundFX.playTick();
        const nextFloor = ParkingMap.currentFloor === '1' ? '2' : '1';
        ParkingMap.currentFloor = nextFloor;
        const floorBtns = document.querySelectorAll('.behance-floor-pill');
        floorBtns.forEach(btn => {
            btn.innerHTML = `${nextFloor === '1' ? '1st' : '2nd'} Floor <span>⌵</span>`;
        });
        ParkingMap.renderMap();
    },

    setDeviceMode(mode) {
        if (typeof SoundFX !== 'undefined') SoundFX.playSelect();
        this.deviceMode = mode;
        const body = document.body;
        body.classList.remove('mode-trio', 'mode-mobile', 'mode-wide');
        body.classList.add(`mode-${mode}`);
        document.querySelectorAll('.device-mode-btn').forEach(btn => {
            if (btn.dataset.mode === mode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    },

    /* =========================================================================
       RESERVE & PAY
       ========================================================================= */
    handleSlotSelectChange(slotCode) {
        this.selectedSlot = slotCode;
        BookingModule.calculatePricingPreview();
    },

    handleVehicleTypeChange(type) {
        this.selectedVehicleType = type;
        const select = document.getElementById('book-vehicle-type-select');
        if (select) select.value = type;
        BookingModule.calculatePricingPreview();
    },

    handleDurationChange() {
        const durationSelect = document.getElementById('reserve-duration-select');
        this.selectedDuration = durationSelect ? parseInt(durationSelect.value, 10) || 2 : 2;
        BookingModule.calculatePricingPreview();
    },

    handlePaymentChannelChange(method) {
        this.selectedPaymentMethod = method;
        if (typeof SoundFX !== 'undefined') SoundFX.playSelect();

        document.querySelectorAll('.payment-pill').forEach(pill => {
            pill.classList.remove('active');
            const radio = pill.querySelector('input[type="radio"]');
            if (radio && radio.value === method) {
                pill.classList.add('active');
                radio.checked = true;
            }
        });
    },

    authorizeAndConfirmPayment() {
        const slotCode = this.selectedSlot || 'Slot-02';
        const driverNameInput = document.getElementById('reserve-driver-name-input');
        const plateInput = document.getElementById('reserve-plate-number-input');
        const startTimeInput = document.getElementById('reserve-start-time-input');

        const driverName = driverNameInput && driverNameInput.value.trim() ? driverNameInput.value.trim() : this.currentUser.name;
        const plateNumber = plateInput && plateInput.value.trim() ? plateInput.value.trim().toUpperCase() : this.currentUser.plate;
        const startTime = startTimeInput ? startTimeInput.value : new Date().toISOString();

        const btn = document.querySelector('.btn-confirm-payment');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-inline"></span> Processing Secure Payment...';
        }

        setTimeout(() => {
            try {
                const bookingResult = DB.createReservation({
                    slotCode: slotCode,
                    driverName: driverName,
                    plateNumber: plateNumber,
                    vehicleType: this.selectedVehicleType,
                    durationHours: this.selectedDuration,
                    startTime: startTime,
                    paymentMethod: this.selectedPaymentMethod
                });

                const payment = bookingResult.payment;
                this.activeReceipt = {
                    orNumber: payment.orNumber,
                    timestamp: new Date(payment.timestamp).toLocaleString(),
                    method: payment.method,
                    totalPaid: `₱${payment.amount.toFixed(2)}`
                };

                this.currentUser.name = driverName;
                this.currentUser.plate = plateNumber;
                this.selectedSlot = slotCode;
                this.saveState();

                if (typeof SoundFX !== 'undefined') SoundFX.playChime();
                this.showToast("Payment verified! Official Receipt and Pass generated.", "success");
                this.switchView('view-exit');
            } catch (e) {
                this.showToast(e.message, "error");
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '💳 Authorize & Confirm Payment';
                }
            }
        }, 400);
    },

    /* =========================================================================
       EXIT SERVICE & HARDWARE BARRIER
       ========================================================================= */
    updateExitView() {
        const plateEl = document.getElementById('exit-display-plate');
        if (plateEl) plateEl.textContent = this.currentUser.plate;

        const slotEl = document.getElementById('exit-display-slot');
        if (slotEl) slotEl.textContent = this.selectedSlot;

        // Receipt details
        const orEl = document.getElementById('receipt-or-number');
        if (orEl) orEl.textContent = this.activeReceipt.orNumber;

        const timeEl = document.getElementById('receipt-timestamp');
        if (timeEl) timeEl.textContent = this.activeReceipt.timestamp;

        const methodEl = document.getElementById('receipt-method');
        if (methodEl) methodEl.textContent = this.activeReceipt.method;

        const totalEl = document.getElementById('receipt-total-paid');
        if (totalEl) totalEl.textContent = this.activeReceipt.totalPaid;
    },

    releaseSlotAndOpenGate() {
        const gateBtn = document.getElementById('btn-release-gate');
        const arm = document.getElementById('barrier-arm-group');
        const led = document.getElementById('gate-led-light');
        const statusText = document.getElementById('gate-status-text');
        const countdownEl = document.getElementById('gate-auto-close-countdown');

        if (gateBtn) {
            gateBtn.disabled = true;
            gateBtn.innerHTML = '<span class="spinner-inline"></span> Releasing Barrier Lock...';
        }

        if (typeof SoundFX !== 'undefined') SoundFX.playGateOpen();

        // Animate barrier arm & change LED to green
        if (arm) arm.style.transform = 'rotate(-72deg)';
        if (led) {
            led.className = 'gate-led green';
        }
        if (statusText) {
            statusText.textContent = 'GATE OPEN - PROCEED SAFELY';
        }

        // Free slot in database
        DB.updateSlotStatus(this.selectedSlot, 'available');

        // Show countdown timer bar
        if (countdownEl) {
            countdownEl.style.display = 'block';
            countdownEl.textContent = 'Auto-closing in 3.5s...';
        }

        setTimeout(() => {
            this.showToast(`Barrier Gate Opened! ${this.selectedSlot} marked as Vacant in directory.`, 'success');
            
            if (gateBtn) {
                gateBtn.disabled = false;
                gateBtn.innerHTML = 'Release Bay & Open Gate';
            }

            // Close arm after 3.5s and reset LED
            setTimeout(() => {
                if (arm) arm.style.transform = 'rotate(0deg)';
                if (led) led.className = 'gate-led red';
                if (statusText) statusText.textContent = 'Barrier Locked';
                if (countdownEl) countdownEl.style.display = 'none';
            }, 3500);
        }, 700);
    },

    printActiveReceipt() {
        if (typeof SoundFX !== 'undefined') SoundFX.playTick();
        window.print();
    },

    /* =========================================================================
       DIGITAL PASS QR MODAL
       ========================================================================= */
    openPassQRModal() {
        if (typeof SoundFX !== 'undefined') SoundFX.playSelect();
        this.showQRForPass('RES-649139', this.selectedSlot, this.currentUser.plate);
    },

    showQRForPass(resId, slotCode, plate) {
        const qrContainer = document.getElementById('modal-qr-container');
        const plateEl = document.getElementById('qr-modal-plate');
        const slotEl = document.getElementById('qr-modal-slot');
        const codeEl = document.getElementById('qr-modal-code');

        if (plateEl) plateEl.textContent = `Plate: ${plate}`;
        if (slotEl) slotEl.textContent = `Assigned: ${slotCode}`;
        if (codeEl) codeEl.textContent = `Pass ID: ${resId}`;

        if (qrContainer) {
            qrContainer.innerHTML = '';
            if (typeof QRCode !== 'undefined') {
                new QRCode(qrContainer, {
                    text: resId || `PASS-${plate}-${slotCode}`,
                    width: 170,
                    height: 170,
                    colorDark: "#0f172a",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });
            } else {
                qrContainer.innerHTML = `<div style="font-weight: 800; color: #0084d1; font-size: 18px; padding: 2rem;">${resId}</div>`;
            }
        }

        this.openModal('qr-pass-modal');
    },

    closePassQRModal() {
        this.closeModal('qr-pass-modal');
    },

    selectPassForExit(resId) {
        const res = DB.getReservations().find(r => r.id === resId);
        if (res) {
            this.selectedSlot = res.slotCode;
            this.currentUser.plate = res.plateNumber;
            this.activeReceipt = {
                orNumber: `OR-PH-${res.id.replace('RES-', '')}`,
                timestamp: new Date(res.createdAt).toLocaleString(),
                method: res.paymentMethod,
                totalPaid: `₱${res.estimatedFee.toFixed(2)}`
            };
            this.updateExitView();
            this.switchView('view-exit');
        }
    },

    renderUserProfile() {
        const resNameEl = document.getElementById('reserve-driver-name-input');
        const resPlateEl = document.getElementById('reserve-plate-number-input');

        if (resNameEl) resNameEl.value = this.currentUser.name;
        if (resPlateEl) resPlateEl.value = this.currentUser.plate;
    },

    updateOverviewStats() {
        ParkingMap.updateOverviewStats();
    },

    /* Modal Helpers */
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
    },

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('open');
            document.body.style.overflow = '';
        }
    },

    toggleMobileMenu() {
        document.body.classList.toggle('sidebar-open');
    },

    toggleMapEmbed() {
        const drawer = document.getElementById('map-embed-drawer');
        const text = document.getElementById('map-toggle-text');
        if (!drawer) return;
        const isOpen = drawer.classList.toggle('open');
        if (text) {
            text.textContent = isOpen ? 'Hide GPS Map' : 'Show GPS Map';
        }
        if (typeof SoundFX !== 'undefined') SoundFX.playTick();
    },

    /* Toast Notification with Smooth Slide & Icon */
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ';
        toast.innerHTML = `<span class="toast-icon">${icon}</span> <span class="toast-text">${message}</span>`;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-fadeout');
            setTimeout(() => toast.remove(), 300);
        }, 3600);
    }
};

// Auto-bootstrap
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
