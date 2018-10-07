/* eslint-env node */

'use strict';

const gulp = require('gulp');

gulp.task
(
    'lint:gulpfile',
    callback =>
    {
        const lint = require('gulp-fasttime-lint');

        gulp
        .src('gulpfile.js')
        .pipe(lint({ parserOptions: { ecmaVersion: 8 } }))
        .on('end', callback);
    }
);

gulp.task
(
    'lint:other',
    callback =>
    {
        const lint = require('gulp-fasttime-lint');

        gulp
        .src(['test/**/*.js', 'test/**/*.mjs', '!test/node-spec-runner.mjs'])
        .pipe(lint({ parserOptions: { ecmaVersion: 8, sourceType: 'module' } }))
        .on('end', callback);
    }
);

gulp.task
(
    'lint:pencilfloor',
    callback =>
    {
        const lint = require('gulp-fasttime-lint');

        gulp
        .src(['pencilfloor.js', 'pencilfloor.mjs'])
        .pipe(lint({ envs: ['browser'], parserOptions: { ecmaVersion: 8, sourceType: 'module' } }))
        .on('end', callback);
    }
);

gulp.task
(
    'lint:playground',
    callback =>
    {
        const lint = require('gulp-fasttime-lint');

        const lintOpts =
        {
            envs: ['browser'],
            globals: ['Pencilfloor'],
            parserOptions: { ecmaVersion: 8 },
            rules: { strict: ['error', 'global'] },
        };
        gulp.src('playground/*.js').pipe(lint(lintOpts)).on('end', callback);
    }
);

gulp.task
(
    'test',
    callback =>
    {
        const { fork } = require('child_process');

        const cmd = fork('test/node-spec-runner', { execArgv: ['--experimental-modules'] });
        cmd.on('exit', code => callback(code && 'Test failed'));
    }
);

gulp.task
('lint', gulp.parallel('lint:gulpfile', 'lint:other', 'lint:pencilfloor', 'lint:playground'));
gulp.task('default', gulp.series('lint', 'test'));
