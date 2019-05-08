'use strict';

const { parallel, series, task } = require('gulp');

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
    'patch',
    async () =>
    {
        const del = require('del');
        const { promises: { mkdir, symlink } } = require('fs');
        const { dirname, join } = require('path');

        const jsdomNodeModulesPath =
        join(dirname(require.resolve('jsdom/package.json')), 'node_modules');
        await mkdir(jsdomNodeModulesPath, { recursive: true });
        const symlinkPath = join(jsdomNodeModulesPath, 'request-promise-native');
        await del(symlinkPath);
        const targetPath = dirname(require.resolve('request/package.json'));
        await symlink(targetPath, symlinkPath);
    },
);

task
(
    'test',
    callback =>
    {
        const { fork } = require('child_process');

        const cmd = fork('test/node-spec-runner.js', { execArgv: ['--experimental-modules'] });
        cmd.on('exit', code => callback(code && 'Test failed'));
    },
);

task('default', series(parallel('lint', 'patch'), 'test'));
