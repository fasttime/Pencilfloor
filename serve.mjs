#!/usr/bin/env node --experimental-modules

/* eslint-env node */

import chalk from 'chalk';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';

const __dirname =
path.normalize(path.dirname(new URL(import.meta.url).pathname)).replace(/^\\/, '');
const mimeTypes =
{ '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const port = 8080;

http.createServer
(
    (request, response) =>
    {
        const requestUrl = request.url.replace(/\?[^]*/, '');
        if (requestUrl.includes('\\'))
        {
            response.writeHead(400);
            response.end();
            return;
        }
        const pathname = path.join(__dirname, requestUrl);
        const stream = fs.createReadStream(pathname);
        stream.on
        (
            'open',
            () =>
            {
                const headers = { };
                {
                    const ext = path.extname(requestUrl);
                    if (mimeTypes.hasOwnProperty(ext))
                        headers['Content-Type'] = mimeTypes[ext];
                }
                response.writeHead(200, headers);
                stream.pipe(response);
            }
        );
        stream.on
        (
            'error',
            () =>
            {
                response.writeHead(404);
                response.end();
            }
        );
    }
)
.listen(port);

{
    const ip = getIP();
    if (ip)
    {
        const baseUrl = `http://${getIP()}:${port}`;
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
    const networkInterfaces = Object.values(os.networkInterfaces());
    for (const networkInterface of networkInterfaces)
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
