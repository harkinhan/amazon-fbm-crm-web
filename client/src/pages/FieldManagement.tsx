import React, { useState, useEffect } from 'react';
import { PlusIcon, EditIcon, TrashIcon, MoveIcon, ChevronUpIcon, ChevronDownIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { FieldDefinition } from '../types';
import { useAuth } from '../contexts/AuthContext';
import FormulaBuilder from '../components/FormulaBuilder';

interface FieldForm {
  fieldName: string;
  fieldLabel: string;
  fieldType: 'text' | 'currency' | 'select' | 'date' | 'multiselect' | 'richtext' | 'file' | 'number' | 'formula';
  options: string[];
  required: boolean;
  sortOrder: number;
  hidden: boolean;
}

export default function FieldManagement() {
  const { user } = useAuth();
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingField, setEditingField] = useState<FieldDefinition | null>(null);
  const [formData, setFormData] = useState<FieldForm>({
    fieldName: '',
    fieldLabel: '',
    fieldType: 'text',
    options: [],
    required: false,
    sortOrder: 0,
    hidden: false
  });
  const [optionsText, setOptionsText] = useState('');

  useEffect(() => {
    if (user?.role !== 'admin') {
      toast.error('您没有权限访问此页面');
      return;
    }
    fetchFields();
  }, [user]);

  const fetchFields = async () => {
    try {
      const response = await api.get('/fields');
      console.log('Fetched fields:', response.data);
      // 确保所有字段都有hidden属性
      const fieldsWithDefaults = response.data.map((field: any) => ({
        ...field,
        hidden: field.hidden || false // 确保hidden有默认值
      }));
      setFields(fieldsWithDefaults);
    } catch (error) {
      toast.error('获取字段失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fieldName || !formData.fieldLabel || !formData.fieldType) {
      toast.error('请填写所有必填字段');
      return;
    }

    try {
      const options = formData.fieldType === 'select' || formData.fieldType === 'multiselect' 
        ? optionsText.split('\n').filter(option => option.trim()) 
        : formData.fieldType === 'formula' 
          ? [optionsText.trim()]
          : [];

      const requestData = {
        fieldName: formData.fieldName,
        fieldLabel: formData.fieldLabel,
        fieldType: formData.fieldType,
        options: options.length > 0 ? options : null,
        required: formData.required,
        sortOrder: formData.sortOrder,
        hidden: formData.hidden
      };

      if (editingField) {
        await api.put(`/fields/${editingField.id}`, requestData);
        toast.success('字段更新成功');
      } else {
        await api.post('/fields', requestData);
        toast.success('字段创建成功');
      }
      
      setShowModal(false);
      resetForm();
      fetchFields();
    } catch (error: any) {
      toast.error(error.response?.data?.error || '操作失败');
    }
  };

  const handleEdit = (field: FieldDefinition) => {
    setEditingField(field);
    setFormData({
      fieldName: field.field_name,
      fieldLabel: field.field_label,
      fieldType: field.field_type,
      options: field.options || [],
      required: field.required,
      sortOrder: field.sort_order,
      hidden: field.hidden
    });
    
    // 根据字段类型设置optionsText
    if (['select', 'multiselect'].includes(field.field_type)) {
      setOptionsText(field.options?.join('\n') || '');
    } else if (field.field_type === 'formula') {
      setOptionsText(field.options?.[0] || ''); // 公式存储在第一个选项中
    } else {
      setOptionsText('');
    }
    
    setShowModal(true);
  };

  const handleDelete = async (fieldId: number) => {
    if (!confirm('确定要删除这个字段吗？删除后相关订单数据可能受影响。')) return;
    
    try {
      await api.delete(`/fields/${fieldId}`);
      toast.success('字段删除成功');
      fetchFields();
    } catch (error: any) {
      toast.error(error.response?.data?.error || '删除失败');
    }
  };

  const handleSortOrderChange = async (fieldId: number, newSortOrder: number) => {
    try {
      // 先更新本地状态，提供即时反馈
      const updatedFields = fields.map(field => 
        field.id === fieldId ? { ...field, sort_order: newSortOrder } : field
      );
      setFields(updatedFields);
      
      // 调用API更新数据库
      await api.put('/fields/sort-order', {
        fields: updatedFields.map(f => ({ 
          id: f.id, 
          sortOrder: Number(f.sort_order)
        }))
      });
      
      toast.success('排序更新成功');
    } catch (error: any) {
      console.error('排序更新失败:', error);
      toast.error(error.response?.data?.error || '排序更新失败');
      // 如果更新失败，重新获取数据恢复状态
      fetchFields();
    }
  };

  const handleSortOrderInputChange = (fieldId: number, value: string) => {
    console.log('handleSortOrderInputChange called:', fieldId, value);
    // 仅更新本地显示，不调用API
    const numValue = parseInt(value) || 0;
    const updatedFields = fields.map(field => 
      field.id === fieldId ? { ...field, sort_order: numValue } : field
    );
    setFields(updatedFields);
  };

  const handleSortOrderBlur = async (fieldId: number, value: string) => {
    console.log('handleSortOrderBlur called:', fieldId, value);
    // 失去焦点时保存到数据库
    const numValue = parseInt(value) || 0;
    await handleSortOrderChange(fieldId, numValue);
  };

  const handleMoveUp = async (fieldId: number) => {
    const currentField = fields.find(f => f.id === fieldId);
    if (!currentField) return;
    
    const currentIndex = fields.findIndex(f => f.id === fieldId);
    if (currentIndex <= 0) return; // 已经是第一个了
    
    const newFields = [...fields];
    // 交换当前字段和上一个字段的排序
    const temp = newFields[currentIndex - 1].sort_order;
    newFields[currentIndex - 1].sort_order = newFields[currentIndex].sort_order;
    newFields[currentIndex].sort_order = temp;
    
    setFields(newFields);
    
    try {
      await api.put('/fields/sort-order', {
        fields: newFields.map(f => ({ id: f.id, sortOrder: f.sort_order }))
      });
      toast.success('排序更新成功');
    } catch (error: any) {
      toast.error(error.response?.data?.error || '排序更新失败');
      fetchFields(); // 恢复原状态
    }
  };

  const handleMoveDown = async (fieldId: number) => {
    const currentField = fields.find(f => f.id === fieldId);
    if (!currentField) return;
    
    const currentIndex = fields.findIndex(f => f.id === fieldId);
    if (currentIndex >= fields.length - 1) return; // 已经是最后一个了
    
    const newFields = [...fields];
    // 交换当前字段和下一个字段的排序
    const temp = newFields[currentIndex + 1].sort_order;
    newFields[currentIndex + 1].sort_order = newFields[currentIndex].sort_order;
    newFields[currentIndex].sort_order = temp;
    
    setFields(newFields);
    
    try {
      await api.put('/fields/sort-order', {
        fields: newFields.map(f => ({ id: f.id, sortOrder: f.sort_order }))
      });
      toast.success('排序更新成功');
    } catch (error: any) {
      toast.error(error.response?.data?.error || '排序更新失败');
      fetchFields(); // 恢复原状态
    }
  };

  const handleToggleHidden = async (fieldId: number) => {
    try {
      const field = fields.find(f => f.id === fieldId);
      if (!field) return;
      
      const newHiddenState = !field.hidden;
      
      await api.put(`/fields/${fieldId}`, {
        fieldName: field.field_name,
        fieldLabel: field.field_label,
        fieldType: field.field_type,
        options: field.options,
        required: field.required,
        sortOrder: field.sort_order,
        hidden: newHiddenState
      });
      
      setFields(fields.map(f => 
        f.id === fieldId ? { ...f, hidden: newHiddenState } : f
      ));
      
      toast.success(newHiddenState ? '字段已隐藏' : '字段已显示');
    } catch (error: any) {
      toast.error(error.response?.data?.error || '操作失败');
    }
  };

  const resetForm = () => {
    setFormData({
      fieldName: '',
      fieldLabel: '',
      fieldType: 'text',
      options: [],
      required: false,
      sortOrder: fields.length,
      hidden: false
    });
    setOptionsText('');
  };

  const fieldTypeOptions = [
    { value: 'text', label: '文本' },
    { value: 'number', label: '数值' },
    { value: 'currency', label: '货币' },
    { value: 'select', label: '单选' },
    { value: 'date', label: '日期' },
    { value: 'multiselect', label: '多选' },
    { value: 'richtext', label: '富文本' },
    { value: 'file', label: '文件' },
    { value: 'formula', label: '公式' }
  ];

  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">权限不足</h2>
        <p className="text-gray-600">只有管理员可以访问字段管理功能</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="spinner h-12 w-12 border-4 border-blue-200/50 border-t-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">加载字段数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text">字段管理</h1>
          <p className="text-gray-600 mt-1">管理订单字段配置和自定义字段</p>
        </div>
        <button
          onClick={() => {
            setEditingField(null);
            resetForm();
            setShowModal(true);
          }}
          className="btn btn-primary flex items-center"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          新增字段
        </button>
      </div>

      {/* Fields Table */}
      <div className="table-container">
        {fields.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-3xl mb-4">
              <PlusIcon className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">暂无字段配置</p>
            <p className="text-gray-400 text-sm mt-1">点击"新增字段"开始配置</p>
          </div>
        ) : (
          <div className="table-scroll-area">
            <table className="min-w-full">
              <thead className="table-header">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    排序
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    字段名
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    显示标签
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    类型
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    必填
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    选项
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/50">
                {fields.map((field) => (
                  <tr key={field.id} className="table-row">
                    <td className="whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={field.sort_order}
                          onChange={(e) => {
                            console.log('Input changed:', field.id, e.target.value);
                            handleSortOrderInputChange(field.id, e.target.value);
                          }}
                          onBlur={(e) => {
                            console.log('Input blurred:', field.id, e.target.value);
                            handleSortOrderBlur(field.id, e.target.value);
                          }}
                          onFocus={() => console.log('Input focused:', field.id)}
                          className="w-16 px-2 py-1 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          min="0"
                        />
                        <div className="flex flex-col">
                          <button
                            onClick={() => handleMoveUp(field.id)}
                            disabled={fields.findIndex(f => f.id === field.id) === 0}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="向上移动"
                          >
                            <ChevronUpIcon className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleMoveDown(field.id)}
                            disabled={fields.findIndex(f => f.id === field.id) === fields.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="向下移动"
                          >
                            <ChevronDownIcon className="h-3 w-3" />
                          </button>
                        </div>
                        <MoveIcon className="h-4 w-4 text-gray-400" />
                      </div>
                    </td>
                    <td className="whitespace-nowrap text-sm font-medium text-gray-900">
                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded-lg">
                        {field.field_name}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-sm text-gray-900">
                      {field.field_label}
                    </td>
                    <td className="whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                        field.field_type === 'text' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        field.field_type === 'number' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' :
                        field.field_type === 'currency' ? 'bg-green-100 text-green-800 border-green-200' :
                        field.field_type === 'select' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                        field.field_type === 'date' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                        field.field_type === 'multiselect' ? 'bg-pink-100 text-pink-800 border-pink-200' :
                        field.field_type === 'richtext' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                        field.field_type === 'formula' ? 'bg-cyan-100 text-cyan-800 border-cyan-200' :
                        'bg-gray-100 text-gray-800 border-gray-200'
                      }`}>
                        {fieldTypeOptions.find(opt => opt.value === field.field_type)?.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-sm text-gray-900">
                      {field.required ? (
                        <span className="badge badge-error">必填</span>
                      ) : (
                        <span className="badge badge-info">可选</span>
                      )}
                    </td>
                    <td className="text-sm text-gray-900">
                      {field.options && field.options.length > 0 ? (
                        <div className="max-w-xs">
                          <span className="text-xs text-gray-500">
                            {field.options.length}个选项
                          </span>
                          <div className="text-xs text-gray-400 truncate">
                            {field.options.slice(0, 3).join(', ')}
                            {field.options.length > 3 && '...'}
                          </div>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-3">
                        {/* 隐藏/显示切换按钮 */}
                        <button
                          onClick={() => handleToggleHidden(field.id)}
                          className={`p-1 rounded-lg transition-colors ${
                            field.hidden
                              ? 'text-green-600 hover:text-green-900 hover:bg-green-50'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                          }`}
                          title={field.hidden ? '显示字段' : '隐藏字段'}
                        >
                          {field.hidden ? (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L12 12m0 0l6.121 6.121M12 12L3 3" />
                            </svg>
                          )}
                        </button>
                        {/* 编辑按钮 */}
                        <button
                          onClick={() => handleEdit(field)}
                          className="text-blue-600 hover:text-blue-900 transition-colors p-1 hover:bg-blue-50 rounded-lg"
                          title="编辑字段"
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                        {/* 删除按钮 */}
                        <button
                          onClick={() => handleDelete(field.id)}
                          className="text-red-600 hover:text-red-900 transition-colors p-1 hover:bg-red-50 rounded-lg"
                          title="删除字段"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Field Modal */}
      {showModal && (
        <div className="modal-overlay flex items-center justify-center p-4 z-50">
          <div className="modal-content w-full max-w-4xl max-h-[90vh] flex flex-col slide-up">
            {/* 固定的头部 */}
            <div className="modal-header">
              <h2 className="text-2xl font-bold gradient-text">
                {editingField ? '编辑字段' : '新增字段'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingField(null);
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
                <div className="form-group">
                  <label className="form-label">
                    字段名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.fieldName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fieldName: e.target.value }))}
                    className="input"
                    placeholder="例如: order_id"
                    required
                    disabled={!!editingField} // 编辑时不允许修改字段名
                  />
                  {editingField && (
                    <p className="text-xs text-red-500 mt-1">⚠️ 字段名不可修改以保护数据完整性</p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    显示标签 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.fieldLabel}
                    onChange={(e) => setFormData(prev => ({ ...prev, fieldLabel: e.target.value }))}
                    className="input"
                    placeholder="例如: 订单编号"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    字段类型 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.fieldType}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      fieldType: e.target.value as any 
                    }))}
                    className="input"
                    required
                  >
                    {fieldTypeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {['select', 'multiselect'].includes(formData.fieldType) && (
                  <div className="form-group">
                    <label className="form-label">
                      选项 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={optionsText}
                      onChange={(e) => setOptionsText(e.target.value)}
                      className="input"
                      rows={4}
                      placeholder="每行一个选项，例如：&#10;选项1&#10;选项2&#10;选项3"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">每行输入一个选项</p>
                  </div>
                )}

                {formData.fieldType === 'formula' && (
                  <div className="form-group">
                    <label className="form-label">
                      公式设计器 <span className="text-red-500">*</span>
                    </label>
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <FormulaBuilder
                        value={optionsText}
                        onChange={setOptionsText}
                        fields={fields}
                      />
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">排序顺序</label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      sortOrder: parseInt(e.target.value) || 0 
                    }))}
                    className="input"
                    min="0"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="required"
                    checked={formData.required}
                    onChange={(e) => setFormData(prev => ({ ...prev, required: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="required" className="ml-2 block text-sm text-gray-900">
                    必填字段
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="hidden"
                    checked={formData.hidden}
                    onChange={(e) => setFormData(prev => ({ ...prev, hidden: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="hidden" className="ml-2 block text-sm text-gray-900">
                    在订单表格中隐藏此字段
                  </label>
                </div>
              </form>
            </div>
            
            {/* 固定的底部 */}
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingField(null);
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
                {editingField ? '更新' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 