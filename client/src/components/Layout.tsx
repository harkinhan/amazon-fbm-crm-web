import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  HomeIcon, 
  ShoppingCartIcon, 
  CogIcon, 
  LogOutIcon,
  UserIcon,
  UsersIcon,
  MenuIcon,
  ChevronLeftIcon
} from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  const navigation = [
    { name: '仪表板', href: '/', icon: HomeIcon },
    { name: '订单管理', href: '/orders', icon: ShoppingCartIcon },
    ...(user?.role === 'admin' ? [
      { name: '字段管理', href: '/fields', icon: CogIcon },
      { name: '用户管理', href: '/users', icon: UsersIcon }
    ] : [])
  ];

  const handleLogout = () => {
    logout();
  };

  const getRoleDisplayName = (role: string) => {
    const roleMap = {
      admin: '管理员',
      operator: '运营',
      tracker: '跟单',
      designer: '美工'
    };
    return roleMap[role as keyof typeof roleMap] || role;
  };

  const getRoleBadgeColor = (role: string) => {
    const colorMap = {
      admin: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-600 border-purple-200/50',
      operator: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-600 border-blue-200/50',
      tracker: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-600 border-green-200/50',
      designer: 'bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-600 border-orange-200/50'
    };
    return colorMap[role as keyof typeof colorMap] || 'bg-gray-100/50 text-gray-600 border-gray-200/50';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 sidebar transition-all duration-300 ${
        sidebarCollapsed ? 'w-20' : 'w-80'
      }`}>
        {/* Logo Section */}
        <div className="flex h-20 items-center justify-center border-b border-gray-200/30 bg-white/60 backdrop-blur-xl relative">
          {!sidebarCollapsed ? (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <ShoppingCartIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">亚马逊CRM</h1>
                <p className="text-xs text-gray-500 font-medium">订单管理系统</p>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <ShoppingCartIcon className="h-6 w-6 text-white" />
            </div>
          )}
          
          {/* Collapse Toggle Button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute -right-4 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-white border border-gray-200/50 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-all duration-300 z-10"
            title={sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}
          >
            {sidebarCollapsed ? (
              <MenuIcon className="h-4 w-4 text-gray-600" />
            ) : (
              <ChevronLeftIcon className="h-4 w-4 text-gray-600" />
            )}
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-4 py-8 space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`nav-item ${isActive ? 'active' : ''} ${
                  sidebarCollapsed ? 'justify-center px-2' : ''
                }`}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <item.icon className={`h-5 w-5 ${sidebarCollapsed ? '' : 'mr-4'}`} />
                {!sidebarCollapsed && (
                  <>
                    <span className="font-medium">{item.name}</span>
                    {isActive && (
                      <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Section */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200/30 bg-white/60 backdrop-blur-xl">
          {!sidebarCollapsed ? (
            <>
              <div className="flex items-center space-x-4 mb-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-r from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-lg font-bold text-gray-600">
                      {user?.username?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{user?.username}</p>
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(user?.role || '')}`}>
                    {getRoleDisplayName(user?.role || '')}
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-700 hover:text-red-600 bg-gray-100/50 hover:bg-red-50/70 rounded-2xl transition-all duration-300 group"
              >
                <LogOutIcon className="mr-3 h-4 w-4 group-hover:text-red-500 transition-colors" />
                <span>退出登录</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-sm font-bold text-gray-600">
                    {user?.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
              </div>
              
              <button
                onClick={handleLogout}
                className="w-10 h-10 flex items-center justify-center text-gray-700 hover:text-red-600 bg-gray-100/50 hover:bg-red-50/70 rounded-xl transition-all duration-300 group"
                title="退出登录"
              >
                <LogOutIcon className="h-4 w-4 group-hover:text-red-500 transition-colors" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className={`transition-all duration-300 ${
        sidebarCollapsed ? 'pl-20' : 'pl-80'
      }`}>
        <main className="p-8 min-h-screen">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
} 