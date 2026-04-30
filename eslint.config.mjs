import next from "eslint-config-next";
import { allmeIgnores } from "./config/eslint/shared.mjs";

const config = [
  ...next,
  {
    ignores: allmeIgnores,
  },
];

export default config;
