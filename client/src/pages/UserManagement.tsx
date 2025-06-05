import React, { useState, useEffect } from 'react';
import { PlusIcon, EditIcon, TrashIcon, SearchIcon, KeyIcon, EyeIcon, EyeOffIcon, UserIcon, CalendarIcon, BriefcaseIcon, PhoneIcon, MailIcon, ShieldIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'operator' | 'tracker' | 'designer';
  phone?: string;
  gender?: 'male' | 'female' | 'other';
  birth_date?: string;
  hire_date?: string;
  department?: string;
  position?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  address?: string;
  bio?: string;
  status: 'active' | 'inactive' | 'suspended';
  shop_permissions: string[];
  created_at: string;
  updated_at: string;
}

interface UserForm {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'operator' | 'tracker' | 'designer';
  phone: string;
  gender: 'male' | 'female' | 'other' | '';
  birth_date: string;
  hire_date: string;
  department: string;
  position: string;
  emergency_contact: string;
  emergency_phone: string;
  address: string;
  bio: string;
  status: 'active' | 'inactive' | 'suspended';
  shop_permissions: string[];
}

export default function UserManagement() {
  const { user: currentUser, updateUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [shops, setShops] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<UserForm>({
    username: '',
    email: '',
    password: '',
    role: 'operator',
    phone: '',
    gender: '',
    birth_date: '',
    hire_date: '',
    department: '',
    position: '',
    emergency_contact: '',
    emergency_phone: '',
    address: '',
    bio: '',
    status: 'active',
    shop_permissions: []
  });
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      toast.error('您没有权限访问此页面');
      return;
    }
    fetchUsers();
    fetchShops();
  }, [currentUser]);

  // 监听角色变化，管理员角色自动清空店铺权限
  useEffect(() => {
    if (formData.role === 'admin') {
      setFormData(prev => ({
        ...prev,
        shop_permissions: []
      }));
    }
  }, [formData.role]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      toast.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchShops = async () => {
    try {
      const response = await api.get('/users/shops');
      setShops(response.data);
    } catch (error) {
      console.error('获取店铺列表失败:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingUser) {
        // 准备更新数据，过滤掉空字符串的字段
        const updateData: any = {
          username: formData.username.trim(),
          email: formData.email.trim(),
          role: formData.role,
          phone: formData.phone.trim() || null,
          gender: formData.gender || null,
          birth_date: formData.birth_date || null,
          hire_date: formData.hire_date || null,
          department: formData.department.trim() || null,
          position: formData.position.trim() || null,
          emergency_contact: formData.emergency_contact.trim() || null,
          emergency_phone: formData.emergency_phone.trim() || null,
          address: formData.address.trim() || null,
          bio: formData.bio.trim() || null,
          status: formData.status,
          // 管理员角色不需要店铺权限配置，设置为空数组
          shop_permissions: formData.role === 'admin' ? [] : formData.shop_permissions
        };
        
        // 只有在密码非空时才包含密码字段
        if (formData.password && formData.password.trim() !== '') {
          updateData.password = formData.password.trim();
        }
        
        const response = await api.put(`/users/${editingUser.id}`, updateData);
        const updatedUserData = response.data.user;
        
        // 如果编辑的是当前登录用户，更新AuthContext中的数据
        if (currentUser && editingUser.id === currentUser.id) {
          updateUser(updatedUserData);
        }
        
        toast.success('用户更新成功');
      } else {
        // 创建用户时的处理
        const createData = {
          ...formData,
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password.trim(),
          phone: formData.phone.trim() || null,
          gender: formData.gender || null,
          birth_date: formData.birth_date || null,
          hire_date: formData.hire_date || null,
          department: formData.department.trim() || null,
          position: formData.position.trim() || null,
          emergency_contact: formData.emergency_contact.trim() || null,
          emergency_phone: formData.emergency_phone.trim() || null,
          address: formData.address.trim() || null,
          bio: formData.bio.trim() || null,
          // 管理员角色不需要店铺权限配置，设置为空数组
          shop_permissions: formData.role === 'admin' ? [] : formData.shop_permissions
        };
        
        await api.post('/users', createData);
        toast.success('用户创建成功');
      }
      
      setShowModal(false);
      setEditingUser(null);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || '操作失败';
      toast.error(errorMessage);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role,
      phone: user.phone || '',
      gender: user.gender || '',
      birth_date: user.birth_date || '',
      hire_date: user.hire_date || '',
      department: user.department || '',
      position: user.position || '',
      emergency_contact: user.emergency_contact || '',
      emergency_phone: user.emergency_phone || '',
      address: user.address || '',
      bio: user.bio || '',
      status: user.status,
      shop_permissions: user.shop_permissions || []
    });
    
    setShowModal(true);
  };

  const handleDelete = async (userId: number) => {
    if (!confirm('确定要删除这个用户吗？此操作不可撤销！')) return;
    
    try {
      await api.delete(`/users/${userId}`);
      toast.success('用户删除成功');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || '删除失败');
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser || !newPassword) {
      toast.error('请输入新密码');
      return;
    }

    try {
      await api.post(`/users/${resetPasswordUser.id}/reset-password`, {
        newPassword
      });
      toast.success('密码重置成功');
      setShowPasswordModal(false);
      setResetPasswordUser(null);
      setNewPassword('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || '密码重置失败');
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'operator',
      phone: '',
      gender: '',
      birth_date: '',
      hire_date: '',
      department: '',
      position: '',
      emergency_contact: '',
      emergency_phone: '',
      address: '',
      bio: '',
      status: 'active',
      shop_permissions: []
    });
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

  const getStatusBadgeColor = (status: string) => {
    const colorMap = {
      active: 'bg-green-100 text-green-800 border-green-200',
      inactive: 'bg-gray-100 text-gray-800 border-gray-200',
      suspended: 'bg-red-100 text-red-800 border-red-200'
    };
    return colorMap[status as keyof typeof colorMap] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusDisplayName = (status: string) => {
    const statusMap = {
      active: '正常',
      inactive: '停用',
      suspended: '暂停'
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  const getGenderDisplayName = (gender: string) => {
    const genderMap = {
      male: '男',
      female: '女',
      other: '其他'
    };
    return genderMap[gender as keyof typeof genderMap] || '--';
  };

  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      user.username.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      (user.phone && user.phone.toLowerCase().includes(searchLower)) ||
      (user.department && user.department.toLowerCase().includes(searchLower)) ||
      (user.position && user.position.toLowerCase().includes(searchLower)) ||
      getRoleDisplayName(user.role).toLowerCase().includes(searchLower)
    );
  });

  if (currentUser?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">权限不足</h2>
        <p className="text-gray-600">只有管理员可以访问用户管理功能</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="spinner h-12 w-12 border-4 border-blue-200/50 border-t-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">加载用户数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-3xl p-8 border border-gray-200/50">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold gradient-text flex items-center">
              <UserIcon className="h-8 w-8 mr-3 text-blue-600" />
              用户权限管理
            </h1>
            <p className="text-gray-600 mt-2">管理系统用户信息和店铺访问权限</p>
            <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
              <span className="flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                当前在线用户：{filteredUsers.filter(u => u.status === 'active').length} 人
              </span>
              <span className="flex items-center">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                总用户数：{filteredUsers.length} 人
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingUser(null);
              resetForm();
              setShowModal(true);
            }}
            className="btn btn-primary flex items-center shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            新增用户
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="search-container flex-1 max-w-md">
          <SearchIcon className="search-icon" />
          <input
            type="text"
            placeholder="搜索用户（姓名、邮箱、部门、职位...）"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        {searchTerm && (
          <div className="flex items-center text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-lg">
            <span>找到 {filteredUsers.length} 个匹配结果</span>
            <button
              onClick={() => setSearchTerm('')}
              className="ml-2 text-blue-600 hover:text-blue-800"
            >
              清除
            </button>
          </div>
        )}
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-3xl mb-4">
              <UserIcon className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">暂无用户数据</p>
            <p className="text-gray-400 text-sm mt-1">
              {searchTerm ? '尝试修改搜索条件' : '点击"新增用户"创建第一个用户'}
            </p>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div key={user.id} className="card p-6 hover:shadow-xl transition-all duration-300 flex flex-col bg-white border border-gray-200/50 rounded-3xl">
              {/* User Avatar and Basic Info */}
              <div className="flex items-start space-x-4 mb-4">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-sm">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-bold text-gray-900 truncate">{user.username}</h3>
                    {currentUser?.id === user.id && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">当前</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600 truncate flex items-center">
                      <MailIcon className="h-3 w-3 mr-2 text-gray-400" />
                      {user.email}
                    </p>
                    {user.phone && (
                      <p className="text-sm text-gray-600 truncate flex items-center">
                        <PhoneIcon className="h-3 w-3 mr-2 text-gray-400" />
                        {user.phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Role and Status Badges */}
              <div className="flex items-center justify-between mb-4">
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                  {getRoleDisplayName(user.role)}
                </span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(user.status)}`}>
                  {getStatusDisplayName(user.status)}
                </span>
              </div>

              {/* Additional Info */}
              <div className="space-y-3 mb-4 flex-1">
                {user.department && (
                  <div className="flex items-center text-sm text-gray-600">
                    <BriefcaseIcon className="h-4 w-4 mr-3 text-gray-400 flex-shrink-0" />
                    <span className="truncate">
                      {user.department}
                      {user.position && <span className="text-gray-400"> · {user.position}</span>}
                    </span>
                  </div>
                )}
                {user.hire_date && (
                  <div className="flex items-center text-sm text-gray-600">
                    <CalendarIcon className="h-4 w-4 mr-3 text-gray-400 flex-shrink-0" />
                    <span>入职：{new Date(user.hire_date).toLocaleDateString('zh-CN')}</span>
                  </div>
                )}
                
                {/* 权限信息统一显示区域 */}
                <div className="flex items-start text-sm text-gray-600">
                  <ShieldIcon className="h-4 w-4 mr-3 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    {user.role === 'admin' ? (
                      <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-xs font-medium">
                        管理员权限 · 拥有所有店铺访问权限
                      </div>
                    ) : user.shop_permissions && user.shop_permissions.length > 0 ? (
                      <>
                        <div className="text-xs text-gray-500 mb-2 font-medium">
                          店铺权限 ({user.shop_permissions.length} 个店铺)
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {user.shop_permissions.slice(0, 4).map((shop, index) => (
                            <span key={index} className="inline-block bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                              {shop}
                            </span>
                          ))}
                          {user.shop_permissions.length > 4 && (
                            <span className="inline-block bg-gray-50 text-gray-600 px-2 py-1 rounded text-xs font-medium">
                              +{user.shop_permissions.length - 4}
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="bg-gray-50 text-gray-600 px-3 py-2 rounded-lg text-xs font-medium">
                        暂无店铺权限
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions - 所有按钮在同一行 */}
              <div className="pt-4 border-t border-gray-200/50">
                {currentUser?.id !== user.id ? (
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleEdit(user)}
                      className="btn btn-secondary text-sm py-2.5 flex items-center justify-center"
                      title="编辑用户"
                    >
                      <EditIcon className="h-4 w-4 mr-1" />
                      编辑
                    </button>
                    <button
                      onClick={() => {
                        setResetPasswordUser(user);
                        setShowPasswordModal(true);
                      }}
                      className="btn btn-secondary text-sm py-2.5 flex items-center justify-center"
                      title="重置密码"
                    >
                      <KeyIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="btn bg-red-50 hover:bg-red-100 text-red-600 border-red-200 text-sm py-2.5 flex items-center justify-center transition-all duration-200"
                      title="删除用户"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleEdit(user)}
                      className="btn btn-secondary text-sm py-2.5 flex items-center justify-center"
                      title="编辑用户"
                    >
                      <EditIcon className="h-4 w-4 mr-1" />
                      编辑
                    </button>
                    <button
                      onClick={() => {
                        setResetPasswordUser(user);
                        setShowPasswordModal(true);
                      }}
                      className="btn btn-secondary text-sm py-2.5 flex items-center justify-center"
                      title="重置密码"
                    >
                      <KeyIcon className="h-4 w-4 mr-1" />
                      重置
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit User Modal */}
      {showModal && (
        <div className="modal-overlay flex items-center justify-center p-4 z-50">
          <div className="modal-content w-full max-w-4xl max-h-[90vh] flex flex-col slide-up">
            {/* 固定的头部 */}
            <div className="modal-header">
              <h2 className="text-2xl font-bold gradient-text">
                {editingUser ? '编辑用户' : '新增用户'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingUser(null);
                  resetForm();
                }}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>
            
            {/* 可滚动的内容区域 */}
            <div className="modal-content-area">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-group">
                    <label className="form-label">用户名 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                      className="input"
                      placeholder="请输入用户名"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">邮箱 <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="input"
                      placeholder="请输入邮箱地址"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      密码 {editingUser ? <span className="text-gray-500">(留空表示不修改)</span> : <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        className="input pr-12"
                        placeholder={editingUser ? "留空不修改密码" : "请输入密码（至少6位）"}
                        required={!editingUser}
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">角色 <span className="text-red-500">*</span></label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as any }))}
                      className="input"
                      required
                    >
                      <option value="operator">运营</option>
                      <option value="tracker">跟单</option>
                      <option value="designer">美工</option>
                      <option value="admin">管理员</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">手机号</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="input"
                      placeholder="请输入手机号"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">性别</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value as any }))}
                      className="input"
                    >
                      <option value="">请选择</option>
                      <option value="male">男</option>
                      <option value="female">女</option>
                      <option value="other">其他</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">出生日期</label>
                    <input
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
                      className="input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">入职日期</label>
                    <input
                      type="date"
                      value={formData.hire_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, hire_date: e.target.value }))}
                      className="input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">部门</label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                      className="input"
                      placeholder="请输入所属部门"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">职位</label>
                    <input
                      type="text"
                      value={formData.position}
                      onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                      className="input"
                      placeholder="请输入职位"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">紧急联系人</label>
                    <input
                      type="text"
                      value={formData.emergency_contact}
                      onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact: e.target.value }))}
                      className="input"
                      placeholder="请输入紧急联系人姓名"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">紧急联系人电话</label>
                    <input
                      type="tel"
                      value={formData.emergency_phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, emergency_phone: e.target.value }))}
                      className="input"
                      placeholder="请输入紧急联系人电话"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">用户状态</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                      className="input"
                    >
                      <option value="active">正常</option>
                      <option value="inactive">停用</option>
                      <option value="suspended">暂停</option>
                    </select>
                  </div>
                </div>

                {/* Address */}
                <div className="form-group">
                  <label className="form-label">地址</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="input"
                    placeholder="请输入详细地址"
                  />
                </div>

                {/* Bio */}
                <div className="form-group">
                  <label className="form-label">个人简介</label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    className="input min-h-[100px] resize-y"
                    placeholder="请输入个人简介"
                    rows={4}
                  />
                </div>

                {/* Shop Permissions */}
                {formData.role !== 'admin' && (
                  <div className="form-group">
                    <label className="form-label">店铺访问权限</label>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-3">选择该用户可以查看的店铺订单</p>
                      {shops.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">暂无可用店铺，请先创建包含店铺信息的订单</p>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {shops.map((shop) => (
                            <label key={shop} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-white transition-colors cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData.shop_permissions.includes(shop)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData(prev => ({
                                      ...prev,
                                      shop_permissions: [...prev.shop_permissions, shop]
                                    }));
                                  } else {
                                    setFormData(prev => ({
                                      ...prev,
                                      shop_permissions: prev.shop_permissions.filter(s => s !== shop)
                                    }));
                                  }
                                }}
                                className="rounded text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">{shop}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      {formData.shop_permissions.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm font-medium text-gray-700 mb-2">已选择 {formData.shop_permissions.length} 个店铺：</p>
                          <div className="flex flex-wrap gap-1">
                            {formData.shop_permissions.map((shop) => (
                              <span key={shop} className="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                {shop}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({
                                      ...prev,
                                      shop_permissions: prev.shop_permissions.filter(s => s !== shop)
                                    }));
                                  }}
                                  className="ml-1 text-blue-600 hover:text-blue-800"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 管理员权限说明 */}
                {formData.role === 'admin' && (
                  <div className="form-group">
                    <label className="form-label">店铺访问权限</label>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <ShieldIcon className="h-5 w-5 text-blue-600 mr-2" />
                        <h4 className="text-sm font-semibold text-blue-800">管理员权限</h4>
                      </div>
                      <p className="text-sm text-blue-700">
                        管理员角色默认拥有所有店铺的访问权限，无需单独配置。管理员可以：
                      </p>
                      <ul className="text-xs text-blue-600 mt-2 ml-4 list-disc">
                        <li>查看和管理所有店铺的订单数据</li>
                        <li>创建、编辑、删除任意店铺的订单</li>
                        <li>管理其他用户的店铺访问权限</li>
                        <li>访问所有系统功能和数据统计</li>
                      </ul>
                    </div>
                  </div>
                )}
              </form>
            </div>
            
            {/* 固定的底部 */}
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingUser(null);
                  resetForm();
                }}
                className="btn btn-secondary"
              >
                取消
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                onClick={handleSubmit}
              >
                {editingUser ? '更新用户' : '创建用户'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showPasswordModal && resetPasswordUser && (
        <div className="modal-overlay flex items-center justify-center p-4 z-50">
          <div className="modal-content w-full max-w-md p-8 slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold gradient-text">重置密码</h2>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setResetPasswordUser(null);
                  setNewPassword('');
                }}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-gray-600">
                为用户 <span className="font-medium text-gray-900">{resetPasswordUser.username}</span> 设置新密码
              </p>
              
              <div className="form-group">
                <label className="form-label">新密码 <span className="text-red-500">*</span></label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input"
                  placeholder="请输入新密码（至少6位）"
                  minLength={6}
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200/50">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setResetPasswordUser(null);
                    setNewPassword('');
                  }}
                  className="btn btn-secondary"
                >
                  取消
                </button>
                <button
                  onClick={handleResetPassword}
                  className="btn btn-primary"
                >
                  重置密码
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 