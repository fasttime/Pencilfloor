#!/usr/bin/env node --experimental-modules

/* eslint-env node */

import './dom-emulation.js';

import chai                 from 'chai';
import glob                 from 'glob';
import Mocha                from 'mocha';
import { dirname }          from 'path';
import { fileURLToPath }    from 'url';

global.chai = chai;

const currentUrl = import.meta.url;
const __dirname = dirname(fileURLToPath(currentUrl));
const mocha = new Mocha({ ignoreLeaks: false });
glob
(
    '*.spec.js',
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
