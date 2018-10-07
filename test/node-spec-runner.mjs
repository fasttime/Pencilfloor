#!/usr/bin/env node --experimental-modules

/* eslint-env node */

import './dom-emulation';
import Mocha from 'mocha';
import chai from 'chai';
import glob from 'glob';
import path from 'path';

global.chai = chai;

const currentUrl = new URL(import.meta.url);
const __dirname = path.normalize(path.dirname(currentUrl.pathname)).replace(/^\\/, '');
const mocha = new Mocha();
glob
(
    '*.spec.mjs',
    { cwd: __dirname, nodir: true },
    (error, files) =>
    {
        if (error)
            throw error;
        const urls = files.map(file => new URL(file, currentUrl));
        (async () =>
        {
            try
            {
                for (const url of urls)
                    await import(url); // eslint-disable-line no-await-in-loop
                mocha.run
                (
                    failures =>
                    {
                        if (failures)
                            process.exitCode = 1;
                    }
                );
            }
            catch (error)
            {
                console.error(error);
                process.exitCode = 1;
            }
        }
        )();
    }
);
mocha.suite.emit('pre-require', global, null, mocha);
