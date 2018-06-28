/* eslint-env node */

'use strict';

const gulp = require('gulp');

gulp.task(
    'lint:gulpfile',
    callback =>
    {
        const lint = require('gulp-fasttime-lint');

        const src = 'gulpfile.js';
        const options = { parserOptions: { ecmaVersion: 8 } };
        gulp.src(src).pipe(lint(options)).on('end', callback);
    }
);

gulp.task(
    'lint:other',
    callback =>
    {
        const lint = require('gulp-fasttime-lint');

        const src = ['test/**/*.js', 'test/**/*.mjs', '!test/node-spec-runner.mjs'];
        const options = { parserOptions: { ecmaVersion: 8, sourceType: 'module' } };
        gulp.src(src).pipe(lint(options)).on('end', callback);
    }
);

gulp.task(
    'lint:pencilfloor',
    callback =>
    {
        const lint = require('gulp-fasttime-lint');

        const src = ['pencilfloor.js', 'pencilfloor.mjs'];
        const options =
        { envs: ['browser'], parserOptions: { ecmaVersion: 8, sourceType: 'module' } };
        gulp.src(src).pipe(lint(options)).on('end', callback);
    }
);

gulp.task(
    'lint:playground',
    callback =>
    {
        const lint = require('gulp-fasttime-lint');

        const src = 'playground/*.js';
        const options =
        {
            envs: ['browser'],
            globals: ['Pencilfloor'],
            parserOptions: { ecmaVersion: 8 },
            rules: { strict: ['error', 'global'] },
        };
        gulp.src(src).pipe(lint(options)).on('end', callback);
    }
);

gulp.task(
    'test',
    callback =>
    {
        const { fork } = require('child_process');

        const cmd = fork('test/node-spec-runner', { execArgv: ['--experimental-modules'] });
        cmd.on('exit', code => callback(code && 'Test failed'));
    }
);

gulp.task(
    'lint',
    gulp.parallel('lint:gulpfile', 'lint:other', 'lint:pencilfloor', 'lint:playground')
);
gulp.task('default', gulp.series('lint', 'test'));
