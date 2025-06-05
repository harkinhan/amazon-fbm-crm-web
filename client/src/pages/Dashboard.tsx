import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ShoppingCartIcon, PackageIcon, AlertTriangleIcon, TrendingUpIcon, StarIcon, CalendarIcon, ShieldIcon } from 'lucide-react';
import api from '../utils/api';

interface DashboardStats {
  totalOrders: number;
  todayOrders: number;
  unshippedOrders: number;
  exceptionOrders: number;
  // 时间维度统计
  weekOrders: number;
  monthOrders: number;
  yesterdayOrders: number;
  // 金额统计
  totalRevenue: number;
  monthRevenue: number;
  avgOrderValue: number;
  // 状态分布
  statusDistribution: { [key: string]: number };
  // 店铺统计
  shopDistribution: { [key: string]: number };
  // 产品名称统计
  productDistribution: { [key: string]: number };
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    todayOrders: 0,
    unshippedOrders: 0,
    exceptionOrders: 0,
    weekOrders: 0,
    monthOrders: 0,
    yesterdayOrders: 0,
    totalRevenue: 0,
    monthRevenue: 0,
    avgOrderValue: 0,
    statusDistribution: {},
    shopDistribution: {},
    productDistribution: {}
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    
    // 设置定时刷新，每30秒更新一次数据
    const interval = setInterval(fetchStats, 30000);
    
