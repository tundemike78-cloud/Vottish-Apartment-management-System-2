import { useState } from 'react';
import { Building2, Bell, User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useOrg } from '../../contexts/OrgContext';

export function Navbar() {
  const { user, signOut } = useAuth();
  const { currentOrg, organizations, switchOrg } = useOrg();
  const [showOrgMenu, setShowOrgMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 backdrop-blur-lg bg-opacity-90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-violet-600 rounded-xl">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="ml-3 text-xl font-bold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">Vottsh AMS</span>
          </div>

          <div className="flex items-center space-x-4">
            {currentOrg && (
              <div className="relative">
                <button
                  onClick={() => setShowOrgMenu(!showOrgMenu)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-violet-50 transition-all duration-200"
                >
                  <span className="text-sm font-semibold text-gray-700">{currentOrg.name}</span>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </button>

                {showOrgMenu && organizations.length > 1 && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2">
                    {organizations.map((org) => (
                      <button
                        key={org.id}
                        onClick={() => {
                          switchOrg(org.id);
                          setShowOrgMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                          currentOrg.id === org.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        {org.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button className="p-2 text-gray-400 hover:text-blue-600 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-violet-50 transition-all duration-200 relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-gradient-to-r from-rose-500 to-pink-500 rounded-full animate-pulse"></span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-2 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-violet-50 transition-all duration-200"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 flex items-center justify-center shadow-md">
                  <span className="text-sm font-semibold text-white">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </button>
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
