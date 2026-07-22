import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
    getDatabase, 
    ref, 
    onValue, 
    set, 
    update,
    get,
    Database 
} from 'firebase/database';
import { OptiVoltDevice, SettingsData } from '../models/OptiVoltDevice';

/**
 * Object-Oriented Service Class to handle all Firebase Interactions
 * Implements the Singleton pattern to ensure only one database connection exists.
 */
export class FirebaseService {
    private static instance: FirebaseService;
    private app: FirebaseApp | null = null;
    private db: Database | null = null;
    
    // We will initialize this from environment variables
    private firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://mppt-plts-default-rtdb.asia-southeast1.firebasedatabase.app/",
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    };

    private constructor() {
        if (!getApps().length && this.firebaseConfig.apiKey) {
            this.app = initializeApp(this.firebaseConfig);
            this.db = getDatabase(this.app);
        } else if (getApps().length > 0) {
            this.app = getApps()[0];
            this.db = getDatabase(this.app);
        }
    }

    public static getInstance(): FirebaseService {
        if (!FirebaseService.instance) {
            FirebaseService.instance = new FirebaseService();
        }
        return FirebaseService.instance;
    }

    /**
     * Subscribes to telemetry data from the ESP32.
     * Uses the OptiVoltDevice OOP class to parse and validate the data.
     */
    public listenToTelemetry(callback: (device: OptiVoltDevice) => void): () => void {
        if (!this.db) {
            console.warn("Firebase not initialized yet. Please add config to .env.local");
            return () => {};
        }

        const telemetryRef = ref(this.db, 'optivolt/telemetry');
        const unsubscribe = onValue(telemetryRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const device = new OptiVoltDevice();
                device.setTelemetry(data);
                callback(device);
            }
        });

        return unsubscribe; // Return the unsubscribe function to clean up listeners
    }

    /**
     * Subscribes to the settings config in the database.
     */
    public listenToSettings(callback: (device: OptiVoltDevice) => void): () => void {
        if (!this.db) return () => {};

        const settingsRef = ref(this.db, 'optivolt/settings');
        const unsubscribe = onValue(settingsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const device = new OptiVoltDevice();
                device.setSettings(data);
                callback(device);
            }
        });

        return unsubscribe;
    }

    /**
     * Sends a command to toggle the relay (Load Control)
     */
    public async toggleLoad(currentState: boolean): Promise<void> {
        if (!this.db) return;
        const cmdRef = ref(this.db, 'optivolt/commands');
        await update(cmdRef, {
            load_cmd: !currentState,
            timestamp: Date.now()
        });
    }

    /**
     * Updates the MPPT settings configuration
     */
    public async updateSettings(newSettings: SettingsData): Promise<void> {
        if (!this.db) return;
        const settingsRef = ref(this.db, 'optivolt/settings');
        await set(settingsRef, newSettings);
        
        // Notify ESP32 that new settings are available
        const cmdRef = ref(this.db, 'optivolt/commands');
        await update(cmdRef, {
            settings_updated: true,
            timestamp: Date.now()
        });
    }

    /**
     * Fetches all historical data points
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public async getHistoryData(): Promise<any> {
        if (!this.db) return null;
        const historyRef = ref(this.db, 'optivolt/history');
        const snapshot = await get(historyRef);
        return snapshot.val();
    }

    /**
     * Clears all historical data points to free up space
     */
    public async clearHistoryData(): Promise<void> {
        if (!this.db) return;
        const historyRef = ref(this.db, 'optivolt/history');
        await set(historyRef, null);
    }
}
