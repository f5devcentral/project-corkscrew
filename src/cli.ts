#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-explicit-any */

'use strict';

import bigipConfig from './ltm'
import yargs from 'yargs';
// import * as fs from 'fs';
import path from 'path';

// yargs
// .command('explode', 'explode bigip.conf to apps', {
//     title: {
//         describe: 'source file',
//         description: 'bigip.conf',
//         demand: true,
//         alias: 's'
//     }
// })

async function explode(filePath: string | any) {
    // console.log('incoming param (file):', filePath);

    // part input to usable pieces
    filePath = path.parse(filePath);
    // console.log(filePath);

    const device = new bigipConfig();

    try {

        const loadTime = await device.load(path.join(filePath.dir, filePath.base));
        
        if ( !loadTime ) {
            // something went wrong, return logs
            return console.log(device.logs());
        }

        const parseTime = await device.parse();
        
        if ( !parseTime ) {
            // something went wrong, return logs
            return console.log(device.logs());
        }
        
        const explode = device.explode();
        const v = JSON.stringify(explode);

        return console.log(v);
    } catch (e) {
        return console.log(e.message);
    }
}

yargs
.command('explode <file>', 'explode bigip config', (yargs) => {
    yargs
    .positional('file', {
        describe: '.conf|ucs|kqview to explode'
    });
}, (argv: any) => {
    // console.log(argv.file);
    explode(argv.file)
})
// .command()
.demandCommand(1, 'A command is required')
.wrap(120)
.strict()
.argv;
// console.log(' yyeeeeeee!!!!');