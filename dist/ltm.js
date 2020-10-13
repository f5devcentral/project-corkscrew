"use strict";
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
// /* eslint-disable @typescript-eslint/no-explicit-any */
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
const events_1 = require("events");
const regex_1 = require("./regex");
const logger_1 = __importDefault(require("./logger"));
const objects_1 = require("./utils/objects");
const objects_2 = require("./utils/objects");
const uuid_1 = require("uuid");
// import { countLines } from './tmosParser';
const objCounter_1 = require("./objCounter");
const unPacker_1 = require("./unPacker");
const digConfigs_1 = require("./digConfigs");
/**
 * Class to consume bigip configs -> parse apps
 *
 */
class BigipConfig extends events_1.EventEmitter {
    constructor() {
        super();
        /**
         * incoming config files array
         * ex. [{filename:'config/bigip.conf',size:12345,content:'...'},{...}]
         */
        this.configFiles = [];
        /**
         * tmos config as nested json objects
         * - consolidated parant object keys like ltm/apm/sys/...
         */
        this.configObject = {};
        /**
         * placeholder for future fully jsonified tmos config
         */
        this.configFullObject = {};
        this.stats = {
            objectCount: 0,
        };
    }
    /**
     * load .conf file or files from ucs/qkview
     *
     * @param config array of configs as strings
     */
    load(file) {
        return __awaiter(this, void 0, void 0, function* () {
            /**
             * setup event emitors to provide status of unPacking
             */
            const startTime = process.hrtime.bigint();
            this.configFiles = yield unPacker_1.unPacker(file);
            if (this.configFiles) {
                // unPacker returned something so respond with processing time
                return Number(process.hrtime.bigint() - startTime) / 1000000;
            }
            else {
                // unPacker failed and returned nothing back up the chain...
                return;
            }
        });
    }
    /**
     * new parsing fuction to work on list of files from unPacker
     */
    parse() {
        const startTime = process.hrtime.bigint();
        logger_1.default.debug('Begining to parse configs');
        this.configFiles.forEach((el, index) => {
            /**
             * for each file
             * 1. get tmos version
             * 2. extract parent objects to array
             * 3. convert array to main obj
             */
            // create parsing details obj for emitter
            const parsingFile = {
                parsing: el.fileName,
                num: index + 1,
                of: this.configFiles.length // total # of files
            };
            this.emit('parseFile', parsingFile);
            if (this.rx) {
                // rex tree already assigned, lets confirm subsequent file tmos version match
                if (this.tmosVersion === this.getTMOSversion(el.content, this.rx.tmosVersion)) {
                    // do nothing, current file version matches existing files tmos verion
                }
                else {
                    logger_1.default.error(`Parsing [${el.fileName}], tmos version of this file does not match previous file [${this.tmosVersion}]`);
                    return;
                }
            }
            else {
                // first time through - build everything
                const rex = new regex_1.RegExTree(); // instantiate regex tree
                this.tmosVersion = this.getTMOSversion(el.content, rex.tmosVersionReg); // get tmos version
                logger_1.default.info(`Recieved .conf file of version: ${this.tmosVersion}`);
                // assign regex tree for particular version
                this.rx = rex.get(this.tmosVersion);
            }
            let configArray = [];
            try {
                // try to parse the config into an array
                //  this is probably the heaviest processing line in the entire app
                //     - aside from unpacking/searching the ucs/qkviews, which can be done in other ways
                // I have ideas on how we can create a better parser that would stream in the config, line by line, detect object chunks, pull them off and push them to an array
                configArray = [...el.content.match(this.rx.parentObjects)];
            }
            catch (e) {
                logger_1.default.error('failed to extract any parent matches from file - might be a scripts file...');
            }
            if (configArray) {
                // get number of lines in config
                // this seems to be fairly accurate when compareing config lines from other tools
                // const objectCount = configArray.length;
                // logger.debug(`detected ${this.stats.objectCount} parent objects in this file`)
                // add object count to main stats
                this.stats.objectCount += configArray.length;
                logger_1.default.debug(`creating more detailed arrays/objects for deeper inspection`);
                configArray.forEach((el, index) => {
                    // extract object name from body
                    const name = el.match(this.rx.parentNameValue);
                    // create parsing details obj for emitter
                    const parsingObj = {
                        parsing: name[1],
                        num: index + 1,
                        of: configArray.length // total # of objs
                    };
                    if (name && name.length === 3) {
                        this.emit('parseObject', parsingObj);
                        // split extracted name element by spaces
                        const names = name[1].split(' ');
                        // create new nested objects with each of the names, assigning value on inner-most
                        const newObj = objects_1.nestedObjValue(names, name[2]);
                        this.configObject = objects_2.deepMergeObj(this.configObject, newObj);
                    }
                    else {
                        logger_1.default.error('Detected parent object, but does not have all necessary regex elements to get processed ->', el);
                    }
                });
            }
        });
        // get ltm object counts
        this.stats.objects = objCounter_1.countObjects(this.configObject);
        // end processing time, convert microseconds to miliseconds
        this.stats.parseTime = Number(process.hrtime.bigint() - startTime) / 1000000;
        return this.stats.parseTime;
    }
    /**
     * return list of applications
     *
     * @return array of app names
     * @example ['/Common/app1_80t_vs', '/tenant1/app4_t443_vs']
     */
    appList() {
        return Object.keys(this.configObject.ltm.virtual);
    }
    /**
     * returns all details from processing
     *
     * -
     */
    // todo: type the return object for explode and remove the followin disable line
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    explode() {
        var _a;
        // if config has not been parsed yet...
        if (!((_a = this.configObject.ltm) === null || _a === void 0 ? void 0 : _a.virtual)) {
            this.parse(); // parse config files
        }
        const apps = this.apps(); // extract apps
        const startTime = process.hrtime.bigint(); // start pack timer
        const id = uuid_1.v4(); // generat uuid
        const dateTime = new Date(); // generate date/time
        const logs = this.logs(); // get all the processing logs
        // map out the config body/contents
        const sources = this.configFiles.map(x => {
            return { fileName: x.fileName, size: x.size };
        });
        // collect base information like vlans/IPs
        const base = digConfigs_1.digBaseConfig(this.configObject);
        // capture pack time
        this.stats.packTime = Number(process.hrtime.bigint() - startTime) / 1000000;
        return {
            id,
            dateTime,
            config: {
                sources,
                apps,
                base
            },
            stats: this.stats,
            logs
        };
    }
    /**
     * Get processing logs
     */
    logs() {
        return logger_1.default.getLogs();
    }
    /**
     * extracts app(s)
     * @param app single app string
     * @return [{ name: <appName>, config: <appConfig>, map: <appMap> }]
     */
    apps(app) {
        /**
         * todo:  add support for app array to return multiple specific apps at same time.
         */
        const startTime = process.hrtime.bigint();
        if (app) {
            // extract single app config
            const value = this.configObject.ltm.virtual[app];
            if (value) {
                // dig config, then stop timmer, then return config...
                const x = [digConfigs_1.digVsConfig(app, value, this.configObject, this.rx)];
                this.stats.appTime = Number(process.hrtime.bigint() - startTime) / 1000000;
                return x;
            }
        }
        else {
            // means we didn't get an app name, so try to dig all apps...
            // eslint-disable-next-line prefer-const
            let apps = [];
            const i = this.configObject.ltm.virtual;
            for (const [key, value] of Object.entries(i)) {
                const vsConfig = digConfigs_1.digVsConfig(key, value, this.configObject, this.rx);
                const x = JSON.stringify({ name: key, config: vsConfig });
                const y = JSON.parse(x);
                apps.push(y);
            }
            this.stats.appTime = Number(process.hrtime.bigint() - startTime) / 1000000;
            return apps;
        }
    }
    /**
     * extract tmos config version from first line
     * ex.  #TMSH-VERSION: 15.1.0.4
     * @param config bigip.conf config file as string
     */
    getTMOSversion(config, regex) {
        const version = config.match(regex);
        if (version) {
            //found tmos version
            return version[1];
        }
        else {
            const msg = 'tmos version not detected -> meaning this probably is not a bigip.conf';
            logger_1.default.error(msg);
            throw new Error(msg);
        }
    }
}
exports.default = BigipConfig;
// /**
//  * standardize line endings to linux
//  * "\r\n" and "\r" to "\n"
//  * @param config config as string
//  * @returns config
//  */
// function standardizeLineReturns (config: string){
//     const regex = /(\r\n|\r)/g;
//     return config.replace(regex, "\n");
// }
// /**
//  * Reverse string
//  * @param str string to reverse
//  */
// function reverse(str: string){
//     return [...str].reverse().join('');
//   }
//# sourceMappingURL=ltm.js.map