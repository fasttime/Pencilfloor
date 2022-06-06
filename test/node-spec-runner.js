#!/usr/bin/env node

/* eslint-env node */

import './dom-emulation.js';

import chai                 from 'chai';
import glob                 from 'glob';
import Mocha                from 'mocha';
import { dirname }          from 'node:path';
import { fileURLToPath }    from 'node:url';
import { promisify }        from 'node:util';

(async () =>
{
    global.chai = chai;
    const mocha = new Mocha({ checkLeaks: true });
    const currentUrl = import.meta.url;
    const __dirname = dirname(fileURLToPath(currentUrl));
    const files = await promisify(glob)('*.spec.js', { cwd: __dirname, nodir: true });
    mocha.suite.emit('pre-require', global, null, mocha);
    {
        const { url } = await import('node:inspector');
        const inspectorUrl = url();
        if (inspectorUrl)
            Mocha.Runnable.prototype.timeout = (...args) => args.length ? undefined : 0;
    }
    const urls = files.map(file => new URL(file, currentUrl));
    for (const url of urls)
        await import(url); // eslint-disable-line no-await-in-loop
    mocha.run
    (
        failures =>
        {
            if (failures)
                process.exitCode = 1;
        },
    );
}
)();
