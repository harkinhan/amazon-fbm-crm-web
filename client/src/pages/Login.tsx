import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { AuthResponse } from '../types';
import { ShoppingCartIcon, EyeIcon, EyeOffIcon } from 'lucide-react';

interface LoginForm {
  email: string;
  password: string;
}

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const response = await api.post<AuthResponse>('/auth/login', data);
      login(response.data.token, response.data.user);
      toast.success('登录成功');
      navigate('/');
    } catch (error: any) {
      toast.error(error.response?.data?.error || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-10 opacity-50">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-2000"></div>
        </div>
      </div>

      <div className="relative max-w-md w-full">
        {/* Logo and Welcome */}
        <div className="text-center mb-12 fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl shadow-2xl mb-6">
            <ShoppingCartIcon className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-2">亚马逊CRM系统</h1>
          <p className="text-gray-600 font-medium">登录您的账户开始管理订单</p>
        </div>

        {/* Login Form */}
        <div className="modal-content p-8 scale-in">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Email Field */}
            <div className="form-group">
              <label className="form-label">邮箱地址</label>
              <input
                {...register('email', { 
                  required: '邮箱是必填的',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: '邮箱格式不正确'
                  }
                })}
                type="email"
                className="input"
                placeholder="请输入邮箱地址"
                autoComplete="email"
              />
              {errors.email && (
                <p className="mt-2 text-sm text-red-600 animate-pulse">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label className="form-label">密码</label>
              <div className="relative">
                <input
                  {...register('password', { required: '密码是必填的' })}
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-12"
                  placeholder="请输入密码"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOffIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-2 text-sm text-red-600 animate-pulse">{errors.password.message}</p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-600">记住我</span>
              </label>
              <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-500 font-medium transition-colors"
              >
                忘记密码？
              </button>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full relative overflow-hidden"
            >
              {loading && (
                <div className="absolute inset-0 bg-white/20 flex items-center justify-center">
                  <div className="spinner h-5 w-5 border-2 border-white/30 border-t-white"></div>
                </div>
              )}
              <span className={loading ? 'invisible' : ''}>
                {loading ? '登录中...' : '登录'}
              </span>
            </button>

            {/* Demo Account Info */}
            <div className="bg-blue-50/70 border border-blue-200/50 rounded-2xl p-4 backdrop-blur-sm">
              <p className="text-sm text-blue-800 font-medium mb-2">🎯 演示账户</p>
              <div className="text-xs text-blue-700 space-y-1">
                <p>邮箱: admin@crm.com</p>
                <p>密码: admin123</p>
              </div>
            </div>

            {/* Contact Admin */}
            <div className="text-center pt-4 border-t border-gray-200/50">
              <p className="text-gray-600 text-sm">
                需要账户？请联系系统管理员
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-gray-500">
          <p>© 2024 亚马逊CRM系统. 保留所有权利.</p>
        </div>
      </div>
    </div>
  );
} 