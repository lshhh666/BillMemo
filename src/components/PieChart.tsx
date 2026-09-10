import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { G, Path, Circle, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

interface Slice {
  label: string;
  value: number;
}

interface Props {
  data: Slice[];
  size?: number;
  innerRadius?: number;
}

const PIE_COLORS = [
  '#FF6B6B', '#FFA94D', '#FFD43B', '#69DB7C',
  '#4DABF7', '#DA77F2', '#FF8787', '#74C0FC',
  '#63E6BE', '#FCC419', '#845EF7', '#20C997',
];

export function PieChart({ data, size = 200, innerRadius = 0.55 }: Props) {
  const { colors } = useTheme();
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <Text style={[styles.empty, { color: colors.textHint }]}>暂无数据</Text>
      </View>
    );
  }

  const radius = size / 2;
  const inner = radius * innerRadius;
  const cx = radius;
  const cy = radius;

  const visible = data.filter((d) => d.value > 0);
  // 只有一个分类占 100% 时扇形起止点重合，SVG arc 会画成空，需单独用整圆绘制
  const isFullCircle = visible.length === 1;

  let currentAngle = -Math.PI / 2;

  const slices = visible.map((d, i) => {
    const percentage = d.value / total;
    const angle = percentage * Math.PI * 2;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);

    const largeArc = angle > Math.PI ? 1 : 0;

    const pathData = [
      `M ${cx + inner * Math.cos(startAngle)} ${cy + inner * Math.sin(startAngle)}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${cx + inner * Math.cos(endAngle)} ${cy + inner * Math.sin(endAngle)}`,
      `A ${inner} ${inner} 0 ${largeArc} 0 ${cx + inner * Math.cos(startAngle)} ${cy + inner * Math.sin(startAngle)}`,
      'Z',
    ].join(' ');

    // 标签位置（扇形中间）
    const midAngle = startAngle + angle / 2;
    const labelR = (radius + inner) / 2;
    const lx = cx + labelR * Math.cos(midAngle);
    const ly = cy + labelR * Math.sin(midAngle);

    return { pathData, lx, ly, percentage, label: d.label, color: PIE_COLORS[i % PIE_COLORS.length] };
  });

  // 中心文字
  const maxSlice = data.reduce((a, b) => (a.value > b.value ? a : b));
  const maxPct = total > 0 ? ((maxSlice.value / total) * 100).toFixed(0) : '0';

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G>
          {isFullCircle ? (
            <>
              <Circle cx={cx} cy={cy} r={radius} fill={slices[0].color} />
              <Circle cx={cx} cy={cy} r={inner} fill={colors.surface} />
            </>
          ) : (
            slices.map((s, i) => <Path key={i} d={s.pathData} fill={s.color} />)
          )}
        </G>
        {slices.map((s, i) => {
          if (s.percentage < 0.05) return null;
          return (
            <SvgText
              key={`t${i}`}
              x={s.lx}
              y={s.ly}
              fill="#fff"
              fontSize={10}
              fontWeight="600"
              textAnchor="middle"
              alignmentBaseline="central"
            >
              {`${(s.percentage * 100).toFixed(0)}%`}
            </SvgText>
          );
        })}
        <SvgText
          x={cx}
          y={cy - 6}
          fill={colors.textPrimary}
          fontSize={13}
          fontWeight="700"
          textAnchor="middle"
          alignmentBaseline="central"
        >
          {maxSlice.label}
        </SvgText>
        <SvgText
          x={cx}
          y={cy + 14}
          fill={colors.textHint}
          fontSize={16}
          fontWeight="600"
          textAnchor="middle"
          alignmentBaseline="central"
        >
          {maxPct}%
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  empty: {
    fontSize: 14,
  },
});

export { PIE_COLORS };
