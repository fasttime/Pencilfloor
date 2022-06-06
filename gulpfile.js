import gulp from 'gulp';

const { parallel, series, task } = gulp;

task
(
    'clean',
    async () =>
    {
        const { promises: { rm } } = await import('fs');

        await rm('coverage', { force: true, recursive: true });
    },
);

task
(
    'lint',
    async () =>
    {
        const { lint } = await import('@fasttime/lint');

        await lint
        (
            {
                src: 'gulpfile.cjs',
                envs: 'node',
                parserOptions: { ecmaVersion: 2020 },
            },
            {
                src: ['test/**/*.js', '!test/{node-spec-runner,serve}.js'],
                parserOptions: { ecmaVersion: 2020, sourceType: 'module' },
            },
            {
                src: ['lib/**/*.{js,ts}', 'playground/**/*.js'],
                envs: 'browser',
                parserOptions:
                { ecmaVersion: 2020, project: 'tsconfig.json', sourceType: 'module' },
            },
        );
    },
);

task
(
    'test',
    async () =>
    {
        const { default: c8js } = await import('c8js');

        await c8js
        (
            './test/node-spec-runner.js',
            {
                cwd: new URL('.', import.meta.url),
                reporter: ['html', 'text-summary'],
                useC8Config: false,
                watermarks:
                {
                    branches:   [90, 100],
                    functions:  [90, 100],
                    lines:      [90, 100],
                    statements: [90, 100],
                },
            },
        );
    },
);

task('default', series(parallel('clean', 'lint'), 'test'));
