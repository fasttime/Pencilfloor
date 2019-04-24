'use strict';

const { series, task } = require('gulp');

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
                parserOptions: { ecmaVersion: 8 },
            },
            {
                src: ['test/**/*.{js,mjs}', '!test/node-spec-runner.mjs'],
                parserOptions: { ecmaVersion: 8, sourceType: 'module' },
            },
            {
                src: 'pencilfloor.{js,mjs}',
                envs: 'browser',
                parserOptions: { ecmaVersion: 8, sourceType: 'module' },
            },
            {
                src: 'playground/*.js',
                envs: 'browser',
                globals: ['Pencilfloor'],
                parserOptions: { ecmaVersion: 8 },
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

        const cmd = fork('test/node-spec-runner', { execArgv: ['--experimental-modules'] });
        cmd.on('exit', code => callback(code && 'Test failed'));
    },
);

task('default', series('lint', 'test'));
