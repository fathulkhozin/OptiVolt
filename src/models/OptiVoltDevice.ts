export interface TelemetryData {
    v_plts: number;
    i_plts: number;
    p_plts: number; // calculated field (v * i)
    v_out: number;
    i_out: number;
    p_out: number;  // calculated field (v * i)
    batt_pct: number;
    load_status: boolean;
    timestamp: number;
}

export interface SettingsData {
    sol_vmax: number;
    sol_imax: number;
    bat_type: number;
    sys_volt: number;
    bat_cap: number;
}

/**
 * OptiVoltDevice is an Object-Oriented class that encapsulates 
 * the state and behavior of the physical MPPT SCADA controller.
 */
export class OptiVoltDevice {
    private telemetry: TelemetryData | null = null;
    private settings: SettingsData | null = null;

    constructor() {}

    // Encapsulation: Setters with basic validation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public setTelemetry(data: any): void {
        if (!data) return;
        this.telemetry = {
            v_plts: parseFloat(data.v_plts) || 0,
            i_plts: parseFloat(data.i_plts) || 0,
            p_plts: (parseFloat(data.v_plts) || 0) * (parseFloat(data.i_plts) || 0),
            v_out: parseFloat(data.v_out) || 0,
            i_out: parseFloat(data.i_out) || 0,
            p_out: (parseFloat(data.v_out) || 0) * (parseFloat(data.i_out) || 0),
            batt_pct: parseFloat(data.batt_pct) || 0,
            load_status: data.load_status === true || data.load_status === 'true' || data.load_status === 1,
            timestamp: Date.now()
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public setSettings(data: any): void {
        if (!data) return;
        this.settings = {
            sol_vmax: parseInt(data.sol_vmax) || 18,
            sol_imax: parseInt(data.sol_imax) || 5,
            bat_type: parseInt(data.bat_type) || 0,
            sys_volt: parseInt(data.sys_volt) || 12,
            bat_cap: parseInt(data.bat_cap) || 50
        };
    }

    // Encapsulation: Getters
    public getTelemetry(): TelemetryData | null {
        return this.telemetry;
    }

    public getSettings(): SettingsData | null {
        return this.settings;
    }

    // Business Logic Methods
    public isGeneratingPower(): boolean {
        if (!this.telemetry) return false;
        return this.telemetry.p_plts > 1.0; // More than 1W
    }

    public getEfficiency(): number {
        if (!this.telemetry || this.telemetry.p_plts <= 0) return 0;
        return (this.telemetry.p_out / this.telemetry.p_plts) * 100;
    }
}
