module.exports = function (api) {
    api.cache(true);
    return {
        presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
        plugins: [
            [
                'module-resolver',
                {
                    alias: {
                        '@app': './src',
                        '@core': './src/core',
                        '@features': './src/features',
                        '@services': './src/services',
                        '@shared': './src/shared',
                    },
                },
            ],
        ],
    };
};
