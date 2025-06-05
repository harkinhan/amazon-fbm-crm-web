import React, { useState, useEffect } from 'react';
import { PlusIcon, EditIcon, TrashIcon, SearchIcon, DownloadIcon, EyeIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { Order, FieldDefinition } from '../types';
import { useAuth } from '../contexts/AuthContext';

// 公式计算函数
const evaluateFormula = (formula: string, formData: Record<string, any>): string => {
  if (!formula) return '0';
  
  try {
    // 替换公式中的字段名为实际值
    let expression = formula;
    
    // 获取所有在公式中的字段名
    const fieldNames = formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
    
    fieldNames.forEach(fieldName => {
      const value = formData[fieldName];
      let numValue = 0; // 默认为0，处理空值情况
      
      if (value !== undefined && value !== null && value !== '') {
        if (typeof value === 'number') {
          numValue = value;
        } else if (typeof value === 'string' && !isNaN(Number(value))) {
          numValue = Number(value);
        }
      }
      
      // 使用全局替换，确保所有实例都被替换
      expression = expression.replace(new RegExp(`\\b${fieldName}\\b`, 'g'), numValue.toString());
    });
    
    // 安全的数学表达式计算（只允许数字和基本运算符）
    if (/^[0-9+\-*/.() ]+$/.test(expression)) {
      const result = Function('"use strict"; return (' + expression + ')')();
      return isNaN(result) || !isFinite(result) ? '0' : result.toFixed(2);
    }
    
    return '计算错误';
  } catch (error) {
    console.error('公式计算错误:', error);
    return '计算错误';
  }
};

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [shops, setShops] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // 快速编辑状态管理
  const [quickEditCell, setQuickEditCell] = useState<{orderId: number, fieldName: string} | null>(null);
  const [quickEditValue, setQuickEditValue] = useState<any>('');
  const [expandedFiles, setExpandedFiles] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    fetchOrders();
    fetchFields();
    fetchShops();
  }, []);

  // 自动生成订单编号
  useEffect(() => {
    if (!editingOrder && formData['order_type'] && formData['shop_name']) {
      const nextRowNumber = orders.length + 1;
      const newOrderId = `AM${formData['order_type']}-${formData['shop_name']}-${nextRowNumber}`;
      
      if (formData['order_id'] !== newOrderId) {
        setFormData(prev => ({
          ...prev,
          order_id: newOrderId
        }));
      }
    }
  }, [formData['order_type'], formData['shop_name'], orders.length, editingOrder]);

  // 排序处理函数
  const handleSort = () => {
    const newSortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newSortOrder);
    
    const sortedOrders = [...orders].sort((a, b) => {
      if (newSortOrder === 'desc') {
        return b.id - a.id; // 按ID倒序（最新的在前）
      } else {
        return a.id - b.id; // 按ID正序（最旧的在前）
      }
    });
    
    setOrders(sortedOrders);
  };

  const fetchOrders = async () => {
    try {
      // 使用基于权限过滤的API端点
      const response = await api.get('/orders/dashboard');
      // 默认按倒序排列（最新的在前）
      const sortedOrders = response.data.sort((a: Order, b: Order) => b.id - a.id);
      setOrders(sortedOrders);
    } catch (error) {
      toast.error('获取订单失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchFields = async () => {
    try {
      const response = await api.get('/fields');
      setFields(response.data);
    } catch (error) {
      toast.error('获取字段定义失败');
    }
  };

  const fetchShops = async () => {
    try {
      const response = await api.get('/orders/shops');
      setShops(response.data);
    } catch (error) {
      console.error('获取店铺列表失败:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 准备提交的数据
    let submitData = { ...formData };
    
    // 对于新订单，如果订单编号字段存在且有必要的信息，自动生成订单编号
    if (!editingOrder) {
      const orderIdField = fields.find(f => f.field_name === 'order_id');
      if (orderIdField && formData['order_type'] && formData['shop_name']) {
        const nextRowNumber = orders.length + 1;
        submitData['order_id'] = `AM${formData['order_type']}-${formData['shop_name']}-${nextRowNumber}`;
      }
    }
    
    // 验证必填字段
    const requiredFields = fields.filter(field => field.required);
    const missingFields: string[] = [];
    
    for (const field of requiredFields) {
      // 订单编号字段特殊处理：如果是新订单且已自动生成，则跳过验证
      if (field.field_name === 'order_id' && !editingOrder && submitData['order_id']) {
        continue;
      }
      
      const value = submitData[field.field_name];
      
      // 检查字段是否为空
      if (value === undefined || value === null || value === '' || 
          (Array.isArray(value) && value.length === 0)) {
        missingFields.push(field.field_label);
      }
      
      // 对于多选字段的特殊处理
      if (field.field_type === 'multiselect' && (!Array.isArray(value) || value.length === 0)) {
        if (!missingFields.includes(field.field_label)) {
          missingFields.push(field.field_label);
        }
      }
    }
    
    // 如果有未填写的必填字段，显示错误信息
    if (missingFields.length > 0) {
      toast.error(`请填写以下必填字段：${missingFields.join('、')}`);
      return;
    }
    
    try {
      if (editingOrder) {
        await api.put(`/orders/${editingOrder.id}`, { orderData: submitData });
        toast.success('订单更新成功');
      } else {
        await api.post('/orders', { orderData: submitData });
        toast.success('订单创建成功');
      }
      
      setShowModal(false);
      setEditingOrder(null);
      setFormData({});
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.error || '操作失败');
    }
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    
    // 清理订单数据，移除值为0的字段（除非是有意义的0）
    const cleanedData: Record<string, any> = {};
    Object.keys(order.order_data).forEach(key => {
      const value = order.order_data[key];
      // 保留非空值，但过滤掉无意义的0
      if (value !== null && value !== undefined && value !== 0 && value !== '0') {
        cleanedData[key] = value;
      } else if (typeof value === 'string' && value.trim() !== '' && value !== '0') {
        cleanedData[key] = value;
      }
      // 对于有意义的数值0，可以在这里添加特殊处理
    });
    
    setFormData(cleanedData);
    setShowModal(true);
  };

  const handleView = (order: Order) => {
    setViewingOrder(order);
  };

  const handleDelete = async (orderId: number) => {
    if (!confirm('确定要删除这个订单吗？')) return;
    
    try {
      await api.delete(`/orders/${orderId}`);
      toast.success('订单删除成功');
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.error || '删除失败');
    }
  };

  // 快速编辑功能
  const handleQuickEdit = (orderId: number, fieldName: string, currentValue: any) => {
    // 如果是公式字段，不允许编辑
    const field = fields.find(f => f.field_name === fieldName);
    if (field?.field_type === 'formula') {
      toast.error('公式字段不支持直接编辑');
      return;
    }
    
    // 如果是文件字段，直接触发文件上传
    if (field?.field_type === 'file') {
      handleFileUpload(orderId, fieldName);
      return;
    }
    
    setQuickEditCell({ orderId, fieldName });
    setQuickEditValue(currentValue || '');
  };

  // 处理文件下载
  const handleFileDownload = async (orderId: number, fieldName: string, filename: string) => {
    try {
      const response = await api.get(`/orders/${orderId}/download/${fieldName}/${filename}`, {
        responseType: 'blob'
      });
      
      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // 获取原始文件名（去掉时间戳前缀）
      const originalName = filename.replace(/^\d+_/, '');
      link.setAttribute('download', originalName);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('文件下载成功');
    } catch (error: any) {
      toast.error(error.response?.data?.error || '文件下载失败');
    }
  };

  // 处理文件删除
  const handleFileDelete = async (orderId: number, fieldName: string, filename: string) => {
    if (!confirm('确定要删除这个文件吗？')) return;
    
    try {
      await api.delete(`/orders/${orderId}/file/${fieldName}/${filename}`);
      toast.success('文件删除成功');
      
      // 立即更新查看订单弹窗的数据（如果当前正在查看这个订单）
      if (viewingOrder && viewingOrder.id === orderId) {
        const updatedOrderData = { ...viewingOrder.order_data };
        let currentFiles = updatedOrderData[fieldName];
        
        // 兼容旧格式和新格式
        if (!Array.isArray(currentFiles)) {
          currentFiles = currentFiles ? [currentFiles] : [];
        }
        
        // 从数组中移除删除的文件
        const updatedFiles = currentFiles.filter((file: string) => file !== filename);
        updatedOrderData[fieldName] = updatedFiles;
        
        // 更新 viewingOrder 状态
        setViewingOrder({
          ...viewingOrder,
          order_data: updatedOrderData
        });
      }
      
      // 立即更新订单列表状态
      setOrders(prevOrders => 
        prevOrders.map(order => {
          if (order.id === orderId) {
            const updatedOrderData = { ...order.order_data };
            let currentFiles = updatedOrderData[fieldName];
            
            if (!Array.isArray(currentFiles)) {
              currentFiles = currentFiles ? [currentFiles] : [];
            }
            
            const updatedFiles = currentFiles.filter((file: string) => file !== filename);
            updatedOrderData[fieldName] = updatedFiles;
            
            return {
              ...order,
              order_data: updatedOrderData
            };
          }
          return order;
        })
      );
      
      // 刷新订单列表以确保数据同步
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.error || '文件删除失败');
    }
  };

  // 处理文件上传
  const handleFileUpload = async (orderId: number, fieldName: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = fieldName === 'cdr_file' ? '.cdr,.ai,.eps,.pdf,.png,.jpg,.jpeg,.xlsx,.xls' : '.pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xlsx,.xls,.ppt,.pptx,.txt,.zip,.rar';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        // 创建FormData用于文件上传
        const formData = new FormData();
        formData.append('file', file);
        
        // 上传文件到服务器
        const response = await api.post(`/orders/${orderId}/upload/${fieldName}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        toast.success('文件上传成功');
        
        // 立即更新查看订单弹窗的数据（如果当前正在查看这个订单）
        if (viewingOrder && viewingOrder.id === orderId) {
          const updatedOrderData = { ...viewingOrder.order_data };
          let currentFiles = updatedOrderData[fieldName];
          
          // 兼容旧格式和新格式
          if (!Array.isArray(currentFiles)) {
            currentFiles = currentFiles ? [currentFiles] : [];
          }
          
          // 添加新上传的文件
          const updatedFiles = [...currentFiles, response.data.filename];
          updatedOrderData[fieldName] = updatedFiles;
          
          // 更新 viewingOrder 状态
          setViewingOrder({
            ...viewingOrder,
            order_data: updatedOrderData
          });
        }
        
        // 立即更新订单列表状态
        setOrders(prevOrders => 
          prevOrders.map(order => {
            if (order.id === orderId) {
              const updatedOrderData = { ...order.order_data };
              let currentFiles = updatedOrderData[fieldName];
              
              if (!Array.isArray(currentFiles)) {
                currentFiles = currentFiles ? [currentFiles] : [];
              }
              
              const updatedFiles = [...currentFiles, response.data.filename];
              updatedOrderData[fieldName] = updatedFiles;
              
              return {
                ...order,
                order_data: updatedOrderData
              };
            }
            return order;
          })
        );
      } catch (error: any) {
        if (error.response?.status === 400 && error.response?.data?.error?.includes('最多只能上传5个文件')) {
          toast.error('每个字段最多只能上传5个文件');
        } else {
          toast.error(error.response?.data?.error || '文件上传失败');
        }
      }
    };
    
    input.click();
  };

  const handleQuickEditSave = async () => {
    if (!quickEditCell) return;
    
    try {
      const order = orders.find(o => o.id === quickEditCell.orderId);
      if (!order) return;

      // 准备更新数据
      const updatedOrderData = {
        ...order.order_data,
        [quickEditCell.fieldName]: quickEditValue
      };

      await api.put(`/orders/${quickEditCell.orderId}`, { orderData: updatedOrderData });
      toast.success('字段更新成功');
      
      // 更新本地状态
      setOrders(prevOrders => 
        prevOrders.map(o => 
          o.id === quickEditCell.orderId 
            ? { ...o, order_data: updatedOrderData }
            : o
        )
      );
      
      handleQuickEditCancel();
    } catch (error: any) {
      toast.error(error.response?.data?.error || '更新失败');
    }
  };

  const handleQuickEditCancel = () => {
    setQuickEditCell(null);
    setQuickEditValue('');
  };

  // 渲染快速编辑输入框
  const renderQuickEditInput = (field: FieldDefinition, currentValue: any) => {
    const baseInputClass = "w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500";
    
    // 添加点击外部保存的处理
    const handleBlur = () => {
      handleQuickEditSave();
    };
    
    switch (field.field_type) {
      case 'number':
        return (
          <input
            type="number"
            value={quickEditValue}
            onChange={(e) => setQuickEditValue(e.target.value)}
            onBlur={handleBlur}
            className={baseInputClass}
            step="any"
            autoFocus
          />
        );
      
      case 'currency':
        return (
          <input
            type="number"
            value={quickEditValue}
            onChange={(e) => setQuickEditValue(e.target.value)}
            onBlur={handleBlur}
            className={baseInputClass}
            step="0.01"
            min="0"
            autoFocus
          />
        );
      
      case 'date':
        return (
          <input
            type="date"
            value={quickEditValue}
            onChange={(e) => setQuickEditValue(e.target.value)}
            onBlur={handleBlur}
            className={baseInputClass}
            autoFocus
          />
        );
      
      case 'select':
        // 特殊处理 shop_name 字段
        if (field.field_name === 'shop_name') {
          let shopOptions: string[] = [];
          if (user?.role === 'admin') {
            shopOptions = field.options && field.options.length > 0 ? field.options : shops;
          } else {
            shopOptions = shops.length > 0 ? shops : [];
          }
          
          return (
            <select
              value={quickEditValue}
              onChange={(e) => setQuickEditValue(e.target.value)}
              onBlur={handleBlur}
              className={baseInputClass}
              autoFocus
            >
              <option value="">请选择{field.field_label}</option>
              {shopOptions.map(shop => (
                <option key={shop} value={shop}>
                  {shop}
                </option>
              ))}
            </select>
          );
        }
        
        return (
          <select
            value={quickEditValue}
            onChange={(e) => setQuickEditValue(e.target.value)}
            onBlur={handleBlur}
            className={baseInputClass}
            autoFocus
          >
            <option value="">请选择{field.field_label}</option>
            {field.options?.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      
      default:
        return (
          <input
            type="text"
            value={quickEditValue}
            onChange={(e) => setQuickEditValue(e.target.value)}
            onBlur={handleBlur}
            className={baseInputClass}
            autoFocus
          />
        );
    }
  };

  const handleExport = async (format: 'excel' | 'csv') => {
    setExportLoading(true);
    try {
      const endpoint = format === 'excel' ? '/orders/export' : '/orders/export/csv';
      const response = await api.get(endpoint, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response headers
      const contentDisposition = response.headers['content-disposition'];
      let filename = `订单导出_${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8'')?(.+)/);
        if (filenameMatch) {
          filename = decodeURIComponent(filenameMatch[1].replace(/['"]/g, ''));
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`${format === 'excel' ? 'Excel' : 'CSV'}文件导出成功`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || '导出失败');
    } finally {
      setExportLoading(false);
    }
  };

  const handleInputChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const renderFieldInput = (field: FieldDefinition) => {
    // 更精确的值获取逻辑，避免把有意义的0当作空值处理
    const rawValue = formData[field.field_name];
    
    // 调试信息 - 在开发环境中显示
    if (process.env.NODE_ENV === 'development' && (rawValue === 0 || rawValue === '0')) {
      console.log(`Field ${field.field_name} has value:`, rawValue, typeof rawValue);
    }
    
    // 对于不同类型的字段，使用不同的默认值处理策略
    let value;
    if (rawValue === undefined || rawValue === null) {
      value = '';
    } else if (rawValue === 0 || rawValue === '0') {
      // 对于所有字段类型，如果是0或'0'且不是用户有意输入的，则显示为空
      value = '';
    } else {
      value = rawValue;
    }

    // Special handling for order_id field - make it readonly and show preview
    if (field.field_name === 'order_id') {
      const orderType = formData['order_type'] || '';
      const shopName = formData['shop_name'] || '';
      
      let preview = '';
      if (editingOrder) {
        // For editing, show the current order_id
        preview = formData['order_id'] || '请先选择配送类型和店铺名称';
      } else {
        // For new orders, show preview from formData or generate preview
        preview = formData['order_id'] || (orderType && shopName ? `AM${orderType}-${shopName}-${orders.length + 1}` : '请先选择配送类型和店铺名称');
      }
      
      return (
        <div className="space-y-2">
          <input
            type="text"
            value={preview}
            className="input bg-gray-50 cursor-not-allowed"
            placeholder="系统自动生成"
            readOnly
            disabled
          />
        </div>
      );
    }

    switch (field.field_type) {
      case 'number':
        return (
          <input
            type="number"
            value={value === '' ? '' : value}
            onChange={(e) => handleInputChange(field.field_name, e.target.value)}
            className="input"
            required={field.required}
            placeholder={`请输入${field.field_label}`}
            step="any"
          />
        );
      
      case 'currency':
        // 根据字段名设置默认货币
        let defaultCurrency = '¥'; // 默认为人民币
        if (field.field_name.includes('到账金额') || field.field_name.includes('income') || field.field_name.includes('revenue')) {
          defaultCurrency = '$'; // 到账金额类字段默认为美元
        }
        
        return (
          <div className="space-y-2">
            <div className="flex">
              <select 
                value={formData[field.field_name + '_currency'] || defaultCurrency}
                onChange={(e) => handleInputChange(field.field_name + '_currency', e.target.value)}
                className="w-20 px-3 py-3 bg-white/70 border border-gray-200/50 rounded-l-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50 backdrop-blur-xl transition-all duration-300"
              >
                <option value="¥">¥</option>
                <option value="$">$</option>
                <option value="€">€</option>
                <option value="£">£</option>
              </select>
              <input
                type="number"
                step="0.01"
                value={value === '' ? '' : value}
                onChange={(e) => handleInputChange(field.field_name, e.target.value)}
                className="flex-1 px-4 py-3 bg-white/70 border-l-0 border border-gray-200/50 rounded-r-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50 backdrop-blur-xl transition-all duration-300 placeholder-gray-400"
                required={field.required}
                placeholder={`请输入${field.field_label}`}
                min="0"
              />
            </div>
          </div>
        );
      
      case 'date':
        // 对于日期字段，确保不显示0值
        let dateValue = value;
        if (value === 0 || value === '0' || value === '') {
          dateValue = '';
        }
        
        // Set default date to current date for new orders (only for order_date field)
        const defaultDate = !editingOrder && !dateValue && field.field_name === 'order_date' 
          ? new Date().toISOString().split('T')[0] 
          : dateValue;
        
        return (
          <input
            type="date"
            value={defaultDate}
            onChange={(e) => handleInputChange(field.field_name, e.target.value)}
            className="input"
            required={field.required}
          />
        );
      
      case 'select':
        // 特殊处理 shop_name 字段：根据用户角色使用不同逻辑
        if (field.field_name === 'shop_name') {
          let shopOptions: string[] = [];
          
          // 管理员：优先使用字段管理配置的选项，如果没有配置则使用API结果
          if (user?.role === 'admin') {
            shopOptions = field.options && field.options.length > 0 ? field.options : shops;
          } else {
            // 非管理员：始终使用基于权限过滤的API结果
            shopOptions = shops.length > 0 ? shops : [];
          }
          
          return (
            <select
              value={value}
              onChange={(e) => handleInputChange(field.field_name, e.target.value)}
              className="input"
              required={field.required}
            >
              <option value="">请选择{field.field_label}</option>
              {shopOptions.map(shop => (
                <option key={shop} value={shop}>
                  {shop}
                </option>
              ))}
            </select>
          );
        }
        
        // 其他select字段使用原有逻辑
        return (
          <select
            value={value}
            onChange={(e) => handleInputChange(field.field_name, e.target.value)}
            className="input"
            required={field.required}
          >
            <option value="">请选择{field.field_label}</option>
            {field.options?.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      
      case 'multiselect':
        return (
          <select
            multiple
            value={Array.isArray(value) ? value : []}
            onChange={(e) => {
              const selectedValues = Array.from(e.target.selectedOptions, option => option.value);
              handleInputChange(field.field_name, selectedValues);
            }}
            className="input"
            required={field.required && (!Array.isArray(value) || value.length === 0)}
          >
            {field.options?.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      
      case 'richtext':
        return (
          <textarea
            value={value === '' ? '' : value}
            onChange={(e) => handleInputChange(field.field_name, e.target.value)}
            className="input"
            rows={4}
            required={field.required}
            placeholder={`请输入${field.field_label}`}
          />
        );
      
      case 'formula':
        // 公式字段：重新计算公式结果
        const formulaExpression = field.options?.[0] || '';
        const calculatedValue = evaluateFormula(formulaExpression, formData);
        
        return (
          <div className="space-y-2">
            <div className="flex">
              <div className="w-20 px-3 py-3 bg-gray-100 border border-gray-200/50 rounded-l-2xl flex items-center justify-center text-sm font-medium text-gray-600">
                ¥
              </div>
              <input
                type="text"
                value={calculatedValue}
                className="flex-1 px-4 py-3 bg-gray-50 border-l-0 border border-gray-200/50 rounded-r-2xl cursor-not-allowed text-right font-mono"
                placeholder="计算结果"
                readOnly
                disabled
              />
            </div>
          </div>
        );
      
      case 'file':
        // 获取当前字段的文件列表
        const currentFiles = Array.isArray(value) ? value : (value ? [value] : []);
        
        return (
          <div className="space-y-2">
            <input
              type="file"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  try {
                    // 检查文件数量限制
                    if (currentFiles.length >= 5) {
                      toast.error('每个字段最多只能上传5个文件');
                      return;
                    }
                    
                    // 模拟文件上传逻辑（在实际创建订单时处理）
                    const timestamp = Date.now();
                    const filename = `${timestamp}_${file.name}`;
                    const updatedFiles = [...currentFiles, filename];
                    handleInputChange(field.field_name, updatedFiles);
                    
                    toast.success('文件添加成功');
                  } catch (error) {
                    toast.error('文件添加失败');
                  }
                }
              }}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-gray-200/50 rounded-2xl"
              disabled={currentFiles.length >= 5}
            />
            
            {/* 显示已添加的文件列表 */}
            {currentFiles.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">已选择的文件：</div>
                {currentFiles.map((filename, index) => {
                  const originalName = typeof filename === 'string' ? filename.replace(/^\d+_/, '') : filename;
                  return (
                    <div key={index} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-lg">
                      <span className="text-sm text-green-700">📎 {originalName}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updatedFiles = currentFiles.filter((_, i) => i !== index);
                          handleInputChange(field.field_name, updatedFiles);
                        }}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        移除
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            
            <p className="text-xs text-gray-500">
              💡 支持上传文档、图片、Excel等文件 ({currentFiles.length}/5)
            </p>
          </div>
        );
      
      default:
        return (
          <input
            type="text"
            value={value === '' ? '' : value}
            onChange={(e) => handleInputChange(field.field_name, e.target.value)}
            className="input"
            required={field.required}
            placeholder={`请输入${field.field_label}`}
          />
        );
    }
  };

  // 渲染文件列表
  const renderFileList = (files: string | string[], orderId: number, fieldName: string, showDelete: boolean = false, showOnlyFirst: boolean = false) => {
    // 兼容旧格式（单个文件名）和新格式（文件数组）
    const fileArray = Array.isArray(files) ? files : (files ? [files] : []);
    
    if (fileArray.length === 0) {
      return <span className="text-gray-400 italic">--</span>;
    }
    
    // 生成展开状态的key
    const expandKey = `${orderId}-${fieldName}`;
    const isExpanded = expandedFiles[expandKey] || false;
    
    // 根据展开状态决定显示的文件
    const displayFiles = showOnlyFirst && !isExpanded ? fileArray.slice(0, 1) : fileArray;
    
    // 生成悬停提示信息
    const tooltipInfo = showOnlyFirst && fileArray.length > 1 && !isExpanded
      ? `共 ${fileArray.length} 个文件：${fileArray.map(f => f.replace(/^\d+_/, '')).join(', ')}`
      : undefined;
    
    return (
      <div className="group space-y-1" title={tooltipInfo}>
        {displayFiles.map((filename, index) => {
          const originalName = filename.replace(/^\d+_/, '');
          
          // 计算是否应该显示徽章
          const shouldShowBadge = showOnlyFirst && index === 0 && fileArray.length > 1 && !isExpanded;
          
          return (
            <div key={filename} className="flex items-center space-x-2 text-sm relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleFileDownload(orderId, fieldName, filename);
                }}
                className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline transition-colors relative"
                title="点击下载文件"
              >
                📎 {originalName}
                {/* 红色徽章 - 只在表格视图的第一个文件上显示 */}
                {shouldShowBadge && (
                  <span className="ml-1 text-red-500 font-medium" style={{ fontSize: '8px' }}>
                    +{fileArray.length - 1}
                  </span>
                )}
              </button>
              {showDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFileDelete(orderId, fieldName, filename);
                  }}
                  className="text-red-500 hover:text-red-700 transition-colors"
                  title="删除文件"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
        {/* 显示多文件提示 - 可点击展开/收起 */}
        {showOnlyFirst && fileArray.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpandedFiles(prev => ({
                ...prev,
                [expandKey]: !isExpanded
              }));
            }}
            className={`text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded inline-block transition-all duration-200 ${
              isExpanded ? 'inline-block' : 'hidden group-hover:inline-block'
            }`}
            title={isExpanded ? '点击收起' : '点击展开所有文件'}
          >
            {isExpanded ? '收起' : `+${fileArray.length - 1} 个文件`}
          </button>
        )}
        {/* 显示文件数量信息 - 仅在详情页面显示 */}
        {!showOnlyFirst && fileArray.length < 5 && (
          <div className="text-xs text-gray-500">
            ({fileArray.length}/5 个文件)
          </div>
        )}
      </div>
    );
  };

  const filteredOrders = orders.filter(order => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return Object.values(order.order_data).some(value => 
      String(value).toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="spinner h-12 w-12 border-4 border-blue-200/50 border-t-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">加载订单数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text">
            订单管理 
            <span className="text-lg font-normal text-gray-600 ml-3">
              ({filteredOrders.length} 个订单)
            </span>
          </h1>
          <p className="text-gray-600 mt-1">管理和跟踪您的所有订单</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Export Dropdown */}
          <div className="relative group">
            <button
              className={`btn btn-secondary flex items-center ${exportLoading ? 'opacity-50' : ''}`}
              disabled={exportLoading}
            >
              <DownloadIcon className="h-4 w-4 mr-2" />
              {exportLoading ? '导出中...' : '导出'}
            </button>
            <div className="dropdown absolute right-0 top-full mt-2 w-36 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => handleExport('excel')}
                disabled={exportLoading}
                className="dropdown-item"
              >
                📊 导出Excel
              </button>
              <button
                onClick={() => handleExport('csv')}
                disabled={exportLoading}
                className="dropdown-item"
              >
                📄 导出CSV
              </button>
            </div>
          </div>
          
          <button
            onClick={() => {
              setEditingOrder(null);
              
              // Initialize form with default values
              const initialData: Record<string, any> = {};
              
              // Set default date for order_date field
              const orderDateField = fields.find(f => f.field_name === 'order_date');
              if (orderDateField && orderDateField.field_type === 'date') {
                initialData['order_date'] = new Date().toISOString().split('T')[0];
              }
              
              setFormData(initialData);
              setShowModal(true);
            }}
            className="btn btn-primary flex items-center"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            新增订单
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="search-container max-w-md">
        <SearchIcon className="search-icon" />
        <input
          type="text"
          placeholder="搜索订单..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Orders Table */}
      <div className="table-container">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-3xl mb-4">
              <SearchIcon className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">暂无订单数据</p>
            <p className="text-gray-400 text-sm mt-1">
              {searchTerm ? '尝试修改搜索条件' : '点击"新增订单"创建第一个订单'}
            </p>
          </div>
        ) : (
          <div className="table-scroll-area">
            <table className="min-w-full">
              <thead className="table-header">
                <tr>
                  {/* 冻结的第一列 - 订单编号 */}
                  {fields.length > 0 && (
                    <th 
                      className="sticky-column-header text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 transition-colors"
                      onClick={handleSort}
                    >
                      <div className="flex items-center space-x-2">
                        <span>{fields[0].field_label}</span>
                        <div className="flex flex-col">
                          <svg 
                            className={`w-3 h-3 transition-colors ${sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-400'}`} 
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                          </svg>
                          <svg 
                            className={`w-3 h-3 -mt-1 transition-colors ${sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-400'}`} 
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </th>
                  )}
                  {/* 表格头部 - 只显示未隐藏的字段 */}
                  {fields.filter(field => !field.hidden).slice(1).map(field => (
                    <th key={field.id} className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                      {field.field_label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/50">
                {filteredOrders.map((order, index) => (
                  <tr key={order.id} className="table-row group">
                    {/* 冻结的第一列 - 订单编号 + 操作按钮 */}
                    {fields.length > 0 && (
                      <td className="sticky-column">
                        <div className="space-y-3">
                          {/* 订单编号 */}
                          <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                            {(() => {
                              const field = fields[0];
                              const orderData = order.order_data[field.field_name];
                              
                              if (field.field_type === 'multiselect' && Array.isArray(orderData)) {
                                return orderData.join(', ');
                              } else if (field.field_type === 'currency' && (orderData !== undefined && orderData !== null && orderData !== '')) {
                                let defaultCurrency = '¥';
                                if (field.field_name.includes('到账金额') || field.field_name.includes('income') || field.field_name.includes('revenue')) {
                                  defaultCurrency = '$';
                                }
                                const currency = order.order_data[field.field_name + '_currency'] || defaultCurrency;
                                return `${currency}${parseFloat(orderData).toFixed(2)}`;
                              } else if (field.field_type === 'formula') {
                                // 公式字段：重新计算公式结果
                                const formulaExpression = field.options?.[0] || '';
                                const calculatedValue = evaluateFormula(formulaExpression, order.order_data);
                                return `¥${calculatedValue}`;
                              } else if (field.field_type === 'file' && orderData) {
                                // 文件字段：显示可下载的链接
                                return renderFileList(orderData, order.id, field.field_name, false, true);
                              } else if (orderData !== undefined && orderData !== null && orderData !== '') {
                                return orderData;
                              } else {
                                return (
                                  <span className="text-gray-400 italic">--</span>
                                );
                              }
                            })()}
                          </div>
                          
                          {/* 操作按钮 - 移动到订单编号下方 */}
                          <div className="hidden group-hover:flex items-center space-x-2 transition-all duration-200">
                            {/* 查看按钮 */}
                            <button
                              onClick={() => handleView(order)}
                              className="action-button text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                              title="查看订单详情"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            {/* 编辑按钮 */}
                            <button
                              onClick={() => handleEdit(order)}
                              className="action-button text-blue-600 hover:text-blue-900 hover:bg-blue-50"
                              title="编辑订单"
                            >
                              <EditIcon className="h-4 w-4" />
                            </button>
                            {/* 删除按钮 - 仅管理员或创建者可见 */}
                            {(user?.role === 'admin' || order.created_by === user?.id) && (
                              <button
                                onClick={() => handleDelete(order.id)}
                                className="action-button text-red-600 hover:text-red-900 hover:bg-red-50"
                                title="删除订单"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    )}
                    {/* 其他所有字段 */}
                    {fields.filter(field => !field.hidden).slice(1).map(field => (
                      <td key={field.id} className="whitespace-nowrap">
                        {quickEditCell?.orderId === order.id && quickEditCell?.fieldName === field.field_name ? (
                          // 编辑模式
                          <div className="min-w-[200px]">
                            {renderQuickEditInput(field, order.order_data[field.field_name])}
                          </div>
                        ) : (
                          // 显示模式
                          <div 
                            className="text-sm text-gray-900 max-w-xs truncate hover:bg-blue-50 px-2 py-1 rounded transition-colors group relative flex items-center justify-between overflow-visible"
                            title={
                              field.field_type === 'formula' || field.field_name === 'order_id' 
                                ? '此字段不支持快速编辑' 
                                : field.field_type === 'file'
                                ? '点击上传文件 (最多5个)'
                                : '点击编辑'
                            }
                          >
                            <span className="flex-1 truncate overflow-visible">
                              {(() => {
                                const fieldValue = order.order_data[field.field_name];
                                
                                if (field.field_type === 'multiselect' && Array.isArray(fieldValue)) {
                                  return fieldValue.join(', ');
                                } else if (field.field_type === 'currency' && (fieldValue !== undefined && fieldValue !== null && fieldValue !== '')) {
                                  // 根据字段名设置默认货币（与输入表单保持一致）
                                  let defaultCurrency = '¥';
                                  if (field.field_name.includes('到账金额') || field.field_name.includes('income') || field.field_name.includes('revenue')) {
                                    defaultCurrency = '$';
                                  }
                                  const currency = order.order_data[field.field_name + '_currency'] || defaultCurrency;
                                  return `${currency}${parseFloat(fieldValue).toFixed(2)}`;
                                } else if (field.field_type === 'formula') {
                                  // 公式字段：重新计算公式结果
                                  const formulaExpression = field.options?.[0] || '';
                                  const calculatedValue = evaluateFormula(formulaExpression, order.order_data);
                                  return `¥${calculatedValue}`;
                                } else if (field.field_type === 'file' && fieldValue) {
                                  // 文件字段：显示可下载的链接
                                  return renderFileList(fieldValue, order.id, field.field_name, false, true);
                                } else if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
                                  return fieldValue;
                                } else {
                                  return (
                                    <span className="text-gray-400 italic">--</span>
                                  );
                                }
                              })()}
                            </span>
                            {/* 编辑/上传图标 - 可点击 */}
                            {field.field_type !== 'formula' && field.field_name !== 'order_id' && (
                              <button
                                onClick={() => handleQuickEdit(order.id, field.field_name, order.order_data[field.field_name])}
                                className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-100 rounded transition-all duration-200 ml-2"
                                title={field.field_type === 'file' ? '点击上传文件' : '点击编辑'}
                              >
                                {field.field_type === 'file' ? (
                                  <svg className="h-3 w-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                  </svg>
                                ) : (
                                  <EditIcon className="h-3 w-3 text-blue-600" />
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay flex items-center justify-center p-4 z-50">
          <div className="modal-content w-full max-w-5xl max-h-[90vh] flex flex-col slide-up">
            {/* 固定的头部 */}
            <div className="modal-header">
              <h2 className="text-2xl font-bold gradient-text">
                {editingOrder ? '编辑订单' : '新增订单'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingOrder(null);
                  setFormData({});
                }}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* 可滚动的内容区域 */}
            <div className="modal-content-area">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="form-grid">
                  {fields.map(field => {
                    // 根据字段类型和字段名决定跨列数
                    let fieldClass = 'form-group';
                    
                    // 全宽字段：订单编号、备注（富文本字段）
                    if (field.field_name === 'order_id' || field.field_type === 'richtext') {
                      fieldClass += ' form-field-full';
                    }
                    // 其他所有字段都按三列显示，包括产品成本、总成本、公式字段、文件等
                    
                    return (
                      <div key={field.id} className={fieldClass}>
                        <label className="form-label">
                          {field.field_label}
                          {!!field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {renderFieldInput(field)}
                      </div>
                    );
                  })}
                </div>
              </form>
            </div>
            
            {/* 固定的底部 */}
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingOrder(null);
                  setFormData({});
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
                {editingOrder ? '更新订单' : '创建订单'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Order Modal */}
      {viewingOrder && (
        <div className="modal-overlay flex items-center justify-center p-4 z-50">
          <div className="modal-content w-full max-w-4xl max-h-[90vh] flex flex-col slide-up">
            {/* 固定的头部 */}
            <div className="modal-header">
              <h2 className="text-2xl font-bold gradient-text">
                订单详情
              </h2>
              <button
                onClick={() => setViewingOrder(null)}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>
            
            {/* 可滚动的内容区域 */}
            <div className="modal-content-area">
              <div className="space-y-6">
                {/* 订单基本信息 */}
                <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-200/50">
                  <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
                    📋 订单基本信息
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-600">创建者:</span>
                      <p className="text-gray-900 font-medium">{viewingOrder.created_by_username}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">创建时间:</span>
                      <p className="text-gray-900 font-medium">
                        {new Date(viewingOrder.created_at).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">最后更新:</span>
                      <p className="text-gray-900 font-medium">
                        {new Date(viewingOrder.updated_at).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 字段详情 */}
                <div className="bg-white/70 rounded-2xl p-6 border border-gray-200/50">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    📊 字段详情
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {fields.map(field => {
                      const value = viewingOrder.order_data[field.field_name];
                      let displayValue: any = '';
                      let isFileField = false;

                      if (field.field_type === 'multiselect' && Array.isArray(value)) {
                        displayValue = value.join(', ');
                      } else if (field.field_type === 'currency' && (value !== undefined && value !== null && value !== '')) {
                        let defaultCurrency = '¥';
                        if (field.field_name.includes('到账金额') || field.field_name.includes('income') || field.field_name.includes('revenue')) {
                          defaultCurrency = '$';
                        }
                        const currency = viewingOrder.order_data[field.field_name + '_currency'] || defaultCurrency;
                        displayValue = `${currency}${parseFloat(value).toFixed(2)}`;
                      } else if (field.field_type === 'formula') {
                        // 公式字段：重新计算公式结果
                        const formulaExpression = field.options?.[0] || '';
                        const calculatedValue = evaluateFormula(formulaExpression, viewingOrder.order_data);
                        displayValue = `¥${calculatedValue}`;
                      } else if (field.field_type === 'file' && value) {
                        // 文件字段：特殊处理
                        isFileField = true;
                        displayValue = value; // 保持原始数据用于渲染
                      } else if (field.field_type === 'date' && value) {
                        displayValue = new Date(value).toLocaleDateString('zh-CN');
                      } else if (value !== undefined && value !== null && value !== '') {
                        displayValue = value;
                      } else {
                        displayValue = '--';
                      }

                      // 根据字段类型和字段名决定跨列数
                      let fieldClass = 'space-y-2';
                      if (field.field_name === 'order_id' || field.field_type === 'richtext') {
                        fieldClass += ' sm:col-span-2 lg:col-span-3';
                      }
                      // 其他所有字段都按三列显示，包括产品成本、总成本、公式字段、文件等

                      return (
                        <div key={field.id} className={fieldClass}>
                          <label className="text-sm font-medium text-gray-600">
                            {field.field_label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-200/50">
                            {field.field_type === 'richtext' ? (
                              <div className="whitespace-pre-wrap text-sm text-gray-900">
                                {displayValue}
                              </div>
                            ) : isFileField ? (
                              <div className="space-y-2">
                                {renderFileList(value, viewingOrder.id, field.field_name, true)}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-900">
                                {displayValue}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            
            {/* 固定的底部 */}
            <div className="modal-footer">
              <button
                onClick={() => {
                  setViewingOrder(null);
                  handleEdit(viewingOrder);
                }}
                className="btn btn-primary"
              >
                编辑此订单
              </button>
              <button
                onClick={() => setViewingOrder(null)}
                className="btn btn-secondary"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 