/**
 * Parking Management System - Embedded Database Engine (db.js)
 * Manages persistent storage in browser localStorage, initial seed data,
 * CRUD operations for slots, reservations, parking sessions, rates, and logs.
 * Includes BroadcastChannel for real-time cross-tab synchronization.
 */

const PRMS_DB_KEY = 'prms_database_v2';
const REALTIME_CHANNEL_NAME = 'prms_realtime_sync_channel';

// Real-time communication channel across browser tabs
const realtimeChannel = typeof BroadcastChannel !== 'undefined' 
    ? new BroadcastChannel(REALTIME_CHANNEL_NAME) 
    : null;

// Initial Default Seed Data matching user's submitted Pagadian facility & initial slots
const DEFAULT_SEED_DATA = {
    settings: {
        facilityName: "Times Square Parking",
        city: "New York",
        address: "0014-9255 Broadway, New York",
        distance: "2.4 Km",
        totalFloors: 2,
        baseRate: 35.00,        // Base rate per hour (PHP / USD equivalent)
        baseHours: 2,
        hourlyRate: 20.00,      // Rate per succeeding hour
        evSurcharge: 50.00,     // Additional flat fee for EV charging slots
        motorcycleDiscount: 0.5,// 50% discount for motorcycles
        gracePeriodMinutes: 20, // Minutes before un-claimed reservation is released
        overstayPenaltyRate: 50.00,
        currencySymbol: "₱"
    },
    profile: {
        name: "jap",
        plate: "JUN-321"
    },
    slots: [
        // Level 1: Behance Parking Stalls Layout (L13, M12, N13, L12, M11, S1)
        { id: "S-101", code: "L13", alias: "Slot-01", floor: 1, zone: "Zone A", type: "standard", status: "occupied", isEV: false, isPWD: false, currentSessionId: "SESS-101", reservationId: null },
        { id: "S-102", code: "M12", alias: "Slot-02", floor: 1, zone: "Zone A", type: "standard", status: "available", isEV: false, isPWD: false, currentSessionId: null, reservationId: null },
        { id: "S-103", code: "N13", alias: "Slot-03", floor: 1, zone: "Zone A", type: "standard", status: "occupied", isEV: false, isPWD: false, currentSessionId: "SESS-103", reservationId: null },
        { id: "S-104", code: "L12", alias: "Slot-04", floor: 1, zone: "Zone B", type: "standard", status: "available", isEV: false, isPWD: false, currentSessionId: null, reservationId: null },
        { id: "S-105", code: "M11", alias: "Slot-05", floor: 1, zone: "Zone B", type: "ev", status: "available", isEV: true, isPWD: false, currentSessionId: null, reservationId: null },
        { id: "S-106", code: "S1", alias: "Slot-06", floor: 1, zone: "Zone B", type: "pwd", status: "maintenance", isEV: false, isPWD: true, currentSessionId: null, reservationId: null },
        
        // Extended Floor 1 & Floor 2 Slots for Full Management & Analytics
        { id: "S-107", code: "M14", alias: "Slot-07", floor: 1, zone: "Zone C", type: "motorcycle", status: "available", isEV: false, isPWD: false, currentSessionId: null, reservationId: null },
        { id: "S-108", code: "N14", alias: "Slot-08", floor: 1, zone: "Zone C", type: "motorcycle", status: "occupied", isEV: false, isPWD: false, currentSessionId: "SESS-108", reservationId: null },
        { id: "S-201", code: "L21", alias: "Slot-09", floor: 2, zone: "Zone D", type: "standard", status: "available", isEV: false, isPWD: false, currentSessionId: null, reservationId: null },
        { id: "S-202", code: "M22", alias: "Slot-10", floor: 2, zone: "Zone D", type: "standard", status: "available", isEV: false, isPWD: false, currentSessionId: null, reservationId: null },
        { id: "S-203", code: "N21", alias: "Slot-11", floor: 2, zone: "Zone E", type: "ev", status: "available", isEV: true, isPWD: false, currentSessionId: null, reservationId: null },
        { id: "S-204", code: "S2", alias: "Slot-12", floor: 2, zone: "Zone E", type: "vip", status: "available", isEV: false, isPWD: false, currentSessionId: null, reservationId: null }
    ],
    reservations: [
        {
            id: "RES-649139",
            slotId: "S-102",
            slotCode: "Slot-02",
            driverName: "jap",
            plateNumber: "JUN-321",
            phone: "0917 555 1234",
            vehicleType: "sedan",
            startTime: new Date().toISOString(),
            durationHours: 2,
            endTime: new Date(Date.now() + 2 * 3600000).toISOString(),
            estimatedFee: 70.00,
            paymentMethod: "GCASH",
            paymentStatus: "paid",
            status: "active", // active, checked_in, completed, cancelled
            createdAt: new Date().toISOString()
        }
    ],
    sessions: [
        {
            id: "SESS-101",
            slotId: "S-101",
            slotCode: "Slot-01",
            plateNumber: "ABC-1234",
            driverName: "Maria Santos",
            vehicleType: "sedan",
            checkInTime: new Date(Date.now() - 45 * 60000).toISOString(),
            checkOutTime: null,
            status: "active",
            entryType: "walk_in"
        },
        {
            id: "SESS-103",
            slotId: "S-103",
            slotCode: "Slot-03",
            plateNumber: "XYZ-9876",
            driverName: "Carlo Dalisay",
            vehicleType: "suv",
            checkInTime: new Date(Date.now() - 90 * 60000).toISOString(),
            checkOutTime: null,
            status: "active",
            entryType: "walk_in"
        },
        {
            id: "SESS-105",
            slotId: "S-105",
            slotCode: "Slot-05",
            plateNumber: "EV-4421",
            driverName: "Elena Reyes",
            vehicleType: "ev",
            checkInTime: new Date(Date.now() - 30 * 60000).toISOString(),
            checkOutTime: null,
            status: "active",
            entryType: "walk_in"
        },
        {
            id: "SESS-108",
            slotId: "S-108",
            slotCode: "Slot-08",
            plateNumber: "MC-7712",
            driverName: "Dante Alinsod",
            vehicleType: "motorcycle",
            checkInTime: new Date(Date.now() - 120 * 60000).toISOString(),
            checkOutTime: null,
            status: "active",
            entryType: "walk_in"
        }
    ],
    payments: [
        {
            id: "PAY-649139",
            orNumber: "OR-PH-649139",
            referenceId: "RES-649139",
            slotCode: "Slot-02",
            driverName: "jap",
            plateNumber: "JUN-321",
            amount: 70.00,
            method: "GCASH",
            status: "verified",
            timestamp: new Date().toISOString()
        }
    ],
    logs: [
        {
            id: "LOG-1",
            timestamp: new Date().toISOString(),
            action: "SYSTEM_INITIALIZED",
            details: "Parking facility Robinsons Pagadian Commercial Parking Lot loaded.",
            type: "info"
        },
        {
            id: "LOG-2",
            timestamp: new Date().toISOString(),
            action: "RESERVATION_CREATED",
            details: "Driver jap reserved Slot-02 (OR-PH-649139).",
            type: "success"
        }
    ]
};

