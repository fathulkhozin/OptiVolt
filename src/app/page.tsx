'use client';
import { useState, useEffect, useRef } from 'react';
import { FirebaseService } from '../services/FirebaseService';
import { OptiVoltDevice } from '../models/OptiVoltDevice';
import { LayoutDashboard, BarChart2, Settings, LogOut, Zap, Battery, AlertTriangle, Activity, Gauge, Terminal, Info, Edit3, Cpu, CheckCircle } from 'lucide-react';
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
  const [settingsStatus, setSettingsStatus] = useState('Status: Waiting...');

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('mppt_token')) {
      setIsLoggedIn(true);
    }

    if (!isLoggedIn) return;

    const fbService = FirebaseService.getInstance();
    
    const unsubTelemetry = fbService.listenToTelemetry((updatedDevice) => {
      const dev = new OptiVoltDevice();
      const t = updatedDevice.getTelemetry();
      if(t) dev.setTelemetry(t);
      const s = updatedDevice.getSettings();
      if(s) dev.setSettings(s);
      setDevice(dev);

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
      await fbService.toggleLoad(!checked); 
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
          bat_cap: batCap
      });
      setSettingsStatus('Status: Synchronized with ESP32');
  };

  if (!isLoggedIn) {
    return (
      <div id="login-screen" className="fixed inset-0 flex items-center justify-center bg-[#080808]/98 backdrop-blur-md z-50">
        <div className="glass-panel p-8 rounded-2xl w-full max-w-md mx-4 shadow-2xl" style={{border: '1px solid rgba(201,162,39,0.3)', borderTop: '3px solid #c9a227'}}>
            <div className="text-center mb-8">
                <div className="flex justify-center mb-4">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-full flex items-center justify-center unu-glow" style={{background: 'linear-gradient(135deg, #1a1208, #2a1e08)', border: '2px solid #c9a227'}}>
                            <span className="text-3xl">🌟</span>
                        </div>
                    </div>
                </div>
                <div className="mb-1">
                    <span className="text-3xl font-black gold-shimmer">OptiVolt</span>
                </div>
                <p className="text-xs tracking-widest uppercase mb-1" style={{color: 'rgba(201,162,39,0.7)'}}>Universitas Nahdlatul Ulama Yogyakarta</p>
                <p className="text-sm mt-2" style={{color: 'rgba(240,237,232,0.4)'}}>Sistem Monitoring MPPT IoT</p>
            </div>
            <form onSubmit={handleLogin}>
                <div className="mb-4">
                    <label className="block text-sm mb-1" style={{color: 'rgba(201,162,39,0.8)'}}>Username</label>
                    <input type="text" required />
                </div>
                <div className="mb-6">
                    <label className="block text-sm mb-1" style={{color: 'rgba(201,162,39,0.8)'}}>Password</label>
                    <input type="password" required />
                </div>
                {loginError && <p className="text-red-400 text-sm mb-4 text-center">Login failed!</p>}
                <button type="submit" className="w-full font-bold p-3 rounded-lg transition-all" style={{background: 'linear-gradient(135deg, #c9a227, #a07c1a)', color: '#0a0a0a', boxShadow: '0 4px 20px rgba(201,162,39,0.35)'}}>
                    🔐 Masuk ke Dashboard
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
        y: { grid: { color: 'rgba(201, 162, 39, 0.1)' }, border: { dash: [4, 4] }, ticks: { color: 'rgba(240, 237, 232, 0.5)' } }
    },
    plugins: {
        legend: { labels: { color: '#f0ede8' } }
    }
  };

  const chartData = {
    labels: historyLabels.length > 0 ? historyLabels : [''],
    datasets: [
        {
            label: 'Solar Power (W)',
            data: powerPltsData.length > 0 ? powerPltsData : [0],
            borderColor: '#c9a227',
            backgroundColor: 'rgba(201, 162, 39, 0.1)',
            fill: true,
            borderWidth: 2
        },
        {
            label: 'Output Power (W)',
            data: powerOutData.length > 0 ? powerOutData : [0],
            borderColor: '#f0ede8',
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
          backgroundColor: ['#3b82f6', '#ef4444'],
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
    <div className="flex min-h-screen text-[#f0ede8]">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col z-10 shrink-0" style={{background: 'linear-gradient(180deg, #0e0c08 0%, #080808 100%)', borderRight: '1px solid rgba(201,162,39,0.15)'}}>
        <div className="p-5 flex items-center gap-3" style={{background: 'linear-gradient(135deg, #1a1208, #0e0c06)', borderBottom: '2px solid #c9a227'}}>
            <div>
                <h1 className="font-black text-lg tracking-tight text-white">OptiVolt</h1>
                <p className="text-xs" style={{color: 'rgba(201,162,39,0.85)'}}>UNU Jogja · IoT MPPT</p>
            </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1.5">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${activeTab === 'dashboard' ? 'bg-[#c9a227]/10 text-[#e8c547] border-[#c9a227]/25' : 'text-[#f0ede8]/50 border-transparent hover:bg-[#c9a227]/10'}`}>
                <LayoutDashboard className="w-5 h-5" />
                <span className="font-semibold">Dashboard</span>
            </button>
            <button onClick={() => setActiveTab('analytics')} className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${activeTab === 'analytics' ? 'bg-[#c9a227]/10 text-[#e8c547] border-[#c9a227]/25' : 'text-[#f0ede8]/50 border-transparent hover:bg-[#c9a227]/10'}`}>
                <BarChart2 className="w-5 h-5" />
                <span className="font-semibold">Analytics</span>
            </button>
            <button onClick={() => setActiveTab('settings')} className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${activeTab === 'settings' ? 'bg-[#c9a227]/10 text-[#e8c547] border-[#c9a227]/25' : 'text-[#f0ede8]/50 border-transparent hover:bg-[#c9a227]/10'}`}>
                <Settings className="w-5 h-5" />
                <span className="font-semibold">Settings</span>
            </button>
            <button onClick={handleLogout} className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl transition-colors mt-6 text-red-400 hover:bg-red-900/20">
                <LogOut className="w-5 h-5" />
                <span className="font-semibold">Keluar</span>
            </button>
        </nav>

        <div className="p-4 mt-auto">
            <div className="rounded-xl p-4" style={{background: 'rgba(201,162,39,0.06)', border: '1px solid rgba(201,162,39,0.15)'}}>
                <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} pulse-dot`}></div>
                    <span className="text-sm font-medium text-[#f0ede8]/70">{isOnline ? 'Online' : 'Disconnected'}</span>
                </div>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
            <h2 className="text-2xl font-bold" style={{color: '#e8c547'}}>System Overview</h2>
            <p className="text-gray-400 text-sm mt-1">Real-time performance metrics via Firebase</p>
        </header>

        {activeTab === 'dashboard' && (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Solar Power */}
                <div className="glass-card p-6 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-gray-400 font-medium text-sm">Solar Power</p>
                            <h3 className="text-3xl font-bold mt-1 metric-value">{tel ? tel.p_plts.toFixed(1) : '--'} <span className="text-lg text-gray-500 ml-1">W</span></h3>
                        </div>
                        <div className="p-3 bg-yellow-500/10 rounded-xl">
                            <Zap className="w-6 h-6 text-yellow-500 group-hover:scale-110 transition-transform"/>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 mt-4 pt-4 border-t border-gray-800/50">
                        <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-[#c9a227]"/> {tel ? tel.v_plts.toFixed(1) : '--'} V</span>
                        <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-[#c9a227]"/> {tel ? tel.i_plts.toFixed(2) : '--'} A</span>
                    </div>
                </div>

                {/* Battery Level */}
                <div className="glass-card p-6 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-gray-400 font-medium text-sm">Battery Level</p>
                            <h3 className="text-3xl font-bold mt-1 metric-value">{tel ? tel.batt_pct.toFixed(0) : '--'} <span className="text-lg text-gray-500 ml-1">%</span></h3>
                        </div>
                        <div className="p-3 bg-green-500/10 rounded-xl">
                            <Battery className="w-6 h-6 text-green-500 group-hover:scale-110 transition-transform"/>
                        </div>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-1.5 mt-4">
                        <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{width: `${tel?.batt_pct || 0}%`}}></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 text-right">{tel?.v_out.toFixed(1)}V</p>
                </div>

                {/* Output Power */}
                <div className="glass-card p-6 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-gray-400 font-medium text-sm">Output Power</p>
                            <h3 className="text-3xl font-bold mt-1 metric-value">{tel ? tel.p_out.toFixed(1) : '--'} <span className="text-lg text-gray-500 ml-1">W</span></h3>
                        </div>
                        <div className="p-3 bg-blue-500/10 rounded-xl">
                            <Zap className="w-6 h-6 text-blue-500 group-hover:scale-110 transition-transform"/>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 mt-4 pt-4 border-t border-gray-800/50">
                        <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-blue-400"/> {tel ? tel.v_out.toFixed(1) : '--'} V</span>
                        <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-blue-400"/> {tel ? tel.i_out.toFixed(2) : '--'} A</span>
                    </div>
                </div>

                {/* Efficiency */}
                <div className="glass-card p-6 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-purple-500"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-gray-400 font-medium text-sm">MPPT Efficiency</p>
                            <h3 className="text-3xl font-bold mt-1 metric-value">{tel ? eff.toFixed(1) : '--'} <span className="text-lg text-gray-500 ml-1">%</span></h3>
                        </div>
                        <div className="p-3 bg-purple-500/10 rounded-xl">
                            <Gauge className="w-6 h-6 text-purple-500 group-hover:scale-110 transition-transform"/>
                        </div>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-1.5 mt-4">
                        <div className="bg-purple-500 h-1.5 rounded-full transition-all" style={{width: `${eff}%`}}></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 text-right">System Loss: {tel ? sysLoss.toFixed(1) : '--'} W</p>
                </div>
            </div>

            {/* Remote Load Control (SCADA) */}
            <div className={`glass-card p-6 mb-8 relative overflow-hidden group border-l-4 transition-colors duration-500 ${tel?.load_status ? 'border-l-[#c9a227]' : 'border-l-gray-800'}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-2xl transition-colors duration-500 ${tel?.load_status ? 'bg-[#c9a227]/20' : 'bg-gray-800/50'}`}>
                            <AlertTriangle className={`w-8 h-8 transition-colors duration-500 ${tel?.load_status ? 'text-[#c9a227]' : 'text-gray-500'}`} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Remote Load Control</h3>
                            <p className={`text-sm mt-1 font-medium transition-colors duration-500 ${tel?.load_status ? 'text-[#e8c547]' : 'text-gray-500'}`}>
                                Status: {tel?.load_status ? 'ACTIVE' : 'OFF'}
                            </p>
                        </div>
                    </div>
                    <div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={tel?.load_status || false} onChange={() => handleToggleLoad(tel?.load_status || false)} className="sr-only peer" />
                            <div className="w-14 h-7 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#c9a227] transition-colors shadow-inner"></div>
                        </label>
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Data Table */}
                <div className="glass-card p-6 lg:col-span-2 overflow-hidden flex flex-col">
                    <h3 className="font-semibold text-lg mb-4">System Parameters</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-gray-400 text-sm border-b border-gray-800">
                                    <th className="pb-3 font-medium">Parameter</th>
                                    <th className="pb-3 font-medium">Input (PLTS)</th>
                                    <th className="pb-3 font-medium">Output (Load)</th>
                                    <th className="pb-3 font-medium text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                <tr className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                                    <td className="py-4 text-gray-300">Voltage (V)</td>
                                    <td className="py-4 font-medium">{tel ? tel.v_plts.toFixed(1) : '--'}</td>
                                    <td className="py-4 font-medium">{tel ? tel.v_out.toFixed(1) : '--'}</td>
                                    <td className="py-4 text-right"><span className="px-2 py-1 bg-green-500/10 text-green-400 rounded text-xs">Normal</span></td>
                                </tr>
                                <tr className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                                    <td className="py-4 text-gray-300">Current (A)</td>
                                    <td className="py-4 font-medium">{tel ? tel.i_plts.toFixed(2) : '--'}</td>
                                    <td className="py-4 font-medium">{tel ? tel.i_out.toFixed(2) : '--'}</td>
                                    <td className="py-4 text-right"><span className="px-2 py-1 bg-green-500/10 text-green-400 rounded text-xs">Optimal</span></td>
                                </tr>
                                <tr className="hover:bg-gray-800/20 transition-colors">
                                    <td className="py-4 text-gray-300">Power (W)</td>
                                    <td className="py-4 font-bold text-[#c9a227]">{tel ? tel.p_plts.toFixed(1) : '--'}</td>
                                    <td className="py-4 font-bold text-blue-400">{tel ? tel.p_out.toFixed(1) : '--'}</td>
                                    <td className="py-4 text-right"><span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs">Tracking</span></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Terminal */}
                <div className="glass-card p-6 flex flex-col h-full max-h-80">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-gray-400" />
                            Live Data Feed
                        </h3>
                    </div>
                    <div className="bg-gray-900/80 rounded-xl p-3 flex-1 overflow-y-auto border border-gray-800/50 font-mono text-xs">
                        <ul className="space-y-2 text-green-400">
                            {logs.map((l, i) => (
                                <li key={i}><span className="text-gray-500">[{l.time}]</span> {l.msg}</li>
                            ))}
                            {logs.length === 0 && <li className="text-gray-500">Waiting for data...</li>}
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
                        <h3 className="font-semibold text-lg">Power Generation vs Usage</h3>
                        <span className="text-xs px-2 py-1 bg-gray-800 text-gray-300 rounded-lg">Last 30 updates</span>
                    </div>
                    <div className="relative h-96 w-full">
                        <Line data={chartData} options={chartOptions} />
                    </div>
                </div>

                {/* Doughnut Chart */}
                <div className="glass-card p-6 flex flex-col">
                    <h3 className="font-semibold text-lg mb-6">Energy Distribution</h3>
                    <div className="relative h-64 w-full flex-1 flex justify-center items-center">
                        <Doughnut data={doughnutData} options={doughnutOptions} />
                    </div>
                    <div className="mt-8 space-y-4">
                        <div className="flex justify-between text-sm border-b border-gray-800 pb-2">
                            <span className="text-gray-400">Total Generation</span>
                            <span className="font-bold text-[#c9a227]">{tel ? tel.p_plts.toFixed(1) : '0'} W</span>
                        </div>
                        <div className="flex justify-between text-sm border-b border-gray-800 pb-2">
                            <span className="text-gray-400">Output Usage</span>
                            <span className="font-bold text-blue-400">{tel ? tel.p_out.toFixed(1) : '0'} W</span>
                        </div>
                        <div className="flex justify-between text-sm border-b border-gray-800 pb-2">
                            <span className="text-gray-400">System Losses</span>
                            <span className="font-bold text-red-400">{tel ? sysLoss.toFixed(1) : '0'} W</span>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'settings' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
                {/* Current Settings */}
                <div className="glass-card p-8">
                    <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-800">
                        <div className="p-3 bg-blue-500/10 rounded-xl">
                            <Info className="w-8 h-8 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Current Configuration</h3>
                            <p className="text-sm text-gray-400">Settings currently active on ESP32</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center py-3 border-b border-gray-800/50">
                            <span className="text-gray-400">Max PV Voltage</span>
                            <span className="font-bold text-white text-lg">{set ? set.sol_vmax : '--'} V</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-gray-800/50">
                            <span className="text-gray-400">Max PV Current</span>
                            <span className="font-bold text-white text-lg">{set ? set.sol_imax : '--'} A</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-gray-800/50">
                            <span className="text-gray-400">Battery Type</span>
                            <span className="font-bold text-white text-lg">{set ? (set.bat_type === 0 ? 'SLA' : set.bat_type === 1 ? 'Li-ion' : 'LiFePO4') : '--'}</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-gray-800/50">
                            <span className="text-gray-400">System Voltage</span>
                            <span className="font-bold text-white text-lg">{set ? set.sys_volt : '--'} V</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-gray-800/50">
                            <span className="text-gray-400">Battery Capacity</span>
                            <span className="font-bold text-white text-lg">{set ? set.bat_cap : '--'} Ah</span>
                        </div>
                    </div>
                </div>

                {/* Update Settings Form */}
                <div className="glass-card p-8">
                    <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-800">
                        <div className="p-3 bg-orange-500/10 rounded-xl">
                            <Edit3 className="w-8 h-8 text-orange-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Update Settings</h3>
                            <p className="text-sm text-gray-400">Send new configuration to ESP32</p>
                        </div>
                    </div>
                    <form onSubmit={saveSettings}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Max PV Voltage (V)</label>
                                <input type="number" min="18" max="50" required value={solVmax} onChange={e => setSolVmax(Number(e.target.value))} className="w-full bg-gray-900/50 border border-gray-800 rounded-lg p-3 text-white focus:outline-none focus:border-[#c9a227]" />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Max PV Current (A)</label>
                                <input type="number" min="1" max="20" required value={solImax} onChange={e => setSolImax(Number(e.target.value))} className="w-full bg-gray-900/50 border border-gray-800 rounded-lg p-3 text-white focus:outline-none focus:border-[#c9a227]" />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Battery Chemistry</label>
                                <select value={batType} onChange={e => setBatType(Number(e.target.value))} required className="w-full bg-gray-900/50 border border-gray-800 rounded-lg p-3 text-white focus:outline-none focus:border-[#c9a227]">
                                    <option value="0">SLA / Lead Acid</option>
                                    <option value="1">Li-ion</option>
                                    <option value="2">LiFePO4</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">System Voltage</label>
                                <select value={sysVolt} onChange={e => setSysVolt(Number(e.target.value))} required className="w-full bg-gray-900/50 border border-gray-800 rounded-lg p-3 text-white focus:outline-none focus:border-[#c9a227]">
                                    <option value="12">12V</option>
                                    <option value="24">24V</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Capacity (Ah)</label>
                                <input type="number" min="5" max="200" step="5" required value={batCap} onChange={e => setBatCap(Number(e.target.value))} className="w-full bg-gray-900/50 border border-gray-800 rounded-lg p-3 text-white focus:outline-none focus:border-[#c9a227]" />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-800 flex flex-col gap-4">
                            <button type="submit" className="w-full text-black font-bold px-6 py-3 rounded-lg transition-all flex items-center justify-center gap-2" style={{background: 'linear-gradient(135deg, #c9a227, #a07c1a)', border: '1px solid #f0d060', boxShadow: '0 4px 15px rgba(201,162,39,0.3)'}}>
                                <Zap className="w-4 h-4" /> Apply Settings to ESP32
                            </button>
                            <span className="text-sm text-gray-400 text-center block">
                                {settingsStatus === 'Status: Synchronized with ESP32' && <CheckCircle className="w-4 h-4 text-green-400 inline-block align-middle mr-1" />}
                                <span className="align-middle">{settingsStatus}</span>
                            </span>
                        </div>
                    </form>
                </div>

                {/* Firmware Update (OTA) Form */}
                <div className="glass-panel rounded-2xl p-6 md:p-8 col-span-1 lg:col-span-2 mt-2">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-purple-500/10 rounded-xl">
                            <Cpu className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Remote Firmware Update (OTA)</h3>
                            <p className="text-sm text-gray-400">Upload .bin file to flash ESP32 over WiFi</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 max-w-xl">
                        <input type="file" accept=".bin" className="block w-full text-sm text-gray-400 file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gray-800 file:text-white hover:file:bg-gray-700 transition-colors cursor-pointer border border-gray-800 rounded-xl" />
                        <button onClick={() => alert("Note: Because this dashboard is now hosted online on Vercel/Firebase, OTA updates require the ESP32 to download the .bin from Firebase Storage. This feature will be available in the next firmware upgrade!")} className="w-full text-black font-bold px-6 py-3 rounded-lg transition-all flex items-center justify-center gap-2" style={{background: 'linear-gradient(135deg, #c9a227, #a07c1a)', border: '1px solid #f0d060', boxShadow: '0 4px 15px rgba(201,162,39,0.3)'}}>
                            <Zap className="w-4 h-4" /> Flash to ESP32
                        </button>
                        <span className="text-sm text-gray-400 text-center block mt-2">
                            <span className="align-middle">Status: Ready</span>
                        </span>
                    </div>
                </div>
            </div>
        )}

      </main>
    </div>
  );
}
