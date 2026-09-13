import type { ImageRequireSource } from 'react-native';

/**
 * 分类名 → 品牌线条图标的映射。
 * 数据库里 categories.icon 仍存 emoji（保持旧备份兼容），界面渲染优先用这里的图标，
 * 没有映射的分类（未来自定义分类）回退到数据库里的 emoji。
 */
const ICONS: Record<string, ImageRequireSource> = {
  餐饮: require('../../assets/categories/food.png'),
  交通: require('../../assets/categories/transport.png'),
  购物: require('../../assets/categories/shopping.png'),
  娱乐: require('../../assets/categories/entertainment.png'),
  居住: require('../../assets/categories/housing.png'),
  医疗: require('../../assets/categories/medical.png'),
  其他: require('../../assets/categories/other.png'),
  工资: require('../../assets/categories/salary.png'),
  兼职: require('../../assets/categories/freelance.png'),
  理财: require('../../assets/categories/investment.png'),
};

export function categoryIconSource(name: string): ImageRequireSource | null {
  return ICONS[name] ?? null;
}
