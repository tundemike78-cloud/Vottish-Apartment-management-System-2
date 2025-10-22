import {
  LayoutDashboard,
  Building,
  Wrench,
  Users,
  ShieldCheck,
  ShoppingCart,
  Package,
  BarChart3,
  Settings,
  Briefcase,
  FileText,
  FolderOpen
} from 'lucide-react';
import { useOrg } from '../../contexts/OrgContext';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { orgMember } = useOrg();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['owner', 'staff', 'tenant', 'security'] },
    { id: 'properties', label: 'Properties', icon: Building, roles: ['owner', 'staff'] },
    { id: 'work-orders', label: 'Work Orders', icon: Wrench, roles: ['owner', 'staff', 'tenant'] },
    { id: 'vendors', label: 'Vendors', icon: Users, roles: ['owner', 'staff'] },
    { id: 'visitor-passes', label: 'Visitor Passes', icon: ShieldCheck, roles: ['owner', 'staff', 'tenant', 'security'] },
    { id: 'gas-store', label: 'Gas Store', icon: ShoppingCart, roles: ['owner', 'staff', 'tenant'] },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, roles: ['owner'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['owner', 'staff'] },
    { id: 'vendor-dashboard', label: 'Vendor Dashboard', icon: LayoutDashboard, roles: ['vendor'] },
    { id: 'vendor-jobs-board', label: 'Jobs Board', icon: Briefcase, roles: ['vendor'] },
    { id: 'vendor-my-jobs', label: 'My Jobs', icon: Wrench, roles: ['vendor'] },
    { id: 'vendor-quotes', label: 'My Quotes', icon: FileText, roles: ['vendor'] },
    { id: 'vendor-invoices', label: 'Invoices', icon: ShoppingCart, roles: ['vendor'] },
    { id: 'vendor-documents', label: 'Documents', icon: FolderOpen, roles: ['vendor'] },
    { id: 'vendor-inventory', label: 'My Inventory', icon: Package, roles: ['vendor'] },
  ];

  const visibleItems = menuItems.filter(item =>
    !orgMember || item.roles.includes(orgMember.role)
  );

  return (
    <aside className="w-64 bg-gradient-to-b from-white to-gray-50 border-r border-gray-200 min-h-screen">
      <nav className="px-4 py-6 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`group w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-200'
                  : 'text-gray-700 hover:bg-white hover:shadow-md'
              }`}
            >
              <Icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'}`} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
