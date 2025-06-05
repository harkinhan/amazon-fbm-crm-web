// 店铺配置文件
// 这里定义了所有可用的店铺列表，管理员可以为用户分配这些店铺的访问权限

export const PREDEFINED_SHOPS = [
  // ===== 美国站点 (Amazon US) =====
  'Amazon US - Electronics Store',
  'Amazon US - Home & Kitchen',
  'Amazon US - Fashion & Beauty',
  'Amazon US - Sports & Outdoors',
  'Amazon US - Baby & Kids',
  'Amazon US - Health & Personal Care',
  'Amazon US - Automotive',
  'Amazon US - Books & Media',
  'Amazon US - Pet Supplies',
  'Amazon US - Garden & Tools',
  'Amazon US - Toys & Games',
  'Amazon US - Office Products',
  'Amazon US - Industrial & Scientific',

  // ===== 英国站点 (Amazon UK) =====
  'Amazon UK - Electronics Store',
  'Amazon UK - Home & Kitchen',
  'Amazon UK - Fashion & Beauty',
  'Amazon UK - Sports & Outdoors',
  'Amazon UK - Baby & Kids',
  'Amazon UK - Health & Personal Care',
  'Amazon UK - Automotive',
  'Amazon UK - Garden & Outdoors',

  // ===== 德国站点 (Amazon DE) =====
  'Amazon DE - Electronics Store',
  'Amazon DE - Home & Kitchen',
  'Amazon DE - Fashion & Beauty',
  'Amazon DE - Sports & Outdoors',
  'Amazon DE - Baby & Kids',
  'Amazon DE - Health & Personal Care',
  'Amazon DE - Automotive',

  // ===== 日本站点 (Amazon JP) =====
  'Amazon JP - Electronics Store',
  'Amazon JP - Home & Kitchen',
  'Amazon JP - Fashion & Beauty',
  'Amazon JP - Sports & Outdoors',
  'Amazon JP - Baby & Kids',
  'Amazon JP - Health & Personal Care',

  // ===== 加拿大站点 (Amazon CA) =====
  'Amazon CA - Electronics Store',
  'Amazon CA - Home & Kitchen',
  'Amazon CA - Fashion & Beauty',
  'Amazon CA - Sports & Outdoors',
  'Amazon CA - Baby & Kids',

  // ===== 法国站点 (Amazon FR) =====
  'Amazon FR - Electronics Store',
  'Amazon FR - Home & Kitchen',
  'Amazon FR - Fashion & Beauty',
  'Amazon FR - Sports & Outdoors',
  'Amazon FR - Baby & Kids',

  // ===== 意大利站点 (Amazon IT) =====
  'Amazon IT - Electronics Store',
  'Amazon IT - Home & Kitchen',
  'Amazon IT - Fashion & Beauty',
  'Amazon IT - Sports & Outdoors',

  // ===== 西班牙站点 (Amazon ES) =====
  'Amazon ES - Electronics Store',
  'Amazon ES - Home & Kitchen',
  'Amazon ES - Fashion & Beauty',
  'Amazon ES - Sports & Outdoors',

  // ===== 澳大利亚站点 (Amazon AU) =====
  'Amazon AU - Electronics Store',
  'Amazon AU - Home & Kitchen',
  'Amazon AU - Fashion & Beauty',
  'Amazon AU - Sports & Outdoors',

  // ===== 荷兰站点 (Amazon NL) =====
  'Amazon NL - Electronics Store',
  'Amazon NL - Home & Kitchen',
  'Amazon NL - Fashion & Beauty',

  // ===== 瑞典站点 (Amazon SE) =====
  'Amazon SE - Electronics Store',
  'Amazon SE - Home & Kitchen',
  'Amazon SE - Fashion & Beauty',

  // ===== 墨西哥站点 (Amazon MX) =====
  'Amazon MX - Electronics Store',
  'Amazon MX - Home & Kitchen',
  'Amazon MX - Fashion & Beauty',

  // ===== 巴西站点 (Amazon BR) =====
  'Amazon BR - Electronics Store',
  'Amazon BR - Home & Kitchen',
  'Amazon BR - Fashion & Beauty',

  // ===== 印度站点 (Amazon IN) =====
  'Amazon IN - Electronics Store',
  'Amazon IN - Home & Kitchen',
  'Amazon IN - Fashion & Beauty',

  // ===== 新加坡站点 (Amazon SG) =====
  'Amazon SG - Electronics Store',
  'Amazon SG - Home & Kitchen',
  'Amazon SG - Fashion & Beauty',

  // ===== 阿联酋站点 (Amazon AE) =====
  'Amazon AE - Electronics Store',
  'Amazon AE - Home & Kitchen',
  'Amazon AE - Fashion & Beauty',

  // ===== 测试和演示店铺 =====
  'Test Shop - Development',
  'Demo Shop - Training',
  'Sample Store - Testing',
];

