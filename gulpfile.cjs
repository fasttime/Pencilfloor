'use strict';

const { parallel, series, task } = require('gulp');

task
(
    'clean',
    async () =>
    {
        const { promises: { rmdir } } = require('fs');

        await rmdir('coverage', { recursive: true });
    },
);

task
(
    'lint',
    () =>
    {
        const lint = require('@fasttime/gulp-lint');

        const stream =
        lint
        (
            {
                src: 'gulpfile.cjs',
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
        const c8Path = resolve('c8/bin/c8');
        const modulePath = resolve('./test/node-spec-runner');
        const childProcess =
        fork(c8Path, ['--reporter=html', '--reporter=text-summary', modulePath]);
        childProcess.on('exit', code => callback(code && 'Test failed'));
    },
);

task('default', series(parallel('clean', 'lint'), 'test'));
