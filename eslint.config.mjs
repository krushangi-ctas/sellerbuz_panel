// ESLint Flat Config (ESM) for Angular 21 + TypeScript 5.9
// See: https://angular-eslint.dev/ and https://eslint.org/docs/latest/use/configure/configuration-files-new

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';

export default tseslint.config(
    {
        files: ['src/**/*.ts'],
        extends: [
            js.configs.recommended,
            ...tseslint.configs.recommended,
            ...angular.configs.tsRecommended,
        ],
        processor: angular.processInlineTemplates,
        languageOptions: {
            parserOptions: {
                project: ['./tsconfig.json'],
            },
        },
        rules: {
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/no-unused-expressions': 'off',
            '@typescript-eslint/no-empty-object-type': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            '@angular-eslint/component-selector': 'off',
            '@angular-eslint/no-empty-lifecycle-method': 'off',
            '@angular-eslint/directive-selector': 'off',
            '@angular-eslint/prefer-inject': 'off',
            '@angular-eslint/prefer-standalone': 'off',
            'no-empty': 'off',
            'no-prototype-builtins': 'off',
            'no-useless-escape': 'off',
        },
    },
    {
        files: ['src/**/*.html'],
        extends: [
            ...angular.configs.templateRecommended,
            ...angular.configs.templateAccessibility,
        ],
        rules: {
            '@angular-eslint/template/alt-text': 'off',
            '@angular-eslint/template/click-events-have-key-events': 'off',
            '@angular-eslint/template/elements-content': 'off',
            '@angular-eslint/template/interactive-supports-focus': 'off',
            '@angular-eslint/template/label-has-associated-control': 'off',
            '@angular-eslint/template/prefer-control-flow': 'off',
        },
    }
);
