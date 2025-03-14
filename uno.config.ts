// unocss.config.ts
import { presetWind } from "@unocss/preset-wind3";
import { defineConfig, presetIcons } from "unocss";
import presetAnimations from "unocss-preset-animations";

export default defineConfig({
  presets: [
    presetWind(),
    presetIcons(),
    presetAnimations(),
  ],
});