#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-explicit-any */
'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ltm_1 = __importDefault(require("./ltm"));
const yargs_1 = __importDefault(require("yargs"));
// import * as fs from 'fs';
const path_1 = __importDefault(require("path"));
// yargs
// .command('explode', 'explode bigip.conf to apps', {
//     title: {
//         describe: 'source file',
//         description: 'bigip.conf',
//         demand: true,
//         alias: 's'
//     }
// })
function explode(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        // console.log('incoming param (file):', filePath);
        // part input to usable pieces
        filePath = path_1.default.parse(filePath);
        // console.log(filePath);
        const device = new ltm_1.default();
        try {
            const loadTime = yield device.load(path_1.default.join(filePath.dir, filePath.base));
            if (!loadTime) {
                // something went wrong, return logs
                return console.log(device.logs());
            }
            const parseTime = yield device.parse();
            if (!parseTime) {
                // something went wrong, return logs
                return console.log(device.logs());
            }
            const explode = device.explode();
            const v = JSON.stringify(explode);
            return console.log(v);
        }
        catch (e) {
            return console.log(e.message);
        }
    });
}
yargs_1.default
    .command('explode <file>', 'explode bigip config', (yargs) => {
    yargs
        .positional('file', {
        describe: '.conf|ucs|kqview to explode'
    });
}, (argv) => {
    // console.log(argv.file);
    explode(argv.file);
})
    .command('test', 'test', (yargs) => {
    yargs
        .positional('file', {
        describe: '.conf|ucs|kqview to explode'
    });
}, (argv) => {
    // console.log(argv.file);
    explode(argv.file);
})
    // .command()
    .demandCommand(1, 'A command is required')
    .wrap(120)
    .strict()
    .argv;
//# sourceMappingURL=cli.js.map