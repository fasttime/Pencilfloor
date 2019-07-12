#!/usr/bin/env node --experimental-modules

/* eslint-env node */

import chalk                        from 'chalk';
import { createReadStream }         from 'fs';
import { createServer }             from 'http';
import { networkInterfaces }        from 'os';
import { dirname, extname, join }   from 'path';
import { fileURLToPath }            from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mimeTypes = { '.css': 'text/css', '.html': 'text/html', '.js': 'application/javascript' };
const port = 8080;

createServer
(
    (request, response) =>
    {
        const requestUrl = request.url.replace(/\?.*/s, '');
        const pathname = join(__dirname, requestUrl);
        const stream = createReadStream(pathname);
        stream.on
        (
            'open',
            () =>
            {
                const headers = { };
                {
                    const ext = extname(requestUrl);
                    if (mimeTypes.hasOwnProperty(ext))
                        headers['Content-Type'] = mimeTypes[ext];
                }
                response.writeHead(200, headers);
                stream.pipe(response);
            },
        );
        stream.on
        (
            'error',
            () =>
            {
                response.writeHead(404);
                response.end();
            },
        );
    },
)
.listen(port);

{
    const ip = getIP();
    if (ip)
    {
        const baseUrl = `http://${ip}:${port}`;
        const urlInfo =
        (name, path) => `\n${chalk.bold(name)}\n${chalk.blue(`${baseUrl}${path}`)}\n`;
        console.log
        (
            urlInfo('Playground URL', '/playground/playground.html') +
            urlInfo('Spec Runner URL', '/test/spec-runner.html')
        );
    }
}

function getIP()
{
    let ip;
    const networkInterfaceList = Object.values(networkInterfaces());
    for (const networkInterface of networkInterfaceList)
    {
        for (const assignedNetworkAddress of networkInterface)
        {
            if (!assignedNetworkAddress.internal)
            {
                let { address } = assignedNetworkAddress;
                if (assignedNetworkAddress.family !== 'IPv4')
                    address = `[${address}]`;
                if (!ip || ip.length > address.length)
                    ip = address;
            }
        }
    }
    return ip;
}
