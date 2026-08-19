import { BarChart3, ClipboardList, Home, Package } from 'lucide-react';
import { SETTINGS_TAB_IDS } from '../constants/settings';

const NAV_ITEMS = [
    { id: 'tasks', label: 'Tasks', Icon: ClipboardList },
    { id: 'inventory', label: 'Inventory', Icon: Package },
    { id: 'living-space', label: 'Living Space', Icon: Home },
    { id: 'stats', label: 'Stats', Icon: BarChart3 },
];

function Sidebar({ user, activeTab, setActiveTab }) {
    const isBackable = SETTINGS_TAB_IDS.includes(activeTab);

    const handleBrandClick = () => {
        if (isBackable) {
            setActiveTab('tasks');
        }
    };

    return (
        <aside className="w-full md:w-72 shrink-0 bg-white md:bg-white/90 dark:bg-[#15221E] dark:md:bg-[#15221E]/95 md:backdrop-blur-md border-t md:border-t-0 md:border-r border-emerald-100/90 dark:border-[#213630] flex md:flex-col justify-between fixed md:sticky bottom-0 md:top-0 md:h-screen p-2 md:p-6 z-40 shadow-lg md:shadow-none transition-colors duration-200">
            {/* Desktop Brand Header */}
            <div className="hidden md:flex flex-col gap-8">
                <div
                    className={`flex items-center gap-4 px-2 py-1.5 rounded-xl transition-all duration-200 ${
                        isBackable ? 'cursor-pointer hover:bg-emerald-50 dark:hover:bg-[#1C2C27] active:scale-[0.98]' : ''
                    }`}
                    onClick={handleBrandClick}
                    role={isBackable ? 'button' : undefined}
                    tabIndex={isBackable ? 0 : undefined}
                    onKeyDown={(e) => {
                        if (isBackable && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            handleBrandClick();
                        }
                    }}
                >
                    <img
                        src="/Mop_Icon.png"
                        alt="Mop Icon"
                        className="h-10 w-auto max-h-10 object-contain shrink-0 dark:hidden"
                    />
                    <img
                        src="/Mop-icon-dark.png"
                        alt="Mop Icon Dark"
                        className="hidden dark:block h-10 w-auto max-h-10 object-contain shrink-0 scale-110"
                    />
                    <h1 className="text-3xl ml-1 font-extrabold text-teal-950 dark:text-[#F0FDF4] tracking-tight leading-none">Mop</h1>
                </div>

                {/* Desktop Nav Items */}
                <nav className="flex flex-col gap-2.5">
                    {NAV_ITEMS.map(({ id, label, Icon }) => {
                        const isActive = activeTab === id;
                        return (
                            <button
                                key={id}
                                className={`flex items-center gap-3.5 w-full text-left px-4.5 py-3.5 rounded-2xl font-bold text-[15px] transition-all duration-200 cursor-pointer ${
                                    isActive
                                        ? 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 translate-x-0.5'
                                        : 'text-slate-600 dark:text-emerald-100/70 hover:text-teal-950 dark:hover:text-[#F0FDF4] hover:bg-emerald-50/80 dark:hover:bg-[#1C2C27]'
                                }`}
                                onClick={() => setActiveTab(id)}
                            >
                                <Icon className={`shrink-0 transition-transform ${isActive ? 'scale-110 text-white' : 'text-slate-400 dark:text-emerald-400/60 group-hover:text-emerald-600'}`} size={20} strokeWidth={isActive ? 2.5 : 2} />
                                <span>{label}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Mobile Navigation Dock */}
            <nav className="flex md:hidden justify-around items-center w-full py-1">
                {NAV_ITEMS.map(({ id, label, Icon }) => {
                    const isActive = activeTab === id;
                    return (
                        <button
                            key={id}
                            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all duration-150 ${
                                isActive ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50/80 dark:bg-[#1C2C27] scale-105' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                            onClick={() => setActiveTab(id)}
                        >
                            <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
                            <span className="text-[11px] font-medium leading-none">{label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* Desktop User Footer */}
            <div className="hidden md:flex items-center gap-3 pt-4 border-t border-emerald-100/80 dark:border-[#213630]">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-bold text-sm shadow-sm overflow-hidden shrink-0 border-2 border-white dark:border-[#213630]">
                    {user?.photoURL ? (
                        <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
                    ) : (
                        (user?.displayName?.[0] || user?.email?.[0] || '?').toUpperCase()
                    )}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-bold text-teal-950 dark:text-[#F0FDF4] truncate leading-tight">
                        {user?.displayName || 'Cleanist User'}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-400 truncate leading-tight mt-0.5">
                        {user?.email || 'Guest Mode'}
                    </span>
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;
