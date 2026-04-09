import React, { useEffect, useMemo } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import Svg, { Rect } from "react-native-svg";

const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface AudioWaveformProps {
  metering?: number; // -160 to 0 (db)
  staticData?: number[]; // Array of normalized values (0 to 1)
  isRecording?: boolean;
  color?: string;
  barWidth?: number;
  gap?: number;
  height?: number;
  style?: ViewStyle;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  metering = -160,
  staticData,
  isRecording = false,
  color = "#3B82F6",
  barWidth = 3,
  gap = 2,
  height = 40,
  style,
}) => {
  const barCount = 30;

  // Normalize metering to 0.1 - 1.0 range
  const normalizedValue = useMemo(() => {
    if (!isRecording) return 0.1;
    // metering is db, -160 is silent, 0 is max
    const val = Math.max(0.1, (metering + 160) / 160);
    return val;
  }, [metering, isRecording]);

  // For static playback, we generate a fixed set of bars
  const bars = useMemo(() => {
    if (staticData) return staticData;
    // Default empty bars
    return Array(barCount).fill(0.2);
  }, [staticData]);

  return (
    <View style={[styles.container, { height }, style]}>
      <Svg height={height} width={(barWidth + gap) * barCount}>
        {bars.map((val, i) => (
          <WaveBar
            key={i}
            index={i}
            activeValue={normalizedValue}
            staticValue={val}
            isRecording={isRecording}
            barWidth={barWidth}
            gap={gap}
            maxHeight={height}
            color={color}
          />
        ))}
      </Svg>
    </View>
  );
};

interface BarProps {
  index: number;
  activeValue: number;
  staticValue: number;
  isRecording: boolean;
  barWidth: number;
  gap: number;
  maxHeight: number;
  color: string;
}

const WaveBar: React.FC<BarProps> = ({
  index,
  activeValue,
  staticValue,
  isRecording,
  barWidth,
  gap,
  maxHeight,
  color,
}) => {
  const height = useSharedValue(isRecording ? 4 : staticValue * maxHeight);

  // If recording, we animate the last few bars or shift them
  // For simplicity here, we'll just have them all react to 'activeValue' with some randomness/delay
  useEffect(() => {
    if (isRecording) {
      const targetHeight = Math.max(
        4,
        activeValue * maxHeight * (0.5 + Math.random() * 0.5),
      );
      height.value = withSpring(targetHeight, { damping: 15, stiffness: 100 });
    }
  }, [activeValue, isRecording, maxHeight, height]);

  const animatedProps = useAnimatedProps(() => ({
    height: height.value,
    y: (maxHeight - height.value) / 2,
  }));

  return (
    <AnimatedRect
      x={index * (barWidth + gap)}
      width={barWidth}
      rx={barWidth / 2}
      fill={color}
      animatedProps={animatedProps}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
});
