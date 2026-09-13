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

// 同族色阶：绿系四档（金额越大越深）+ 琥珀 + 灰，避免类别多时变成"彩虹图"
const PIE_COLORS = ['#059657', '#07C160', '#54DE8F', '#A5EFC8', '#FFB020', '#BDBDBD'];

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

  const angles = visible.reduce<{ start: number; end: number }[]>((acc, d) => {
    const start = acc.length > 0 ? acc[acc.length - 1].end : -Math.PI / 2;
    const end = start + (d.value / total) * Math.PI * 2;
    acc.push({ start, end });
    return acc;
  }, []);

  const slices = visible.map((d, i) => {
    const { start: startAngle, end: endAngle } = angles[i];
    const percentage = d.value / total;
    const angle = endAngle - startAngle;

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
          // 只在前四档（深色系）上显示百分比标签，浅绿底上白字看不清
          if (s.percentage < 0.05 || i % 6 >= 4) return null;
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
          y={cy - 8}
          fill={colors.textPrimary}
          fontSize={15}
          fontWeight="700"
          textAnchor="middle"
          alignmentBaseline="central"
        >
          {maxSlice.label}
        </SvgText>
        <SvgText
          x={cx}
          y={cy + 16}
          fill={colors.textHint}
          fontSize={20}
          fontWeight="700"
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
