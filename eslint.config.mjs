import globals from "globals";
import js from "@eslint/js";
import ts from "typescript-eslint";
import next from "@next/eslint-plugin-next";
import react from "eslint-plugin-react";
import hooks from "eslint-plugin-react-hooks";
import a11y from "eslint-plugin-jsx-a11y";

export default [
    {
        ignores: [
            "node_modules/",
            ".next/",
            "public/",
            "coverage/",
            "dist/",
        ],
    },
    js.configs.recommended,
    ...ts.configs.recommended,
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
    },
    {
        files: ["**/*.{js,jsx,ts,tsx}"],
        plugins: {
            react,
            "react-hooks": hooks,
            "@next/next": next,
            "jsx-a11y": a11y,
        },
        rules: {
            ...react.configs.recommended.rules,
            ...hooks.configs.recommended.rules,
            ...next.configs.recommended.rules,
            ...next.configs["core-web-vitals"].rules,
            ...a11y.configs.recommended.rules,
            "react/react-in-jsx-scope": "off",
        },
        settings: {
            react: {
                version: "detect",
            },
        },
    },
];