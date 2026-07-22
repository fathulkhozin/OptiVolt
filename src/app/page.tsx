'use client';
import { useState, useEffect, useRef } from 'react';
import { FirebaseService } from '../services/FirebaseService';
import { OptiVoltDevice } from '../models/OptiVoltDevice';
import { LayoutDashboard, BarChart2, Settings, LogOut, Zap, Battery, AlertTriangle, Activity, Gauge, Terminal, Info, Edit3, Cpu, CheckCircle, Menu, X, Database } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  DoughnutController,
  ArcElement
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  DoughnutController,
  ArcElement
);

export default function Home() {
  const [device, setDevice] = useState<OptiVoltDevice | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analytics' | 'settings'>('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Historical data for charts
  const [historyLabels, setHistoryLabels] = useState<string[]>([]);
  const [powerPltsData, setPowerPltsData] = useState<number[]>([]);
  const [powerOutData, setPowerOutData] = useState<number[]>([]);
  const [logs, setLogs] = useState<{time: string, msg: string}[]>([]);

  // Settings local state for the form
  const [solVmax, setSolVmax] = useState(18);
  const [solImax, setSolImax] = useState(5);
  const [batType, setBatType] = useState(0);
  const [sysVolt, setSysVolt] = useState(12);
  const [batCap, setBatCap] = useState(50);
  const [sheetRecordActive, setSheetRecordActive] = useState(false);
  const [sheetStartTime, setSheetStartTime] = useState("06:00");
  const [sheetEndTime, setSheetEndTime] = useState("18:00");
  const [sheetRecordStatus, setSheetRecordStatus] = useState("Belum ada rekaman");
  const [settingsStatus, setSettingsStatus] = useState('Status: Waiting...');

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('mppt_token')) {
      setIsLoggedIn(true);
    }

    if (!isLoggedIn) return;

    const fbService = FirebaseService.getInstance();
    
    const unsubTelemetry = fbService.listenToTelemetry((updatedDevice) => {
      const t = updatedDevice.getTelemetry();
      
      setDevice(prev => {
          const newDev = new OptiVoltDevice();
          if(t) newDev.setTelemetry(t);
          if(prev) {
              const s = prev.getSettings();
              if(s) newDev.setSettings(s);
          }
          return newDev;
      });

      if (t) {
          const now = new Date();
          const timeStr = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
          
          setHistoryLabels(prev => [...prev.slice(-29), timeStr]);
          setPowerPltsData(prev => [...prev.slice(-29), t.p_plts]);
          setPowerOutData(prev => [...prev.slice(-29), t.p_out]);
          
          setLogs(prev => [{
              time: timeStr,
              msg: `V_PLTS: ${t.v_plts.toFixed(1)}V, P_PLTS: ${t.p_plts.toFixed(1)}W, BATT: ${t.batt_pct.toFixed(0)}%`
          }, ...prev].slice(0, 50));
      }
    });

    const unsubSettings = fbService.listenToSettings((updatedDevice) => {
        const s = updatedDevice.getSettings();
        if(s) {
            setSolVmax(s.sol_vmax);
            setSolImax(s.sol_imax);
            setBatType(s.bat_type);
            setSysVolt(s.sys_volt);
            setBatCap(s.bat_cap);
            if(s.sheet_record_active !== undefined) setSheetRecordActive(s.sheet_record_active);
            if(s.sheet_start_time) setSheetStartTime(s.sheet_start_time);
            if(s.sheet_end_time) setSheetEndTime(s.sheet_end_time);
            if(s.sheet_record_status) setSheetRecordStatus(s.sheet_record_status);
        }
        setDevice(prev => {
            if(!prev) return updatedDevice;
            const newDev = new OptiVoltDevice();
            newDev.setTelemetry(prev.getTelemetry());
            newDev.setSettings(s);
            return newDev;
        });
    });

    return () => {
      unsubTelemetry();
      unsubSettings();
    };
  }, [isLoggedIn]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('mppt_token', 'logged-in');
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('mppt_token');
    setIsLoggedIn(false);
  };

  const handleToggleLoad = async (checked: boolean) => {
      const fbService = FirebaseService.getInstance();
      await fbService.toggleLoad(checked); 
  };

  const saveSettings = async (e: React.FormEvent) => {
      e.preventDefault();
      setSettingsStatus('Status: Updating...');
      const fbService = FirebaseService.getInstance();
      await fbService.updateSettings({
          sol_vmax: solVmax,
          sol_imax: solImax,
          bat_type: batType,
          sys_volt: sysVolt,
          bat_cap: batCap,
          sheet_record_active: sheetRecordActive,
          sheet_start_time: sheetStartTime,
          sheet_end_time: sheetEndTime
      });
      setSettingsStatus('Status: Synchronized with ESP32');
  };

  if (!isLoggedIn) {
    return (
      <div id="login-screen" className="fixed inset-0 flex items-center justify-center bg-gray-50 backdrop-blur-md z-50">
        <div className="bg-white p-8 rounded-2xl w-full max-w-md mx-4 shadow-xl border border-gray-100 border-t-4 border-t-red-600">
            <div className="text-center mb-8">
                <div className="flex justify-center mb-4">
                    <img src="/logo.jpg" alt="KOPDES Logo" className="w-20 h-20 object-contain" />
                </div>
                <div className="mb-1">
                    <span className="text-2xl font-bold text-gray-900">KOPDES <span className="text-red-600">MERAH PUTIH</span></span>
                </div>
                <p className="text-xs tracking-widest uppercase mb-1 text-gray-500 font-semibold">Sistem Informasi Koperasi Desa</p>
                <p className="text-sm mt-2 text-gray-400">OptiVolt Controller Portal</p>
            </div>
            <form onSubmit={handleLogin}>
                <div className="mb-4">
                    <label className="block text-sm mb-1 text-gray-700 font-medium">Username</label>
                    <input type="text" required className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-gray-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600" />
                </div>
                <div className="mb-6">
                    <label className="block text-sm mb-1 text-gray-700 font-medium">Password</label>
                    <input type="password" required className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-gray-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600" />
                </div>
                {loginError && <p className="text-red-500 text-sm mb-4 text-center">Login failed!</p>}
                <button type="submit" className="w-full font-bold p-3 rounded-lg transition-all bg-red-600 hover:bg-red-700 text-white shadow-md">
                    Masuk ke Dashboard
                </button>
            </form>
        </div>
      </div>
    );
  }

  const tel = device?.getTelemetry();
  const set = device?.getSettings();
  const eff = device?.getEfficiency() || 0;
  const sysLoss = tel ? (tel.p_plts - tel.p_out) : 0;
  const isOnline = tel && (Date.now() - tel.timestamp < 10000); 

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    elements: {
        line: { tension: 0.4 },
        point: { radius: 0, hitRadius: 10, hoverRadius: 4 }
    },
    scales: {
        x: { display: false },
        y: { grid: { color: 'rgba(0, 0, 0, 0.05)' }, border: { dash: [4, 4] }, ticks: { color: 'rgba(0, 0, 0, 0.5)' } }
    },
    plugins: {
        legend: { labels: { color: '#374151' } }
    }
  };

  const chartData = {
    labels: historyLabels.length > 0 ? historyLabels : [''],
    datasets: [
        {
            label: 'Solar Power (W)',
            data: powerPltsData.length > 0 ? powerPltsData : [0],
            borderColor: '#dc2626',
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            fill: true,
            borderWidth: 2
        },
        {
            label: 'Output Power (W)',
            data: powerOutData.length > 0 ? powerOutData : [0],
            borderColor: '#374151',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 5]
        }
    ]
  };

  const doughnutData = {
      labels: ['Output Usage', 'System Losses'],
      datasets: [{
          data: [tel ? tel.p_out : 0, sysLoss > 0 ? sysLoss : 0],
          backgroundColor: ['#2563eb', '#dc2626'],
          borderWidth: 0,
          cutout: '70%'
      }]
  };
  
  const doughnutOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } }
  };

  return (
    <div className="flex min-h-screen text-gray-900 bg-gray-50">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Sidebar */}
      <aside className={`w-64 flex flex-col z-50 bg-white border-r border-gray-200 shadow-sm fixed md:static inset-y-0 left-0 transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="p-5 flex items-center justify-between border-b border-gray-200">
            <div className="flex items-center gap-3">
                <img src="/logo.jpg" alt="Logo Kopdes" className="w-10 h-10 object-contain rounded-md" />
                <div>
                    <h1 className="font-bold text-lg tracking-tight text-gray-900">KOPDES</h1>
                    <p className="text-xs text-red-600 font-semibold">MERAH PUTIH</p>
                </div>
            </div>
            <button className="md:hidden text-gray-500 hover:text-gray-900" onClick={() => setIsMobileMenuOpen(false)}>
                <X className="w-6 h-6" />
            </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-1.5">
            <button onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${activeTab === 'dashboard' ? 'bg-red-50 text-red-600 border-red-100 font-semibold shadow-sm' : 'text-gray-600 border-transparent hover:bg-gray-50 font-medium'}`}>
                <LayoutDashboard className="w-5 h-5" />
                <span>Dashboard</span>
            </button>
            <button onClick={() => { setActiveTab('analytics'); setIsMobileMenuOpen(false); }} className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${activeTab === 'analytics' ? 'bg-red-50 text-red-600 border-red-100 font-semibold shadow-sm' : 'text-gray-600 border-transparent hover:bg-gray-50 font-medium'}`}>
                <BarChart2 className="w-5 h-5" />
                <span>Analytics</span>
            </button>
            <button onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }} className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${activeTab === 'settings' ? 'bg-red-50 text-red-600 border-red-100 font-semibold shadow-sm' : 'text-gray-600 border-transparent hover:bg-gray-50 font-medium'}`}>
                <Settings className="w-5 h-5" />
                <span>Settings</span>
            </button>
            <button onClick={handleLogout} className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl transition-colors mt-6 text-gray-500 hover:bg-red-50 hover:text-red-600 font-medium">
                <LogOut className="w-5 h-5" />
                <span>Keluar</span>
            </button>
        </nav>

        <div className="p-4 mt-auto">
            <div className="rounded-xl p-4 bg-gray-50 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} pulse-dot`}></div>
                    <span className="text-sm font-medium text-gray-600">{isOnline ? 'Sistem Online' : 'Terputus'}</span>
                </div>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <header className="mb-8 flex justify-between items-end">
            <div className="flex items-center gap-4">
                <button className="md:hidden text-gray-900 bg-white p-2 rounded-lg shadow-sm border border-gray-200" onClick={() => setIsMobileMenuOpen(true)}>
                    <Menu className="w-6 h-6" />
                </button>
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">OptiVolt Controller Overview</h2>
                </div>
            </div>
            {/* Logo on top right just as an aesthetic touch */}
            <div className="hidden md:block opacity-10">
                <img src="/logo.jpg" alt="Watermark" className="w-24 h-24 grayscale" />
            </div>
        </header>

        {activeTab === 'dashboard' && (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Solar Power */}
                <div className="glass-card p-6 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-gray-500 font-medium text-sm">Daya Surya (Input)</p>
                            <h3 className="text-3xl font-bold mt-1 text-gray-900">{tel ? tel.p_plts.toFixed(1) : '--'} <span className="text-lg text-gray-500 ml-1">W</span></h3>
                        </div>
                        <div className="p-3 bg-amber-50 rounded-xl">
                            <Zap className="w-6 h-6 text-amber-500 group-hover:scale-110 transition-transform"/>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-4 pt-4 border-t border-gray-100">
                        <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-amber-500"/> {tel ? tel.v_plts.toFixed(1) : '--'} V</span>
                        <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-amber-500"/> {tel ? tel.i_plts.toFixed(2) : '--'} A</span>
                    </div>
                </div>

                {/* Battery Level */}
                <div className="glass-card p-6 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-gray-500 font-medium text-sm">Level Baterai</p>
                            <h3 className="text-3xl font-bold mt-1 text-gray-900">{tel ? tel.batt_pct.toFixed(0) : '--'} <span className="text-lg text-gray-500 ml-1">%</span></h3>
                        </div>
                        <div className="p-3 bg-green-50 rounded-xl">
                            <Battery className="w-6 h-6 text-green-500 group-hover:scale-110 transition-transform"/>
                        </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-4">
                        <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{width: `${tel?.batt_pct || 0}%`}}></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-right">{tel?.v_out.toFixed(1)}V</p>
                </div>

                {/* Output Power */}
                <div className="glass-card p-6 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-gray-500 font-medium text-sm">Daya Beban (Output)</p>
                            <h3 className="text-3xl font-bold mt-1 text-gray-900">{tel ? tel.p_out.toFixed(1) : '--'} <span className="text-lg text-gray-500 ml-1">W</span></h3>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-xl">
                            <Zap className="w-6 h-6 text-blue-500 group-hover:scale-110 transition-transform"/>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-4 pt-4 border-t border-gray-100">
                        <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-blue-400"/> {tel ? tel.v_out.toFixed(1) : '--'} V</span>
                        <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-blue-400"/> {tel ? tel.i_out.toFixed(2) : '--'} A</span>
                    </div>
                </div>

                {/* Efficiency */}
                <div className="glass-card p-6 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-gray-500 font-medium text-sm">Efisiensi MPPT</p>
                            <h3 className="text-3xl font-bold mt-1 text-red-600">{tel ? eff.toFixed(1) : '--'} <span className="text-lg text-red-400 ml-1">%</span></h3>
                        </div>
                        <div className="p-3 bg-red-50 rounded-xl">
                            <Gauge className="w-6 h-6 text-red-600 group-hover:scale-110 transition-transform"/>
                        </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-4">
                        <div className="bg-red-500 h-1.5 rounded-full transition-all" style={{width: `${eff}%`}}></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-right">Kehilangan: {tel ? sysLoss.toFixed(1) : '--'} W</p>
                </div>
            </div>

            {/* Remote Load Control (SCADA) */}
            <div className={`glass-card p-6 mb-8 relative overflow-hidden group border-l-4 transition-colors duration-500 ${tel?.load_status ? 'border-l-red-600 bg-red-50/30' : 'border-l-gray-300'}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-2xl transition-colors duration-500 ${tel?.load_status ? 'bg-red-100' : 'bg-gray-100'}`}>
                            <AlertTriangle className={`w-8 h-8 transition-colors duration-500 ${tel?.load_status ? 'text-red-600' : 'text-gray-400'}`} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Kontrol Beban Jarak Jauh (Remote Load)</h3>
                            <p className={`text-sm mt-1 font-medium transition-colors duration-500 ${tel?.load_status ? 'text-red-600' : 'text-gray-500'}`}>
                                Status saat ini: {tel?.load_status ? 'MENYALA (ACTIVE)' : 'MATI (OFF)'}
                            </p>
                        </div>
                    </div>
                    <div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={tel?.load_status || false} onChange={() => handleToggleLoad(tel?.load_status || false)} className="sr-only peer" />
                            <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-red-600 transition-colors shadow-inner"></div>
                        </label>
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Data Table */}
                <div className="glass-card p-6 lg:col-span-2 overflow-hidden flex flex-col">
                    <h3 className="font-semibold text-lg mb-4 text-gray-900">Tabel Parameter Sistem</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-gray-500 text-sm border-b border-gray-200">
                                    <th className="pb-3 font-medium">Parameter</th>
                                    <th className="pb-3 font-medium">Input (PLTS)</th>
                                    <th className="pb-3 font-medium">Output (Beban)</th>
                                    <th className="pb-3 font-medium text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                    <td className="py-4 text-gray-600">Tegangan (V)</td>
                                    <td className="py-4 font-semibold text-gray-900">{tel ? tel.v_plts.toFixed(1) : '--'}</td>
                                    <td className="py-4 font-semibold text-gray-900">{tel ? tel.v_out.toFixed(1) : '--'}</td>
                                    <td className="py-4 text-right"><span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-medium">Normal</span></td>
                                </tr>
                                <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                    <td className="py-4 text-gray-600">Arus (A)</td>
                                    <td className="py-4 font-semibold text-gray-900">{tel ? tel.i_plts.toFixed(2) : '--'}</td>
                                    <td className="py-4 font-semibold text-gray-900">{tel ? tel.i_out.toFixed(2) : '--'}</td>
                                    <td className="py-4 text-right"><span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-medium">Optimal</span></td>
                                </tr>
                                <tr className="hover:bg-gray-50 transition-colors">
                                    <td className="py-4 text-gray-600">Daya (W)</td>
                                    <td className="py-4 font-bold text-amber-600">{tel ? tel.p_plts.toFixed(1) : '--'}</td>
                                    <td className="py-4 font-bold text-blue-600">{tel ? tel.p_out.toFixed(1) : '--'}</td>
                                    <td className="py-4 text-right"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium">Tracking</span></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Terminal */}
                <div className="glass-card p-6 flex flex-col h-full max-h-80">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2 text-gray-900">
                            <Terminal className="w-5 h-5 text-red-600" />
                            Log Sistem
                        </h3>
                    </div>
                    <div className="bg-gray-900 rounded-xl p-3 flex-1 overflow-y-auto font-mono text-xs shadow-inner">
                        <ul className="space-y-2 text-green-400">
                            {logs.map((l, i) => (
                                <li key={i}><span className="text-gray-500">[{l.time}]</span> <span className="text-white">{l.msg}</span></li>
                            ))}
                            {logs.length === 0 && <li className="text-gray-500">Menunggu data...</li>}
                        </ul>
                    </div>
                </div>
            </div>
            </>
        )}

        {activeTab === 'analytics' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Main Area Chart */}
                <div className="glass-card p-6 lg:col-span-2">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-semibold text-lg text-gray-900">Perbandingan Daya</h3>
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 font-medium rounded-lg border border-gray-200">Last 30 updates</span>
                    </div>
                    <div className="relative h-96 w-full">
                        <Line data={chartData} options={chartOptions} />
                    </div>
                </div>

                {/* Doughnut Chart */}
                <div className="glass-card p-6 flex flex-col">
                    <h3 className="font-semibold text-lg mb-6 text-gray-900">Distribusi Energi</h3>
                    <div className="relative h-64 w-full flex-1 flex justify-center items-center">
                        <Doughnut data={doughnutData} options={doughnutOptions} />
                    </div>
                    <div className="mt-8 space-y-4">
                        <div className="flex justify-between text-sm border-b border-gray-100 pb-2">
                            <span className="text-gray-600">Total Daya Masuk</span>
                            <span className="font-bold text-red-600">{tel ? tel.p_plts.toFixed(1) : '0'} W</span>
                        </div>
                        <div className="flex justify-between text-sm border-b border-gray-100 pb-2">
                            <span className="text-gray-600">Penggunaan Beban</span>
                            <span className="font-bold text-blue-600">{tel ? tel.p_out.toFixed(1) : '0'} W</span>
                        </div>
                        <div className="flex justify-between text-sm border-b border-gray-100 pb-2">
                            <span className="text-gray-600">Kehilangan (Loss)</span>
                            <span className="font-bold text-gray-400">{tel ? sysLoss.toFixed(1) : '0'} W</span>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'settings' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
                {/* Current Settings */}
                <div className="glass-card p-8 bg-white">
                    <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                            <Info className="w-8 h-8 text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Konfigurasi Saat Ini</h3>
                            <p className="text-sm text-gray-500">Pengaturan yang sedang aktif di perangkat ESP32</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center py-3 border-b border-gray-50">
                            <span className="text-gray-500">Max PV Voltage</span>
                            <span className="font-bold text-gray-900 text-lg">{set ? set.sol_vmax : '--'} V</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-gray-50">
                            <span className="text-gray-500">Max PV Current</span>
                            <span className="font-bold text-gray-900 text-lg">{set ? set.sol_imax : '--'} A</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-gray-50">
                            <span className="text-gray-500">Battery Type</span>
                            <span className="font-bold text-gray-900 text-lg px-3 py-1 bg-gray-100 rounded-full">{set ? (set.bat_type === 0 ? 'SLA / Lead Acid' : set.bat_type === 1 ? 'Li-ion' : 'LiFePO4') : '--'}</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-gray-50">
                            <span className="text-gray-500">System Voltage</span>
                            <span className="font-bold text-gray-900 text-lg">{set ? set.sys_volt : '--'} V</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-gray-50">
                            <span className="text-gray-500">Battery Capacity</span>
                            <span className="font-bold text-gray-900 text-lg">{set ? set.bat_cap : '--'} Ah</span>
                        </div>
                    </div>
                </div>

                {/* Update Settings Form */}
                <div className="glass-card p-8">
                    <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                            <Edit3 className="w-8 h-8 text-amber-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Ubah Pengaturan</h3>
                            <p className="text-sm text-gray-500">Kirim konfigurasi baru ke perangkat keras</p>
                        </div>
                    </div>
                    <form onSubmit={saveSettings}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                            <div>
                                <label className="block text-sm text-gray-600 font-medium mb-1">Max PV Voltage (V)</label>
                                <input type="number" min="18" max="50" required value={solVmax} onChange={e => setSolVmax(Number(e.target.value))} />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 font-medium mb-1">Max PV Current (A)</label>
                                <input type="number" min="1" max="20" required value={solImax} onChange={e => setSolImax(Number(e.target.value))} />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 font-medium mb-1">Jenis Baterai</label>
                                <select value={batType} onChange={e => setBatType(Number(e.target.value))} required>
                                    <option value="0">SLA / Lead Acid</option>
                                    <option value="1">Li-ion</option>
                                    <option value="2">LiFePO4</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 font-medium mb-1">Tegangan Sistem</label>
                                <select value={sysVolt} onChange={e => setSysVolt(Number(e.target.value))} required>
                                    <option value="12">12V</option>
                                    <option value="24">24V</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 font-medium mb-1">Kapasitas (Ah)</label>
                                <input type="number" min="5" max="200" step="5" required value={batCap} onChange={e => setBatCap(Number(e.target.value))} />
                            </div>
                        </div>

                        <div className="pt-6 mt-4 border-t border-gray-100">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-green-100 rounded-xl">
                                    <Database className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Integrasi Google Sheets</h3>
                                    <p className="text-sm text-gray-500">Rekam data telemetri otomatis ke cloud via Apps Script</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                                <div className="flex items-center justify-between sm:justify-start gap-4">
                                    <label className="text-sm text-gray-600 font-medium">Aktifkan Rekaman</label>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={sheetRecordActive} onChange={(e) => setSheetRecordActive(e.target.checked)} />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                    </label>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 font-medium mb-1">Mulai Rekam (Jam)</label>
                                    <input type="time" required value={sheetStartTime} onChange={e => setSheetStartTime(e.target.value)} disabled={!sheetRecordActive} className="w-full" />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 font-medium mb-1">Selesai Rekam (Jam)</label>
                                    <input type="time" required value={sheetEndTime} onChange={e => setSheetEndTime(e.target.value)} disabled={!sheetRecordActive} className="w-full" />
                                </div>
                            </div>
                            
                            <div className="mt-2 bg-gray-50 border border-gray-100 rounded-lg p-3">
                                <span className="text-sm font-medium text-gray-700">Status Terakhir: </span>
                                <span className="text-sm text-gray-600">{sheetRecordStatus}</span>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100 flex flex-col gap-4">
                            <button type="submit" className="w-full text-white font-bold px-6 py-3 rounded-lg transition-all flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 shadow-md hover:shadow-lg">
                                <Zap className="w-4 h-4" /> Simpan Pengaturan
                            </button>
                            <span className="text-sm text-gray-500 text-center block font-medium">
                                {settingsStatus === 'Status: Synchronized with ESP32' && <CheckCircle className="w-4 h-4 text-green-500 inline-block align-middle mr-1" />}
                                <span className="align-middle">{settingsStatus}</span>
                            </span>
                        </div>
                    </form>
                </div>
            </div>
        )}

      </main>
    </div>
  );
}
