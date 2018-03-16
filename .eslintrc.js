const { rules: tslintRulesRecommended } = require('tslint/lib/configs/recommended');
const tslintRules = Object.assign({}, tslintRulesRecommended, {
    "member-access": false,
    "ordered-imports": false,
    "quotemark": false,
    "no-var-keyword": false,
    "object-literal-sort-keys": false,
    "no-console": false,
    "arrow-parens": false,
    "max-line-length": false,
    "object-literal-key-quotes": false,
    "no-shadowed-variable": false,
    "only-arrow-functions": false,
    "no-var-requires": false,
    "semicolon": false,
    "no-empty": false,
    "interface-over-type-literal": false,
    "no-debugger": false,
    "trailing-comma": false,
    "whitespace": false,
    "no-angle-bracket-type-assertion": false,
    "align": false,
    "no-unused-expression": false,
});

module.exports = {
    "env": {
        "browser": true,
        "commonjs": true,
        "es6": true,
        "node": true
    },
    "parser": "typescript-eslint-parser",
    "parserOptions": {
        "ecmaFeatures": {
            "experimentalObjectRestSpread": true,
            "jsx": true
        },
        "sourceType": "module"
    },
    "extends": [
        "eslint:recommended",
        "plugin:unicorn/recommended",
    ],
    "plugins": [
        "unicorn",
        "import",
        "tslint",
    ],
    "rules": {
        "tslint/config": [1, {
            rules: tslintRules,
            rulesDirectory: ["node_modules/tslint/lib/rules"],
        }],
        "no-undef": 0,
        "no-unused-vars": 0,
        "no-console": 1,
        "prefer-destructuring": 1,
        "no-unused-expressions": 1,
        "indent": 0,
        "unicorn/import-index": 0,
        "import/newline-after-import": 0,
        "import/no-duplicates": 1,
        "import/max-dependencies": [1, { "max": 10 }],
        "quotes": [1, "single", { "allowTemplateLiterals": true }],
        "semi": [1, "always"],
        "react/prop-types": 0,
    }
};
