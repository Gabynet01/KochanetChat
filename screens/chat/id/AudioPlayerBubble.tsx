import { Typography } from "@/components/Typography";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Download, Pause, Play } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { AudioWaveform } from "./AudioWaveform";

interface AudioPlayerBubbleProps {
  uri?: string | null;
  localUri?: string | null;
  isSentByMe: boolean;
  colorPrimary: string;
  colorSecondary: string;
}

export const AudioPlayerBubble: React.FC<AudioPlayerBubbleProps> = ({
  uri,
  localUri,
  isSentByMe,
  colorPrimary,
  colorSecondary,
}) => {
  const activeUri = uri || localUri || "";
  const player = useAudioPlayer(activeUri);
  const status = useAudioPlayerStatus(player);

  const [hasTriggered, setHasTriggered] = useState(false);

  // Determine if we should show the download button
  // 1. Not sent by me
  // 2. No localUri (optimistic)
  // 3. Remote URL (starts with http)
  // 4. Hasn't been triggered yet
  const needsDownload =
    !isSentByMe && !localUri && activeUri.startsWith("http") && !hasTriggered;

  // Generate a consistent but "random" waveform based on the URI
  const waveformData = useMemo(() => {
    const bars = 25;
    const data = [];
    const seed = activeUri
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    for (let i = 0; i < bars; i++) {
      const val = 0.2 + Math.abs(Math.sin(seed + i * 0.5)) * 0.7;
      data.push(val);
    }
    return data;
  }, [activeUri]);

  const togglePlayback = () => {
    if (needsDownload) {
      setHasTriggered(true);
      player.play();
      return;
    }

    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={togglePlayback}
        style={[
          styles.playBtn,
          {
            backgroundColor: isSentByMe
              ? "rgba(255,255,255,0.2)"
              : colorSecondary,
          },
        ]}
      >
        {!status.isLoaded ? (
          <ActivityIndicator
            size="small"
            color={isSentByMe ? "#FFF" : colorPrimary}
          />
        ) : needsDownload ? (
          <TouchableOpacity onPress={togglePlayback}>
            <Download size={18} color={isSentByMe ? "#FFF" : colorPrimary} />
          </TouchableOpacity>
        ) : status.playing ? (
          <Pause
            size={18}
            color={isSentByMe ? "#FFF" : colorPrimary}
            fill={isSentByMe ? "#FFF" : colorPrimary}
          />
        ) : (
          <Play
            size={18}
            color={isSentByMe ? "#FFF" : colorPrimary}
            fill={isSentByMe ? "#FFF" : colorPrimary}
          />
        )}
      </TouchableOpacity>

      <AudioWaveform
        staticData={waveformData}
        height={24}
        color={isSentByMe ? "rgba(255,255,255,0.7)" : colorPrimary}
        style={styles.waveform}
      />

      <Typography
        variant="caption"
        style={[
          styles.duration,
          { color: isSentByMe ? "rgba(255,255,255,0.8)" : colorPrimary },
        ]}
      >
        {status.playing
          ? formatTime(status.currentTime)
          : formatTime(status.duration || 0)}
      </Typography>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    minWidth: 180,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  waveform: {
    flex: 1,
    marginHorizontal: 12,
  },
  duration: {
    fontSize: 11,
    minWidth: 32,
    textAlign: "right",
  },
});
