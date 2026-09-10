import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

interface Bar {
  label: string;
  value: number;
  color?: string;
}

interface Props {
  data: { income: Bar[]; expense: Bar[] };
  width: number;
  height?: number;
}

export function BarChart({ data, width, height = 180 }: Props) {
  const { colors } = useTheme();
  const allValues = [...data.income.map((d) => d.value), ...data.expense.map((d) => d.value)];
  const maxVal = Math.max(...allValues, 1);
  const barCount = Math.max(data.income.length, data.expense.length);
  const chartW = width - 48;
  const chartH = height - 40;
  const barWidth = Math.max((chartW / barCount - 12) / 2, 8);

  return (
    <View style={[styles.container, { height, backgroundColor: colors.surface }]}>
      <Svg width={width} height={height}>
        <G x={40} y={0}>
          {/* 网格线 */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = chartH - pct * chartH + 8;
            const val = (maxVal * pct).toFixed(0);
            return (
              <G key={pct}>
                <Line
                  x1={0} y1={y} x2={chartW} y2={y}
                  stroke={colors.border} strokeWidth={1}
                />
                <SvgText
                  x={-6} y={y + 4}
                  fill={colors.textHint} fontSize={9}
                  textAnchor="end"
                >
                  {val}
                </SvgText>
              </G>
            );
          })}

          {/* 柱状图 */}
          {data.expense.map((d, i) => {
            const x = i * (chartW / barCount) + 4;
            const h = (d.value / maxVal) * chartH;
            const y = chartH - h + 8;
            return (
              <Rect
                key={`e${i}`}
                x={x} y={y}
                width={barWidth} height={h}
                rx={3} ry={3}
                fill={colors.expense}
              />
            );
          })}

          {data.income.map((d, i) => {
            const x = i * (chartW / barCount) + barWidth + 6;
            const h = (d.value / maxVal) * chartH;
            const y = chartH - h + 8;
            return (
              <Rect
                key={`i${i}`}
                x={x} y={y}
                width={barWidth} height={h}
                rx={3} ry={3}
                fill={colors.income}
              />
            );
          })}

          {/* 底部标签 */}
          {data.expense.map((d, i) => (
            <SvgText
              key={`l${i}`}
              x={i * (chartW / barCount) + barWidth + 4}
              y={chartH + 28}
              fill={colors.textHint}
              fontSize={9}
              textAnchor="middle"
            >
              {d.label}
            </SvgText>
          ))}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
  },
});
