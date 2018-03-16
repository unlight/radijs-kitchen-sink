/// <reference types="node" />
import * as fs from 'fs';
import * as Path from 'path';
import { loader } from 'webpack-loader-helper';
import pick = require('1-liners/pick');
const ContextReplacementPlugin = require('webpack/lib/ContextReplacementPlugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const pkg = require('./package.json');
const toBoolean = require('to-boolean');

const sourcePath = Path.join(__dirname, 'src');
const buildPath = Path.join(__dirname, 'dist');
const context = __dirname;

process['traceDeprecation'] = false;

const defaultOptions = {
    libs: process.argv.indexOf('--env.libs') !== -1,
    style: process.argv.indexOf('--env.style') !== -1,
    test: false,
    coverage: false,
    prod: process.argv.indexOf('-p') !== -1 || process.argv.indexOf('--env.prod') !== -1,
    get dev(): boolean {
        return !this.prod;
    },
    get hmr(): boolean {
        return this.dev;
    },
    get minimize(): boolean {
        return (process.argv.indexOf('--env.nomin') !== -1) ? false : this.prod;
    },
    get devtool(): string {
        return ('webpack_devtool' in process.env) ? process.env.webpack_devtool : 'cheap-source-map';
    },
    get mode() {
        return (this.prod) ? 'production' : 'development'
    }
};

type Options = Partial<Record<keyof typeof defaultOptions, boolean | string>>;

export = (options: Options = {}) => {
    options = { ...defaultOptions, ...options };
    Object.keys(options).forEach(key => {
        const value = options[key];
        (value === true) ? process.stdout.write(`${key} `) : (value ? process.stdout.write(`${key}:${value} `) : null);
    });
    let stats: any = {
        version: false,
        maxModules: 0,
        children: false,
    };
    const watchOptions = {
        ignored: /node_modules/,
    };
    const packageToTranspile = [
        'pupa',
        'njct',
        ['1-liners', 'module'].join(Path.sep),
    ];
    const postPlugins = [
        require('autoprefixer')({ browsers: 'last 3 versions' }),
    ];
    let config: any = {
        mode: options.mode,
        context: context,
        entry: {
            app: './src/main.tsx',
            libs: (() => {
                let dependencies = Object.keys(pkg.dependencies);
                return [
                    ...dependencies,
                    // 'react-eventmanager/lib/EventManager',
                    // 'es6-eventemitter/lib/EventEmitter',
                    'tslib/tslib.es6.js',
                    'webpack-dev-server/client',
                    'webpack/hot/emitter',
                    'webpack/hot/log-apply-result',
                    // 'webpack/hot/dev-server', // DONT! It will break HMR
                    'react-hot-loader/patch',
                    'events',
                    'base64-js',
                    'buffer',
                    'ieee754',
                    'css-loader/lib/css-base',
                    'style-loader/lib/addStyles',
                    'style-loader/lib/urls',
                ];
            })(),
            style: './src/style.css',
        },
        output: {
            path: buildPath,
            publicPath: '',
            chunkFilename: (() => {
                if (options.prod) return '[name]-[hash:6].js';
                return '[name].js';
            })(),
            filename: (() => {
                if (options.prod) return '[name]-[hash:6].js';
                return '[name].js';
            })(),
        },
        devtool: (() => {
            if (options.test) return 'inline-source-map';
            if (options.prod) return 'source-map';
            return ('webpack_devtool' in process.env) ? process.env.webpack_devtool : 'cheap-source-map';
        })(),
        devServer: {
            https: false,
            overlay: true,
            noInfo: false,
            contentBase: [sourcePath, buildPath],
            port: 8099,
            historyApiFallback: true,
            hot: true,
            inline: true,
            disableHostCheck: true,
            stats: stats,
            // stats: { reasons: true, maxModules: 10000 },
            watchOptions: watchOptions,
        },
        stats: stats,
        node: {
            // workaround for webpack-dev-server issue
            // https://github.com/webpack/webpack-dev-server/issues/60#issuecomment-103411179
            fs: 'empty',
            net: 'empty',
            buffer: 'empty',
            Buffer: false,
            setimmediate: false,
        },
        target: 'web',
        resolve: {
            extensions: ['.tsx', '.ts', '.js'],
            modules: ['node_modules'],
        },
        watchOptions: watchOptions,
        module: {
            exprContextCritical: false,
            rules: [
                { parser: { amd: false } },
                {
                    test: function transpileTypeScript(file: string) {
                        if (file.slice(-4) === '.tsx') return true;
                        if (file.slice(-3) === '.ts') return true;
                        const result = packageToTranspile.find((name: string) => file.indexOf(`node_modules${Path.sep}${name}`) !== -1);
                        return Boolean(result);
                    },
                    use: (() => {
                        let tsOptions = { transpileOnly: true };
                        if (options.prod) {
                            tsOptions['target'] = 'es5';
                        }
                        let ts = loader('ts', tsOptions);
                        const result: any[] = [ts];
                        return result;
                    })(),
                },
                {
                    test: /index\.ejs$/,
                    use: [loader('ejs')],
                },
                {
                    test: /\.css$/,
                    use: [loader('css', { sourceMap: true, minimize: options.minimize })],
                },
                {
                    test: /\.scss$/,
                    use: (() => {
                        let use: any[] = [
                            loader('css', { importLoaders: 2, sourceMap: false, minimize: options.minimize }),
                            loader('postcss', { plugins: postPlugins, sourceMap: false }),
                            loader('sass', { sourceMap: false, includePaths: ['node_modules/@blueprint/core/src'] }),
                        ];
                        if (options.prod && !options.style) {
                            use = ExtractTextPlugin.extract({ use });
                        }
                        if (!options.style) {
                            use.unshift(loader('style', { sourceMap: false }));
                        }
                        return use;
                    })(),
                },
                {
                    test: /\.(woff|woff2|eot|ttf|png|svg)$/,
                    use: [loader('file', { name: `i/[name]${options.prod ? '-[hash:6]' : ''}.[ext]` })],
                },
            ],
        },
        plugins: (() => {
            const WatchIgnorePlugin = require('webpack/lib/WatchIgnorePlugin');
            const result: any[] = [
                new WatchIgnorePlugin([
                    /node_modules/
                ]),
            ];
            if (options.hmr) {
                const NamedModulesPlugin = require('webpack/lib/NamedModulesPlugin');
                result.push(new NamedModulesPlugin());
            }
            if (!options.test) {
                const HtmlWebpackPlugin = require('html-webpack-plugin');
                result.push(new HtmlWebpackPlugin({
                    template: './src/index.ejs',
                    minify: false,
                    excludeChunks: [],
                    config: options,
                }));
            }
            if (options.minimize) {
                const UglifyJsPlugin = require('webpack/lib/optimize/UglifyJsPlugin');
                result.push(new UglifyJsPlugin({ sourceMap: true, comments: false }));
            }
            if (options.prod) {
                const ModuleConcatenationPlugin = require('webpack/lib/optimize/ModuleConcatenationPlugin');
                // const CopyWebpackPlugin = require('copy-webpack-plugin');
                const LoaderOptionsPlugin = require('webpack/lib/LoaderOptionsPlugin');
                const DefinePlugin = require('webpack/lib/DefinePlugin');
                result.push(
                    new DefinePlugin({
                        'process.env.NODE_ENV': JSON.stringify('production'),
                    }),
                    new ModuleConcatenationPlugin(),
                    new LoaderOptionsPlugin({
                        minimize: options.minimize,
                        debug: false,
                        options: { context }
                    }),
                );
            }
            if (options.prod) {
                result.push(
                    new ExtractTextPlugin({
                        filename: (get) => get('[name]-[contenthash:6].css')
                    })
                );
            }

            const envName = ('env_name' in process.env) ? process.env.env_name : undefined;
            const environmentFile = `src/environment.${envName}.ts`;
            if (options.dev && !options.test && envName && fs.existsSync(environmentFile)) {
                process.stdout.write(`environment: ${envName} `);
                const NormalModuleReplacementPlugin = require('webpack/lib/NormalModuleReplacementPlugin');
                result.push(
                    new NormalModuleReplacementPlugin(
                        /src.environment\.ts$/,
                        result => {
                            result.resource = Path.resolve(environmentFile);
                        }
                    )
                );
            }

            const CircularDependencyPlugin = require('circular-dependency-plugin');
            result.push(
                new CircularDependencyPlugin({
                    exclude: /node_modules/,
                    failOnError: true,
                })
            );

            return result;
        })()
    };

    // Make config for libs build.
    if (options.libs) {
        const DllPlugin = require('webpack/lib/DllPlugin');
        config = {
            ...config,
            ... {
                entry: pick(['libs'], config.entry), // check name near DllReferencePlugin
                devtool: 'source-map',
                output: {
                    path: buildPath,
                    filename: '[name].js',
                    library: '[name]',
                },
                plugins: [
                    new DllPlugin({
                        name: '[name]',
                        path: `${buildPath}/[name].json`
                    }),
                ]
            }
        };
        // For libs, pick only necessary rules.
        config.module.rules = config.module.rules
            .filter(rule => {
                if (rule.test && rule.test.name === 'transpileTypeScript') return true;
                else if ('parser' in rule) return true;
                return false;
            });
    } else if (options.style) {
        // Make config for style build.
        config = {
            ...config,
            ...{
                entry: pick(['style'], config.entry),
                plugins: [
                    new ExtractTextPlugin(`[name]${options.prod ? '-[contenthash:6]' : ''}.css`),
                    // Duck typed plugin, removes dummy.js after extract text plugin.
                    {
                        apply(compiler) {
                            compiler.hooks.emit.tap('webpack.config.ts', (compilation) => {
                                delete compilation.assets['dummy.js'];
                                delete compilation.assets['dummy.js.map'];
                            });
                        }
                    }
                ]
            }
        };
        const styleAssetsRule = config.module.rules.find(r => String(r.test) === '/\\.(woff|woff2|eot|ttf|png|svg)$/');
        const { use: styleLoaders } = config.module.rules.find(r => String(r.test) === '/\\.scss$/');
        config.module.rules = [
            styleAssetsRule,
            { test: /\.scss$/, use: ExtractTextPlugin.extract({ use: styleLoaders }) },
        ];
        config.output.filename = `dummy.js`;
        config.stats.assets = false;
        config.stats.maxModules = 10;
    } else {
        // Make config for app build.
        config.entry = pick(['app'], config.entry);
        if (options.test) {
            config.entry = false;
        }
        if (options.dev && !options.coverage) {
            const DllReferencePlugin = require('webpack/lib/DllReferencePlugin');
            const libs = `${buildPath}/libs.json`; // check name in src/index.ejs
            if (!fs.existsSync(libs)) {
                console.log(`\nCannot link '${libs}', executing npm run build:libs`);
                const spawn = require('cross-spawn');
                spawn.sync('npm', ['run', 'build:libs'], { stdio: 'inherit' });
            }
            config.plugins.push(
                new DllReferencePlugin({
                    context: context,
                    manifest: require(libs)
                })
            );
        }
        if (!options.test) {
            const AddAssetHtmlPlugin = require('add-asset-html-webpack-plugin');
            const glob = require('glob');
            let stylePattern = `style${options.dev ? '' : '-*'}`;
            let [style] = glob.sync(`${buildPath}/${stylePattern}.css`);
            if (!style) {
                const spawn = require('cross-spawn');
                console.log('\nStyle was not found, executing npm run build:style');
                spawn.sync('npm', ['run', `build:style${options.prod ? ':prod' : ''}`], { stdio: 'inherit' });
                [style] = glob.sync(`${buildPath}/${stylePattern}.css`);
            }
            config.plugins.push(new AddAssetHtmlPlugin({ filepath: Path.resolve(buildPath, style), typeOfAsset: 'css', includeSourcemap: toBoolean(options.devtool) }));
            if (options.dev) {
                config.plugins.push(new AddAssetHtmlPlugin({ filepath: Path.resolve(buildPath, 'libs.js'), typeOfAsset: 'js' }));
            }
            // const CommonsChunkPlugin = require('webpack/lib/optimize/CommonsChunkPlugin');
            // config.plugins.push(new CommonsChunkPlugin({
            //     async: 'async-commons-chunk',
            //     minChunks: (module, count) => {
            //         return count >= 2;
            //     },
            // }));
        }
    }

    return config;
};
