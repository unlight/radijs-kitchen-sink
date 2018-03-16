/// <reference types="node" />
import * as fs from 'fs';
import * as Path from 'path';
import del = require('del');
import changed = require('is-changed');
import gulp = require('gulp');
const glob = require('glob');
const g = require('gulp-load-plugins')();
const spawn = require('cross-spawn');

const buildPath = Path.join(__dirname, 'dist');

function sourceLint() {
    return g.eslint();
}

function specLint() {
    return g.eslint({
        rules: {
            'prefer-const': 0,
            'prefer-destructuring': 0,
            'import/no-duplicates': 0,
            'import/max-dependencies': 0,
        }
    });
}

gulp.task('clean', () => {
    return del([buildPath, '.testresults']);
});

gulp.task('eslint', () => {
    return gulp.src('src/**/*.tsx', { since: g.memoryCache.lastMtime('source') })
        .pipe(g.memoryCache('source'))
        .pipe(g.if('*.spec.tsx', specLint(), sourceLint()))
        .pipe(g.eslint.format());
});

gulp.task('eslint:w', (done) => {
    let w = gulp.watch('src/**/*.tsx', { ignoreInitial: false }, gulp.series('eslint'));
    w.on('change', g.memoryCache.update('source'));
    process.on('SIGINT', () => {
        w.close();
        done();
    });
});

gulp.task('build:libs', async () => {
    const libsChanged = changed.dependencies(Path.resolve(buildPath, '.libs.dat'));
    if (!libsChanged.result && fs.existsSync(`${buildPath}/libs.json`) && fs.existsSync(`${buildPath}/libs.js`)) {
        return Promise.resolve();
    } else if (libsChanged.diff) {
        const diff = libsChanged.diff;
        Object.keys(diff).forEach(pkname => {
            const version = diff[pkname].$set;
            g.util.log(`${pkname} ${g.util.colors.cyan(version)}`);
        });
    }
    await new Promise((resolve, reject) => {
        g.util.log(g.util.colors.yellow('Need npm install'));
        const proc = spawn('npm', ['install'], { stdio: 'inherit' });
        proc.on('error', reject);
        proc.once('exit', resolve);
    });
    g.util.log(g.util.colors.yellow('Rebuilding npm libs'));
    return new Promise((resolve, reject) => {
        const proc = spawn('npm', ['run', 'build:libs'], { stdio: 'inherit' });
        proc.on('error', reject);
        proc.once('exit', () => {
            libsChanged.update();
            resolve();
        });
    });
});

// Builds style for development only.
gulp.task('build:style', (done) => {
    const styleChanged = changed.file(`src/style.scss`, Path.resolve(buildPath, '.style.dat'));
    if (styleChanged.result) {
        del.sync(`${buildPath}/style.css`);
    }
    let [style] = glob.sync(`${buildPath}/style.css`);
    if (!style) {
        const proc = spawn('npm', ['run', 'build:style'], { stdio: 'inherit' });
        proc.on('error', done);
        proc.once('exit', () => {
            styleChanged.update();
            done();
        });
    } else {
        done();
    }
});

gulp.task('server:prestart', gulp.series('build:libs', 'build:style'));
