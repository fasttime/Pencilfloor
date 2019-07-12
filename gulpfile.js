'use strict';

const { parallel, series, task } = require('gulp');

task
(
    'clean',
    async () =>
    {
        const del = require('del');

        await del(['.nyc_output', 'coverage']);
    },
);

task
(
    'lint',
    () =>
    {
        const lint = require('gulp-fasttime-lint');

        const stream =
        lint
        (
            {
                src: 'gulpfile.js',
                envs: 'node',
                parserOptions: { ecmaVersion: 10 },
            },
            {
                src: ['test/**/*.js', '!test/node-spec-runner.js'],
                parserOptions: { ecmaVersion: 10, sourceType: 'module' },
            },
            {
                src: 'lib/**/*.js',
                envs: 'browser',
                parserOptions: { ecmaVersion: 10, sourceType: 'module' },
            },
            {
                src: 'playground/**/*.js',
                envs: 'browser',
                globals: ['Pencilfloor'],
                parserOptions: { ecmaVersion: 10 },
            },
        );
        return stream;
    },
);

task
(
    'test',
    callback =>
    {
        const { fork } = require('child_process');

        const { resolve } = require;
        const nycPath = resolve('nyc/bin/nyc');
        const modulePath = resolve('./test/node-spec-runner');
        const childProcess =
        fork
        (
            nycPath,
            ['--require', 'esm', '--reporter=html', '--reporter=text-summary', '--', modulePath],
        );
        childProcess.on('exit', code => callback(code && 'Test failed'));
    },
);

task('default', series(parallel('clean', 'lint'), 'test'));