// 按地区分组的店铺配置
export const SHOPS_BY_REGION = {
  'North America': [
    'Amazon US - Electronics Store',
    'Amazon US - Home & Kitchen',
    'Amazon US - Fashion & Beauty',
    'Amazon CA - Electronics Store',
    'Amazon CA - Home & Kitchen',
    'Amazon CA - Fashion & Beauty',
    'Amazon MX - Electronics Store',
    'Amazon MX - Home & Kitchen',
  ],
  'Europe': [
    'Amazon UK - Electronics Store',
    'Amazon UK - Home & Kitchen',
    'Amazon DE - Electronics Store',
    'Amazon DE - Home & Kitchen',
    'Amazon FR - Electronics Store',
    'Amazon FR - Home & Kitchen',
    'Amazon IT - Electronics Store',
    'Amazon IT - Home & Kitchen',
    'Amazon ES - Electronics Store',
    'Amazon ES - Home & Kitchen',
    'Amazon NL - Electronics Store',
    'Amazon NL - Home & Kitchen',
    'Amazon SE - Electronics Store',
    'Amazon SE - Home & Kitchen',
  ],
  'Asia Pacific': [
    'Amazon JP - Electronics Store',
    'Amazon JP - Home & Kitchen',
    'Amazon AU - Electronics Store',
    'Amazon AU - Home & Kitchen',
    'Amazon IN - Electronics Store',
    'Amazon IN - Home & Kitchen',
    'Amazon SG - Electronics Store',
    'Amazon SG - Home & Kitchen',
  ],
  'Middle East & Africa': [
    'Amazon AE - Electronics Store',
    'Amazon AE - Home & Kitchen',
  ],
  'South America': [
    'Amazon BR - Electronics Store',
    'Amazon BR - Home & Kitchen',
  ],
  'Testing': [
    'Test Shop - Development',
    'Demo Shop - Training',
    'Sample Store - Testing',
  ]
};

// 店铺类别配置
export const SHOP_CATEGORIES = [
  'Electronics Store',
  'Home & Kitchen',
  'Fashion & Beauty',
  'Sports & Outdoors',
  'Baby & Kids',
  'Health & Personal Care',
  'Automotive',
  'Books & Media',
  'Pet Supplies',
  'Garden & Tools',
  'Toys & Games',
  'Office Products',
  'Industrial & Scientific'
];

// 获取所有店铺列表
export const getAllShops = (): string[] => {
  return PREDEFINED_SHOPS.sort();
};

// 根据地区获取店铺
export const getShopsByRegion = (region: string): string[] => {
  return SHOPS_BY_REGION[region as keyof typeof SHOPS_BY_REGION] || [];
};

// 根据类别获取店铺
export const getShopsByCategory = (category: string): string[] => {
  return PREDEFINED_SHOPS.filter(shop => shop.includes(category));
}; 