// Database Engine Object
const DB = {
    init() {
        try {
            const raw = localStorage.getItem(PRMS_DB_KEY);
            if (!raw) {
                this.save(DEFAULT_SEED_DATA);
                console.log("PRMS DB: Seed data loaded.");
            } else {
                const data = JSON.parse(raw);
                if (!data.slots || !data.settings || !data.profile || !data.slots.some(s => s.code === 'M12')) {
                    this.save(DEFAULT_SEED_DATA);
                }
            }
        } catch (e) {
            console.error("PRMS DB Init Error:", e);
            this.save(DEFAULT_SEED_DATA);
        }

        // Setup real-time listener for multi-tab sync
        if (realtimeChannel) {
            realtimeChannel.onmessage = (event) => {
                const { type, payload } = event.data;
                console.log(`[Realtime Sync] Received: ${type}`, payload);
                window.dispatchEvent(new CustomEvent('prms_database_changed', { detail: { type, payload } }));
            };
        }
    },

    getSnapshot() {
        try {
            const raw = localStorage.getItem(PRMS_DB_KEY);
            return raw ? JSON.parse(raw) : DEFAULT_SEED_DATA;
        } catch (e) {
            return DEFAULT_SEED_DATA;
        }
    },

    save(data) {
        try {
            localStorage.setItem(PRMS_DB_KEY, JSON.stringify(data));
        } catch (e) {
            console.error("PRMS DB Save Error:", e);
        }
    },

    notifyChange(type = 'UPDATE', payload = {}) {
        if (realtimeChannel) {
            try {
                realtimeChannel.postMessage({ type, payload });
            } catch (e) {
                console.warn("BroadcastChannel error:", e);
            }
        }
        window.dispatchEvent(new CustomEvent('prms_database_changed', { detail: { type, payload } }));
    },

    // ----------------------------------------------------
    // User Profile
    // ----------------------------------------------------
    getProfile() {
        const db = this.getSnapshot();
        return db.profile || DEFAULT_SEED_DATA.profile;
    },

    saveProfile(name, plate) {
        const db = this.getSnapshot();
        db.profile = { name, plate };
        this.save(db);
        this.notifyChange('PROFILE_UPDATED', db.profile);
        return db.profile;
    },

    // ----------------------------------------------------
    // Slots Operations
    // ----------------------------------------------------
    getSlots(floorFilter = 'all') {
        const db = this.getSnapshot();
        if (floorFilter === 'all' || !floorFilter) return db.slots || [];
        return (db.slots || []).filter(s => s.floor.toString() === floorFilter.toString());
    },

    getSlotById(idOrCode) {
        const db = this.getSnapshot();
        return (db.slots || []).find(s => s.id === idOrCode || s.code === idOrCode || s.alias === idOrCode);
    },

    updateSlotStatus(slotIdOrCode, newStatus, currentSessionId = null, reservationId = null) {
        const db = this.getSnapshot();
        const slot = (db.slots || []).find(s => s.id === slotIdOrCode || s.code === slotIdOrCode || s.alias === slotIdOrCode);
        if (slot) {
            slot.status = newStatus;
            slot.currentSessionId = currentSessionId;
            slot.reservationId = reservationId;
            this.save(db);
            this.notifyChange('SLOT_STATUS_CHANGED', { slotId: slot.id, code: slot.code, status: newStatus });
        }
        return slot;
    },

    addSlot(slotData) {
        const db = this.getSnapshot();
        const newId = `S-${Date.now()}`;
        const newSlot = {
            id: newId,
            code: slotData.code || `Slot-${db.slots.length + 1}`,
            floor: parseInt(slotData.floor) || 1,
            zone: slotData.zone || "Zone A",
            type: slotData.type || "standard",
            status: "available",
            isEV: slotData.type === 'ev',
            isPWD: slotData.type === 'pwd',
            currentSessionId: null,
            reservationId: null
        };
        db.slots.push(newSlot);
        this.addLog("SLOT_ADDED", `Created new slot ${newSlot.code} on Floor ${newSlot.floor}`);
        this.save(db);
        this.notifyChange('SLOT_ADDED', newSlot);
        return newSlot;
    },

    deleteSlot(slotId) {
        const db = this.getSnapshot();
        const idx = db.slots.findIndex(s => s.id === slotId || s.code === slotId);
        if (idx !== -1) {
            const deleted = db.slots.splice(idx, 1)[0];
            this.addLog("SLOT_DELETED", `Deleted slot ${deleted.code}`);
            this.save(db);
            this.notifyChange('SLOT_DELETED', deleted);
            return true;
        }
        return false;
    },

    // ----------------------------------------------------
    // Facility Settings & Rates
    // ----------------------------------------------------
    getSettings() {
        const db = this.getSnapshot();
        return db.settings || DEFAULT_SEED_DATA.settings;
    },

    saveSettings(newSettings) {
        const db = this.getSnapshot();
        db.settings = { ...db.settings, ...newSettings };
        this.addLog("SETTINGS_UPDATED", `Facility pricing policy updated.`);
        this.save(db);
        this.notifyChange('SETTINGS_UPDATED', db.settings);
        return db.settings;
    },

    calculateEstimatedFee(slot, durationHours, vehicleType = 'sedan', settings = null) {
        const cfg = settings || this.getSettings();
        let rate = cfg.baseRate; // ₱35.00 / hr

        let total = rate * durationHours;

        if (slot && (slot.isEV || slot.type === 'ev' || vehicleType === 'ev')) {
            total += cfg.evSurcharge;
        }

        if (vehicleType === 'motorcycle') {
            total *= (1 - cfg.motorcycleDiscount);
        }

        return Math.max(0, parseFloat(total.toFixed(2)));
    },

    computeFinalBilling(session, durationMinutes, settings = null) {
        const cfg = settings || this.getSettings();
        const durationHours = Math.max(1, Math.ceil(durationMinutes / 60));
        
        let baseFee = cfg.baseRate;
        let hourlyFee = 0;
        if (durationHours > cfg.baseHours) {
            hourlyFee = (durationHours - cfg.baseHours) * cfg.hourlyRate;
        }

        let evFee = (session.vehicleType === 'ev' || session.isEV) ? cfg.evSurcharge : 0;
        let subtotal = (baseFee + hourlyFee) + evFee;

        if (session.vehicleType === 'motorcycle') {
            subtotal *= (1 - cfg.motorcycleDiscount);
        }

        return {
            durationHours,
            baseFee,
            hourlyFee,
            evFee,
            totalDue: Math.max(0, parseFloat(subtotal.toFixed(2)))
        };
    },

    // ----------------------------------------------------
    // Reservations & Payments
    // ----------------------------------------------------
    getReservations() {
        const db = this.getSnapshot();
        return db.reservations || [];
    },

    createReservation(bookingData) {
        const db = this.getSnapshot();
        const slot = (db.slots || []).find(s => s.id === bookingData.slotId || s.code === bookingData.slotCode);
        
        if (!slot || slot.status !== 'available') {
            throw new Error(`Slot ${bookingData.slotCode || 'selected'} is not available.`);
        }

        const resId = `RES-${Math.floor(100000 + Math.random() * 900000)}`;
        const orNumber = `OR-PH-${Math.floor(100000 + Math.random() * 900000)}`;
        const now = new Date();
        const startTime = bookingData.startTime ? new Date(bookingData.startTime) : now;
        const duration = parseInt(bookingData.durationHours) || 2;
        const endTime = new Date(startTime.getTime() + duration * 3600000);
        const estimatedFee = this.calculateEstimatedFee(slot, duration, bookingData.vehicleType || 'sedan');

        const newReservation = {
            id: resId,
            slotId: slot.id,
            slotCode: slot.code,
            driverName: bookingData.driverName || db.profile.name,
            plateNumber: (bookingData.plateNumber || db.profile.plate).toUpperCase(),
            phone: bookingData.phone || "",
            vehicleType: bookingData.vehicleType || "sedan",
            startTime: startTime.toISOString(),
            durationHours: duration,
            endTime: endTime.toISOString(),
            estimatedFee: estimatedFee,
            paymentMethod: bookingData.paymentMethod || "GCASH",
            paymentStatus: "paid",
            status: "active",
            createdAt: now.toISOString()
        };

        const newPayment = {
            id: `PAY-${resId.replace('RES-', '')}`,
            orNumber: orNumber,
            referenceId: resId,
            slotCode: slot.code,
            driverName: newReservation.driverName,
            plateNumber: newReservation.plateNumber,
            amount: estimatedFee,
            method: newReservation.paymentMethod,
            status: "verified",
            timestamp: now.toISOString()
        };

        // Update slot status
        slot.status = "reserved";
        slot.reservationId = resId;

        db.reservations.unshift(newReservation);
        db.payments.unshift(newPayment);

        this.addLog("RESERVATION_CREATED", `Driver ${newReservation.driverName} booked ${slot.code} for ${duration} hrs. OR: ${orNumber}`);
        this.save(db);
        this.notifyChange('RESERVATION_CREATED', { reservation: newReservation, payment: newPayment });

        return { reservation: newReservation, payment: newPayment };
    },

    cancelReservation(resId) {
        const db = this.getSnapshot();
        const res = db.reservations.find(r => r.id === resId);
        if (res) {
            res.status = 'cancelled';
            const slot = db.slots.find(s => s.id === res.slotId || s.code === res.slotCode);
            if (slot && slot.status === 'reserved') {
                slot.status = 'available';
                slot.reservationId = null;
            }
            this.addLog("RESERVATION_CANCELLED", `Reservation ${resId} cancelled.`);
            this.save(db);
            this.notifyChange('RESERVATION_CANCELLED', res);
            return true;
        }
        return false;
    },

    // ----------------------------------------------------
    // Gate Operations & Vehicle Check-In / Check-Out
    // ----------------------------------------------------
    checkIn(ticketCodeOrPlate, fallbackPlate = null) {
        const db = this.getSnapshot();
        const query = (ticketCodeOrPlate || fallbackPlate || "").trim().toUpperCase();

        if (!query) throw new Error("Plate number or ticket code is required.");

        // Check if matching reservation exists
        const reservation = db.reservations.find(r => 
            (r.id.toUpperCase() === query || r.plateNumber === query) && r.status === 'active'
        );

        let targetSlot = null;
        let driverName = "Driver";
        let plateNumber = query;
        let vehicleType = "sedan";
        let resId = null;

        if (reservation) {
            targetSlot = db.slots.find(s => s.id === reservation.slotId || s.code === reservation.slotCode);
            driverName = reservation.driverName;
            plateNumber = reservation.plateNumber;
            vehicleType = reservation.vehicleType;
            resId = reservation.id;
            reservation.status = 'checked_in';
        } else {
            // Walk-in entry: find first available slot
            targetSlot = db.slots.find(s => s.status === 'available');
            if (!targetSlot) {
                throw new Error("Parking Facility is currently FULL. No vacant slot available.");
            }
        }

        const sessionId = `SESS-${Date.now()}`;
        const newSession = {
            id: sessionId,
            slotId: targetSlot.id,
            slotCode: targetSlot.code,
            plateNumber: plateNumber,
            driverName: driverName,
            vehicleType: vehicleType,
            checkInTime: new Date().toISOString(),
            checkOutTime: null,
            status: "active",
            entryType: reservation ? "reservation" : "walk_in",
            reservationId: resId
        };

        targetSlot.status = "occupied";
        targetSlot.currentSessionId = sessionId;

        db.sessions.unshift(newSession);
        this.addLog("VEHICLE_CHECK_IN", `Vehicle ${plateNumber} entered into ${targetSlot.code}`);
        this.save(db);
        this.notifyChange('CHECK_IN_SUCCESS', newSession);

        return { session: newSession, slot: targetSlot };
    },

    checkOut(sessionIdOrSlotCode, paymentMethod = 'GCASH') {
        const db = this.getSnapshot();
        const session = db.sessions.find(s => 
            (s.id === sessionIdOrSlotCode || s.slotCode === sessionIdOrSlotCode || s.plateNumber === sessionIdOrSlotCode?.toUpperCase()) && 
            s.status === 'active'
        );

        if (!session) {
            throw new Error("No active session found for checkout.");
        }

        const now = new Date();
        const checkInTime = new Date(session.checkInTime);
        const durationMinutes = Math.max(1, Math.round((now.getTime() - checkInTime.getTime()) / 60000));
        const billing = this.computeFinalBilling(session, durationMinutes, db.settings);
        const orNumber = `OR-PH-${Math.floor(100000 + Math.random() * 900000)}`;

        session.checkOutTime = now.toISOString();
        session.status = "completed";
        session.finalAmount = billing.totalDue;
        session.durationMinutes = durationMinutes;

        const targetSlot = db.slots.find(s => s.id === session.slotId || s.code === session.slotCode);
        if (targetSlot) {
            targetSlot.status = "available";
            targetSlot.currentSessionId = null;
            targetSlot.reservationId = null;
        }

        const payment = {
            id: `PAY-${Date.now()}`,
            orNumber: orNumber,
            referenceId: session.id,
            slotCode: session.slotCode,
            driverName: session.driverName,
            plateNumber: session.plateNumber,
            amount: billing.totalDue,
            method: paymentMethod,
            status: "verified",
            timestamp: now.toISOString()
        };

        db.payments.unshift(payment);
        this.addLog("VEHICLE_CHECK_OUT", `Vehicle ${session.plateNumber} checked out from ${session.slotCode}. Paid: ${billing.totalDue} via ${paymentMethod}`);
        this.save(db);
        this.notifyChange('CHECK_OUT_SUCCESS', { session, payment, billing });

        return { session, payment, billing };
    },

    // ----------------------------------------------------
    // Analytics & System Logs
    // ----------------------------------------------------
    getAnalytics() {
        const db = this.getSnapshot();
        const payments = db.payments || [];
        const slots = db.slots || [];
        const reservations = db.reservations || [];
        const sessions = db.sessions || [];

        const totalRevenue = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        
        const todayStr = new Date().toDateString();
        const todayRevenue = payments
            .filter(p => new Date(p.timestamp).toDateString() === todayStr)
            .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

        const totalSlots = slots.length;
        const occupiedSlots = slots.filter(s => s.status === 'occupied').length;
        const reservedSlots = slots.filter(s => s.status === 'reserved').length;
        const vacantSlots = slots.filter(s => s.status === 'available').length;
        const occupancyRate = totalSlots > 0 ? Math.round(((occupiedSlots + reservedSlots) / totalSlots) * 100) : 0;

        // Vehicle distribution
        const vehicleCounts = {
            sedan: 0,
            suv: 0,
            motorcycle: 0,
            ev: 0
        };

        sessions.forEach(s => {
            const v = s.vehicleType || 'sedan';
            if (vehicleCounts[v] !== undefined) vehicleCounts[v]++;
            else vehicleCounts.sedan++;
        });

        // Hourly distribution (mock past 6 hours)
        const hourlyOccupancy = [10, 25, 45, 60, 50, occupancyRate];

        return {
            totalRevenue,
            todayRevenue,
            totalSlots,
            occupiedSlots,
            reservedSlots,
            vacantSlots,
            occupancyRate,
            totalBookingsCount: reservations.length + sessions.length,
            vehicleCounts,
            hourlyOccupancy
        };
    },

    addLog(action, details, type = 'info') {
        const db = this.getSnapshot();
        const log = {
            id: `LOG-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: action,
            details: details,
            type: type
        };
        db.logs = db.logs || [];
        db.logs.unshift(log);
        if (db.logs.length > 100) db.logs.pop();
        this.save(db);
    },

    getLogs() {
        const db = this.getSnapshot();
        return db.logs || [];
    },

    resetDatabase() {
        this.save(DEFAULT_SEED_DATA);
        this.notifyChange('DB_RESET', DEFAULT_SEED_DATA);
    },

    formatDuration(minutes) {
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
        if (hrs > 0) return `${hrs} hr${hrs > 1 ? 's' : ''}`;
        return `${mins} min${mins > 1 ? 's' : ''}`;
    }
};

// Auto-initialize DB
DB.init();
