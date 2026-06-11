/**
 * Config plugin: in this npm-workspaces monorepo, Metro's project root is the
 * workspace root, so the Android release bundler (`expo export:embed`) must use
 * the workspace root too. Point Gradle's `react { root }` there so the JS entry
 * relativizes to `apps/native/index.js` (otherwise `./index.js` fails to resolve
 * from the monorepo root). Keeps `expo prebuild` reproducible.
 */
const { withAppBuildGradle } = require("@expo/config-plugins");

const ROOT_LINE = 'root = file("../../../../")';

module.exports = function withMonorepoGradleRoot(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== "groovy") return cfg;
    if (cfg.modResults.contents.includes(ROOT_LINE)) return cfg;
    cfg.modResults.contents = cfg.modResults.contents.replace(/react\s*\{/, `react {\n    ${ROOT_LINE}`);
    return cfg;
  });
};
