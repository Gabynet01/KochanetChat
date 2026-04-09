/**
 * Metro’s first Android bundle is much slower with `reactCompiler` on large apps.
 * Android dev scripts set EXPO_FAST_METRO=1 to skip it locally; omit for full compiler.
 */
module.exports = ({ config }) => {
  const fast = process.env.EXPO_FAST_METRO === "1";
  return {
    ...config,
    experiments: {
      ...config.experiments,
      reactCompiler: fast ? false : config.experiments?.reactCompiler,
    },
  };
};
