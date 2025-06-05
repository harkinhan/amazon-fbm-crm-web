import React, { useState, useEffect, useRef } from 'react';
import { PlusIcon, TrashIcon, ArrowUp, ArrowDown, Calculator, AlertTriangle } from 'lucide-react';
import { FieldDefinition } from '../types';

interface FormulaElement {
  id: string;
  type: 'field' | 'operator' | 'number' | 'parenthesis';
  value: string;
  label?: string;
}

interface FormulaBuilderProps {
  value: string;
  onChange: (formula: string) => void;
  fields: FieldDefinition[];
}

export default function FormulaBuilder({ value, onChange, fields }: FormulaBuilderProps) {
  const [elements, setElements] = useState<FormulaElement[]>([]);
  const [previewResult, setPreviewResult] = useState<string>('');
  const [previewError, setPreviewError] = useState<string>('');
  const [numberInput, setNumberInput] = useState<string>('');
  const numberInputRef = useRef<HTMLInputElement>(null);

  // 可选择的数值字段（排除公式字段本身和非数值字段）
  const numericFields = fields.filter(field => 
    ['number', 'currency'].includes(field.field_type)
  );

  const operators = [
    { value: '+', label: '加 (+)', symbol: '+' },
    { value: '-', label: '减 (-)', symbol: '−' },
    { value: '*', label: '乘 (×)', symbol: '×' },
    { value: '/', label: '除 (÷)', symbol: '÷' }
  ];

  // 解析现有公式到元素数组
  useEffect(() => {
    if (value && value.trim()) {
      parseFormulaToElements(value);
    } else {
      setElements([]);
    }
  }, []);

  // 计算预览结果
  useEffect(() => {
    calculatePreview();
  }, [elements, numericFields]);

  // 键盘快捷键处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target === numberInputRef.current) return; // 不影响数字输入框

      switch (e.key) {
        case '+':
          e.preventDefault();
          addElement('operator', '+', '加 (+)');
          break;
        case '-':
          e.preventDefault();
          addElement('operator', '-', '减 (-)');
          break;
        case '*':
          e.preventDefault();
          addElement('operator', '*', '乘 (×)');
          break;
        case '/':
          e.preventDefault();
          addElement('operator', '/', '除 (÷)');
          break;
        case '(':
          e.preventDefault();
          addElement('parenthesis', '(');
          break;
        case ')':
          e.preventDefault();
          addElement('parenthesis', ')');
          break;
        case 'Escape':
          e.preventDefault();
          clearAll();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 简单的公式解析
  const parseFormulaToElements = (formula: string) => {
    const tokens = formula.split(/(\s*[+\-*/()]\s*)/).filter(token => token.trim());
    const parsed: FormulaElement[] = [];
    
    tokens.forEach((token, index) => {
      const trimmed = token.trim();
      if (!trimmed) return;
      
      if (['+', '-', '*', '/'].includes(trimmed)) {
        parsed.push({
          id: `${index}`,
          type: 'operator',
          value: trimmed,
          label: operators.find(op => op.value === trimmed)?.label || trimmed
        });
      } else if (['(', ')'].includes(trimmed)) {
        parsed.push({
          id: `${index}`,
          type: 'parenthesis',
          value: trimmed
        });
      } else if (!isNaN(Number(trimmed))) {
        parsed.push({
          id: `${index}`,
          type: 'number',
          value: trimmed
        });
      } else {
        const field = numericFields.find(f => f.field_name === trimmed);
        parsed.push({
          id: `${index}`,
          type: 'field',
          value: trimmed,
          label: field?.field_label || trimmed
        });
      }
    });
    
    setElements(parsed);
  };

  // 生成公式表达式
  const generateFormula = (newElements: FormulaElement[]) => {
    const formula = newElements.map(el => el.value).join(' ');
    onChange(formula);
  };

  // 验证公式合法性
  const validateFormula = (elements: FormulaElement[]): string | null => {
    if (elements.length === 0) return null;

    // 检查括号匹配
    let openParens = 0;
    for (const element of elements) {
      if (element.value === '(') openParens++;
      if (element.value === ')') openParens--;
      if (openParens < 0) return '括号不匹配';
    }
    if (openParens !== 0) return '括号不匹配';

    // 检查操作符位置
    for (let i = 0; i < elements.length; i++) {
      const current = elements[i];
      const next = elements[i + 1];
      const prev = elements[i - 1];

      if (current.type === 'operator') {
        // 操作符前后不能是操作符
        if (prev && prev.type === 'operator') return '操作符不能连续出现';
        if (next && next.type === 'operator') return '操作符不能连续出现';
        // 操作符不能在开头或结尾
        if (i === 0 || i === elements.length - 1) return '操作符位置不正确';
      }
    }

    return null;
  };

  // 计算预览结果（使用示例数据）
  const calculatePreview = () => {
    setPreviewError('');
    
    if (elements.length === 0) {
      setPreviewResult('');
      return;
    }

    // 验证公式
    const validationError = validateFormula(elements);
    if (validationError) {
      setPreviewError(validationError);
      setPreviewResult('');
      return;
    }

    try {
      // 创建示例数据用于预览
      const sampleData: Record<string, number> = {};
      numericFields.forEach(field => {
        // 为每个字段分配示例数值，空值按0处理
        sampleData[field.field_name] = field.field_type === 'currency' ? 100 : 10;
      });

      // 替换公式中的字段名为示例值
      let expression = elements.map(el => el.value).join(' ');
      Object.keys(sampleData).forEach(fieldName => {
        expression = expression.replace(new RegExp(`\\b${fieldName}\\b`, 'g'), sampleData[fieldName].toString());
      });

      // 检查是否还有未替换的字段名
      const unresolvedFields = expression.match(/[a-zA-Z_][a-zA-Z0-9_]*/g);
      if (unresolvedFields) {
        setPreviewError(`未知字段: ${unresolvedFields.join(', ')}`);
        setPreviewResult('');
        return;
      }

      // 安全的数学表达式计算
      if (/^[0-9+\-*/.() ]+$/.test(expression)) {
        const result = Function('"use strict"; return (' + expression + ')')();
        if (isNaN(result) || !isFinite(result)) {
          setPreviewError('计算结果无效');
          setPreviewResult('');
        } else {
          setPreviewResult(`≈ ${result.toFixed(2)}`);
        }
      } else {
        setPreviewError('表达式包含无效字符');
        setPreviewResult('');
      }
    } catch (error) {
      setPreviewError('计算出错');
      setPreviewResult('');
    }
  };

  // 添加元素
  const addElement = (type: 'field' | 'operator' | 'number' | 'parenthesis', value: string, label?: string) => {
    const newElement: FormulaElement = {
      id: Date.now().toString(),
      type,
      value,
      label
    };
    
    const newElements = [...elements, newElement];
    setElements(newElements);
    generateFormula(newElements);
  };

  // 删除元素
  const removeElement = (id: string) => {
    const newElements = elements.filter(el => el.id !== id);
    setElements(newElements);
    generateFormula(newElements);
  };

  // 移动元素
  const moveElement = (id: string, direction: 'up' | 'down') => {
    const currentIndex = elements.findIndex(el => el.id === id);
    if (currentIndex === -1) return;

    const newElements = [...elements];
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex >= 0 && targetIndex < newElements.length) {
      [newElements[currentIndex], newElements[targetIndex]] = [newElements[targetIndex], newElements[currentIndex]];
      setElements(newElements);
      generateFormula(newElements);
    }
  };

  // 清空所有元素
  const clearAll = () => {
    setElements([]);
    onChange('');
    setPreviewError('');
  };

  // 添加数字
  const handleAddNumber = () => {
    const trimmedInput = numberInput.trim();
    if (trimmedInput !== '' && !isNaN(Number(trimmedInput))) {
      addElement('number', trimmedInput);
      setNumberInput('');
    }
  };

  return (
    <div className="space-y-4">
      {/* 当前公式显示 */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            当前公式预览:
          </label>
          <div className="flex items-center space-x-4">
            {previewError && (
              <div className="flex items-center text-sm text-red-600">
                <AlertTriangle className="h-4 w-4 mr-1" />
                <span className="truncate max-w-48" title={previewError}>{previewError}</span>
              </div>
            )}
            {previewResult && !previewError && (
              <div className="flex items-center text-sm text-blue-600">
                <Calculator className="h-4 w-4 mr-1" />
                <span>示例计算: {previewResult}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center flex-wrap gap-2 min-h-[40px] max-h-32 overflow-y-auto p-2 bg-gray-50 rounded border">
          {elements.length === 0 ? (
            <span className="text-gray-400 italic">点击下方按钮构建公式...</span>
          ) : (
            elements.map((element, index) => (
              <div
                key={element.id}
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm border transition-all duration-200 ${
                  element.type === 'field' ? 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200' :
                  element.type === 'operator' ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200' :
                  element.type === 'number' ? 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200' :
                  'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200'
                }`}
              >
                <span className="mr-2">
                  {element.type === 'field' ? element.label : 
                   element.type === 'operator' ? operators.find(op => op.value === element.value)?.symbol || element.value :
                   element.value}
                </span>
                <div className="flex items-center space-x-1">
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => moveElement(element.id, 'up')}
                      className="text-gray-500 hover:text-gray-700 p-0.5 rounded hover:bg-white/50"
                      title="上移 (快捷键: ↑)"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                  )}
                  {index < elements.length - 1 && (
                    <button
                      type="button"
                      onClick={() => moveElement(element.id, 'down')}
                      className="text-gray-500 hover:text-gray-700 p-0.5 rounded hover:bg-white/50"
                      title="下移 (快捷键: ↓)"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeElement(element.id)}
                    className="text-red-500 hover:text-red-700 p-0.5 rounded hover:bg-white/50"
                    title="删除 (快捷键: Delete)"
                  >
                    <TrashIcon className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        {elements.length > 0 && (
          <div className="mt-2 flex justify-between items-center">
            <div className="text-xs text-gray-500">
              💡 快捷键: + - * / ( ) 添加符号，Esc 清空
            </div>
            <button
              type="button"
              onClick={clearAll}
              className="text-sm text-red-600 hover:text-red-800"
            >
              清空所有
            </button>
          </div>
        )}
      </div>

      {/* 常用公式模板 */}
      {numericFields.length >= 2 && (
        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
          <label className="block text-sm font-medium text-yellow-800 mb-2">
            🚀 快速模板:
          </label>
          <div className="flex flex-wrap gap-2">
            {numericFields.length >= 2 && (
              <button
                type="button"
                onClick={() => {
                  const field1 = numericFields[0];
                  const field2 = numericFields[1];
                  setElements([]);
                  setTimeout(() => {
                    addElement('field', field1.field_name, field1.field_label);
                    setTimeout(() => addElement('operator', '*'), 50);
                    setTimeout(() => addElement('field', field2.field_name, field2.field_label), 100);
                  }, 0);
                }}
                className="px-3 py-1 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded-lg hover:bg-yellow-200 transition-colors text-xs"
              >
                {numericFields[0]?.field_label} × {numericFields[1]?.field_label}
              </button>
            )}
            {numericFields.length >= 3 && (
              <button
                type="button"
                onClick={() => {
                  const [field1, field2, field3] = numericFields;
                  setElements([]);
                  setTimeout(() => {
                    addElement('field', field1.field_name, field1.field_label);
                    setTimeout(() => addElement('operator', '*'), 50);
                    setTimeout(() => addElement('field', field2.field_name, field2.field_label), 100);
                    setTimeout(() => addElement('operator', '+'), 150);
                    setTimeout(() => addElement('field', field3.field_name, field3.field_label), 200);
                  }, 0);
                }}
                className="px-3 py-1 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded-lg hover:bg-yellow-200 transition-colors text-xs"
              >
                {numericFields[0]?.field_label} × {numericFields[1]?.field_label} + {numericFields[2]?.field_label}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 字段选择和操作 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择字段:
          </label>
          <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-2">
            {numericFields.map((field) => (
              <button
                type="button"
                key={field.id}
                onClick={() => addElement('field', field.field_name, field.field_label)}
                className="w-full text-left px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                <div className="font-medium text-sm">{field.field_label}</div>
                <div className="text-xs text-gray-500">{field.field_name}</div>
              </button>
            ))}
            {numericFields.length === 0 && (
              <p className="text-sm text-gray-500 italic p-4 text-center">
                暂无可用的数值字段
              </p>
            )}
          </div>
        </div>

        {/* 操作符和其他 */}
        <div className="space-y-4">
          {/* 操作符 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              操作符 (快捷键):
            </label>
            <div className="grid grid-cols-2 gap-2">
              {operators.map((op) => (
                <button
                  type="button"
                  key={op.value}
                  onClick={() => addElement('operator', op.value, op.label)}
                  className="px-3 py-2 bg-green-100 text-green-800 border border-green-200 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
                  title={`快捷键: ${op.value}`}
                >
                  {op.symbol} {op.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* 括号 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              括号 (快捷键):
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => addElement('parenthesis', '(')}
                className="px-3 py-2 bg-gray-100 text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                title="快捷键: ("
              >
                ( 左括号
              </button>
              <button
                type="button"
                onClick={() => addElement('parenthesis', ')')}
                className="px-3 py-2 bg-gray-100 text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                title="快捷键: )"
              >
                ) 右括号
              </button>
            </div>
          </div>

          {/* 数字输入 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              添加数字:
            </label>
            <div className="flex">
              <input
                ref={numberInputRef}
                type="number"
                step="0.01"
                value={numberInput}
                onChange={(e) => setNumberInput(e.target.value)}
                placeholder="输入数字"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddNumber();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddNumber}
                className="px-3 py-2 bg-purple-100 text-purple-800 border border-purple-200 border-l-0 rounded-r-lg hover:bg-purple-200 transition-colors"
                disabled={!numberInput.trim() || isNaN(Number(numberInput.trim()))}
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 使用说明 - 可折叠 */}
      <details className="bg-blue-50 rounded-lg border border-blue-200">
        <summary className="p-3 cursor-pointer select-none font-medium text-blue-800 hover:bg-blue-100 transition-colors">
          💡 使用说明 (点击展开/收起)
        </summary>
        <div className="px-3 pb-3">
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• 选择数值或货币类型的字段参与计算</li>
            <li>• 使用操作符连接字段和数字，支持键盘快捷键</li>
            <li>• 可以添加括号改变运算优先级</li>
            <li>• 点击元素上的箭头可调整顺序</li>
            <li>• 示例计算基于假设数据（数值字段=10，货币字段=100）</li>
            <li>• 按 Esc 键快速清空所有元素</li>
          </ul>
        </div>
      </details>
    </div>
  );
} 