    // 当页面获得焦点时也刷新数据
    const handleFocus = () => {
      fetchStats();
    };
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/orders/stats');
      setStats(response.data);
    } catch (error) {
      console.error('获取统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: '总订单数',
      value: stats.totalOrders,
      icon: ShoppingCartIcon,
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-50 to-blue-100',
      change: `本周 ${stats.weekOrders}`,
      changeType: 'positive'
    },
    {
      title: '本月订单',
      value: stats.monthOrders,
      icon: CalendarIcon,
      gradient: 'from-purple-500 to-purple-600',
      bgGradient: 'from-purple-50 to-purple-100',
      change: `本月销售额 $${stats.monthRevenue.toFixed(2)}`,
      changeType: 'neutral'
    },
    {
      title: '今日新增',
      value: stats.todayOrders,
      icon: TrendingUpIcon,
      gradient: 'from-green-500 to-emerald-600',
      bgGradient: 'from-green-50 to-emerald-100',
      change: `昨日 ${stats.yesterdayOrders}`,
      changeType: stats.todayOrders >= stats.yesterdayOrders ? 'positive' : 'negative'
    },
    {
      title: '未发货订单',
      value: stats.unshippedOrders,
      icon: PackageIcon,
      gradient: 'from-amber-500 to-orange-600',
      bgGradient: 'from-amber-50 to-orange-100',
      change: `${stats.totalOrders > 0 ? Math.round((stats.unshippedOrders / stats.totalOrders) * 100) : 0}%`,
      changeType: stats.unshippedOrders > 0 ? 'neutral' : 'positive'
    },
    {
      title: '异常件订单',
      value: stats.exceptionOrders,
      icon: AlertTriangleIcon,
      gradient: 'from-red-500 to-orange-600',
      bgGradient: 'from-red-50 to-orange-100',
      change: stats.exceptionOrders > 0 ? '需关注' : '正常',
      changeType: stats.exceptionOrders > 0 ? 'negative' : 'positive'
    },
    {
      title: '总销售额',
      value: `$${stats.totalRevenue.toFixed(2)}`,
      icon: TrendingUpIcon,
      gradient: 'from-emerald-500 to-green-600',
      bgGradient: 'from-emerald-50 to-green-100',
      change: `月度增长 ${stats.monthOrders > 0 && stats.totalOrders > 0 
        ? ((stats.monthRevenue / stats.monthOrders) / (stats.totalRevenue / stats.totalOrders) * 100 - 100).toFixed(1)
        : '0'
      }%`,
      changeType: stats.monthOrders > 0 && stats.totalOrders > 0 && 
        (stats.monthRevenue / stats.monthOrders) / (stats.totalRevenue / stats.totalOrders) > 1 ? 'positive' : 'neutral'
    }
  ];

  const getRoleDisplayName = (role: string) => {
    const roleMap = {
      admin: '管理员',
      operator: '运营',
      tracker: '跟单',
      designer: '美工'
    };
    return roleMap[role as keyof typeof roleMap] || role;
  };

  const getRoleGradient = (role: string) => {
    const gradientMap = {
      admin: 'from-purple-500 to-pink-600',
      operator: 'from-blue-500 to-cyan-600',
      tracker: 'from-green-500 to-emerald-600',
      designer: 'from-orange-500 to-red-600'
    };
    return gradientMap[role as keyof typeof gradientMap] || 'from-gray-500 to-gray-600';
  };

  const quickActions = [
    {
      title: '订单管理',
      description: '查看和管理所有订单',
      icon: ShoppingCartIcon,
      href: '/orders',
      gradient: 'from-blue-500 to-purple-600',
      available: true
    },
    {
      title: '新增订单',
      description: '快速创建新订单',
      icon: TrendingUpIcon,
      href: '/orders',
      gradient: 'from-orange-500 to-red-600',
      available: true
    },
    {
      title: '未发货订单',
      description: '查看待发货的订单',
      icon: PackageIcon,
      href: '/orders?status=unshipped',
      gradient: 'from-amber-500 to-orange-600',
      available: true
    },
    {
      title: '异常件处理',
      description: '处理问题和异常订单',
      icon: AlertTriangleIcon,
      href: '/orders?status=exception',
      gradient: 'from-red-500 to-pink-600',
      available: true
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="spinner h-12 w-12 border-4 border-blue-200/50 border-t-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">加载仪表板数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in">
      {/* Welcome Section */}
      <div className="card p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-200/30 to-purple-200/30 rounded-full blur-3xl"></div>
        <div className="relative">
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative">
              <div className={`w-16 h-16 bg-gradient-to-r ${getRoleGradient(user?.role || '')} rounded-3xl flex items-center justify-center shadow-lg`}>
                <span className="text-2xl font-bold text-white">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold gradient-text">
                欢迎回来，{user?.username}！
              </h1>
              <p className="text-gray-600 font-medium mt-1">
                您的角色是 <span className={`px-3 py-1 bg-gradient-to-r ${getRoleGradient(user?.role || '')} text-white rounded-full text-sm font-medium`}>
                  {getRoleDisplayName(user?.role || '')}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="card p-6 group relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 bg-gradient-to-r ${stat.gradient} rounded-2xl flex items-center justify-center shadow-lg`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                {stat.change && (
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    stat.changeType === 'positive' 
                      ? 'bg-green-100 text-green-800' 
                      : stat.changeType === 'negative'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {stat.change}
                  </span>
                )}
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 统计分析区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 订单状态分布 */}
        <div className="card p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            📊 订单状态分布
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.statusDistribution)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 6)
              .map(([status, count]) => {
                const percentage = stats.totalOrders > 0 ? ((count / stats.totalOrders) * 100).toFixed(1) : '0';
                const statusColors: { [key: string]: string } = {
                  '--': 'bg-gray-400',
                  '已处理': 'bg-amber-500',
                  '已发货': 'bg-blue-500',
                  '已签收': 'bg-green-500',
                  '异常件': 'bg-red-500',
                  '已取消': 'bg-gray-600'
                };
                const color = statusColors[status] || 'bg-purple-500';
                
                return (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 ${color} rounded-full`}></div>
                      <span className="text-sm font-medium text-gray-700">
                        {status === '--' ? '待处理' : status}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-900">{count}</span>
                      <span className="text-xs text-gray-500 ml-1">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* 店铺分布 */}
        <div className="card p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            🏪 店铺订单分布
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.shopDistribution)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 6)
              .map(([shop, count], index) => {
                const percentage = stats.totalOrders > 0 ? ((count / stats.totalOrders) * 100).toFixed(1) : '0';
                const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500'];
                const color = colors[index % colors.length];
                
                return (
                  <div key={shop} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 ${color} rounded-full`}></div>
                      <span className="text-sm font-medium text-gray-700 truncate" title={shop}>
                        {shop.length > 10 ? shop.substring(0, 10) + '...' : shop}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-900">{count}</span>
                      <span className="text-xs text-gray-500 ml-1">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* 产品名称和效率统计 */}
        <div className="card p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            📦 产品名称分布
          </h3>
          <div className="space-y-3 mb-6">
            {Object.entries(stats.productDistribution)
              .sort(([,a], [,b]) => b - a)
              .map(([product, count], index) => {
                const percentage = stats.totalOrders > 0 ? ((count / stats.totalOrders) * 100).toFixed(1) : '0';
                const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500'];
                const color = colors[index % colors.length];
                
                return (
                  <div key={product} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 ${color} rounded-full`}></div>
                      <span className="text-sm font-medium text-gray-700">{product}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-900">{count}</span>
                      <span className="text-xs text-gray-500 ml-1">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-8">
        <h2 className="text-2xl font-bold gradient-text mb-6">快速操作</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action, index) => (
            <a
              key={index}
              href={action.href}
              className="group p-6 border border-gray-200/50 rounded-3xl hover:border-transparent transition-all duration-300 relative overflow-hidden"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
              <div className="relative">
                <div className={`w-12 h-12 bg-gradient-to-r ${action.gradient} rounded-2xl flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <action.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2 group-hover:text-gray-800">{action.title}</h3>
                <p className="text-sm text-gray-600 group-hover:text-gray-700">{action.description}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
} 