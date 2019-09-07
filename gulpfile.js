'use strict';

const { parallel, series, task } = require('gulp');

task
(
    'clean',
    async () =>
    {
        const { promises: { rmdir } } = require('fs');

        const paths = ['.nyc_output', 'coverage'];
        await Promise.all(paths.map(path => rmdir(path, { recursive: true })));
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
                src: ['lib/**/*.{js,ts}', 'playground/**/*.js'],
                envs: 'browser',
                parserOptions: { ecmaVersion: 10, project: 'tsconfig.json', sourceType: 'module' },
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
