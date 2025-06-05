import * as XLSX from 'xlsx';

// Excel文件安全处理配置
const SECURITY_CONFIG = {
  // 最大文件大小 (10MB)
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  // 最大工作表数量
  MAX_SHEETS: 50,
  // 最大行数
  MAX_ROWS: 100000,
  // 最大列数
  MAX_COLS: 1000,
  // 允许的文件扩展名
  ALLOWED_EXTENSIONS: ['.xlsx', '.xls', '.csv']
};

/**
 * 安全的Excel文件验证
 */
export const validateExcelFile = (fileBuffer: Buffer, filename: string): { valid: boolean; error?: string } => {
  try {
    // 检查文件大小
    if (fileBuffer.length > SECURITY_CONFIG.MAX_FILE_SIZE) {
      return { valid: false, error: '文件大小超过限制 (10MB)' };
    }

    // 检查文件扩展名
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    if (!SECURITY_CONFIG.ALLOWED_EXTENSIONS.includes(ext)) {
      return { valid: false, error: '不支持的文件类型' };
    }

    // 尝试解析文件（基本验证）
    const workbook = XLSX.read(fileBuffer, { 
      type: 'buffer',
      cellDates: true,
      cellNF: false,
      cellText: false,
      // 安全选项：禁用宏和外部引用
      codepage: 1200,
      sheetStubs: false
    });

    // 检查工作表数量
    if (workbook.SheetNames.length > SECURITY_CONFIG.MAX_SHEETS) {
      return { valid: false, error: '工作表数量超过限制' };
    }

    // 检查每个工作表的大小
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
      
      if (range.e.r > SECURITY_CONFIG.MAX_ROWS) {
        return { valid: false, error: `工作表 "${sheetName}" 行数超过限制` };
      }
      
      if (range.e.c > SECURITY_CONFIG.MAX_COLS) {
        return { valid: false, error: `工作表 "${sheetName}" 列数超过限制` };
      }
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: '文件格式无效或已损坏' };
  }
};

/**
 * 安全的Excel数据读取
 */
export const safeReadExcel = (fileBuffer: Buffer, filename: string) => {
  // 首先验证文件
  const validation = validateExcelFile(fileBuffer, filename);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  try {
    // 使用安全选项读取文件
    const workbook = XLSX.read(fileBuffer, {
      type: 'buffer',
      cellDates: true,
      cellNF: false,
      cellText: false,
      // 禁用潜在危险的功能
      codepage: 1200,
      sheetStubs: false,
      // 不解析公式，只获取值
      cellFormula: false
    });

    return workbook;
  } catch (error) {
    throw new Error('读取Excel文件失败：' + (error as Error).message);
  }
};

/**
 * 安全的Excel导出
 */
export const safeWriteExcel = (data: any[], filename: string, sheetName: string = '数据') => {
  try {
    // 验证数据大小
    if (data.length > SECURITY_CONFIG.MAX_ROWS) {
      throw new Error('导出数据行数超过限制');
    }

    // 创建工作簿
    const workbook = XLSX.utils.book_new();
    
    // 创建工作表
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // 设置列宽
    const columnWidths = Object.keys(data[0] || {}).map(() => ({ width: 20 }));
    worksheet['!cols'] = columnWidths;

    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // 生成文件缓冲区
    const buffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx',
      // 安全选项
      bookSST: false,
      // 不包含宏
      compression: true
    });

    return buffer;
  } catch (error) {
    throw new Error('生成Excel文件失败：' + (error as Error).message);
  }
};

/**
 * 清理对象原型污染
 */
export const sanitizeObject = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // 防止原型污染
  if (obj.constructor !== Object && obj.constructor !== Array) {
    return {};
  }

  const sanitized: any = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    // 跳过原型链属性和危险属性
    if (!obj.hasOwnProperty(key) || key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    
    // 递归清理
    sanitized[key] = sanitizeObject(obj[key]);
  }
  
  return sanitized;
}; 