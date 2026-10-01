/**
 * Parking Management System - IoT Hardware & Telemetry Simulator (simulator.js)
 * Simulates vehicle sensors, smart entrance/exit gate triggers, and automated traffic.
 */

const IoTSimulator = {
    isAutoTrafficRunning: false,
    autoTrafficTimer: null,

    init() {
        console.log("IoT Telemetry & Simulator ready.");
    },

    triggerRandomArrival() {
        const plates = ["ABC-1234", "NCR-8890", "DAV-3341", "CEB-5521", "PAG-9901", "LUZ-7712", "MIN-4412"];
        const randomPlate = plates[Math.floor(Math.random() * plates.length)] + "-" + Math.floor(10 + Math.random() * 90);
        
        try {
            const result = DB.checkIn(null, randomPlate);
            if (typeof SoundFX !== 'undefined') SoundFX.playChime();
            App.showToast(`[IoT Sensor] Vehicle ${result.session.plateNumber} detected. Entered ${result.session.slotCode}`, "info");
        } catch (e) {
            App.showToast(`[IoT Sensor] ${e.message}`, "warning");
        }
    },

    triggerRandomDeparture() {
        const db = DB.getSnapshot();
        const activeSessions = (db.sessions || []).filter(s => s.status === 'active');

        if (activeSessions.length === 0) {
            App.showToast("[IoT Sensor] No vehicles currently parked to depart.", "info");
            return;
        }

        const randomSession = activeSessions[Math.floor(Math.random() * activeSessions.length)];
        try {
            const result = DB.checkOut(randomSession.id);
            if (typeof SoundFX !== 'undefined') SoundFX.playGateOpen();
            App.showToast(`[IoT Sensor] Vehicle ${result.session.plateNumber} departed from ${result.session.slotCode}.`, "success");
        } catch (e) {
            App.showToast(`[IoT Sensor] ${e.message}`, "warning");
        }
    }
};
