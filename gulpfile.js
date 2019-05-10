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
        const { promises: { mkdir, writeFile } } = require('fs');
        const { dirname, join, relative } = require('path');

        const { resolve } = require;
        const pathOf = pkgName => dirname(resolve(`${pkgName}/package.json`));
        const requestPromiseNativePath =
        join(pathOf('jsdom'), 'node_modules', 'request-promise-native');
        await del(requestPromiseNativePath);
        await mkdir(requestPromiseNativePath, { recursive: true });
        const packageJsonPath = join(requestPromiseNativePath, 'package.json');
        const requestPath = relative(requestPromiseNativePath, pathOf('request'));
        await writeFile(packageJsonPath, JSON.stringify({ main: requestPath }, undefined, 2));
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
