import js from "@eslint/js";
import globals from "globals";

export default [
    {
        ignores: ["node_modules/", "dist/", "build/", "coverage/"], // 👈 moved here
    },
    js.configs.recommended,
    {
        files: ["**/*.js"],
        languageOptions: {
            globals: { ...globals.node },
            ecmaVersion: "latest",
            sourceType: "module",
        },
        rules: {
            "no-unused-vars": "warn",
            "no-console": "off",
            "no-undef": "error",
        },
    },
];