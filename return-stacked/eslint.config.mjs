import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
});

const eslintConfig = [
    ...compat.extends('next/core-web-vitals', 'next/typescript'),
    {
        rules: {
            'no-unused-vars': 'off',
            curly: ['error', 'all'],
            'nonblock-statement-body-position': ['error', 'below'],
            'no-duplicate-imports': 'error',
            eqeqeq: ['error', 'always'],
            'react/react-in-jsx-scope': 'off',
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/explicit-function-return-type': 'error',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    ignoreRestSiblings: true,
                    args: 'after-used',
                    caughtErrors: 'none',
                },
            ],
        },
    },
];

export default eslintConfig;
