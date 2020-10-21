/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import logger from './logger';
import { AppMap, BigipConfObj } from './models'
import { TmosRegExTree } from './regex';
import { pathValueFromKey } from './utils/objects';
import { poolsInPolicy, poolsInRule } from './pools';


/**
 * dig base config information like vlans/SelfIPs
 * @param configTree bigip config as json tree
 * @returns raw config objects
 */
export function digBaseConfig (configTree: BigipConfObj): string {

    const confs = [];

    if(configTree?.net?.vlan) {
        // get vlans
        for (const [key, value] of Object.entries(configTree.net.vlan)) {
            confs.push(`net vlan ${key} {${value}}`)
        }
    }
    
    
    if(configTree?.net?.self) {
        // get ip addresses
        for (const [key, value] of Object.entries(configTree.net.self)) {
            confs.push(`net self ${key} {${value}}`)
        }
    }

    if(configTree?.net?.["route-domain"]) {
        // get route-domains
        for (const [key, value] of Object.entries(configTree.net["route-domain"])) {
            confs.push(`net route-domain ${key} {${value}}`)
        }
    }

    if(configTree?.auth?.partition) {
        // get partitions
        for (const [key, value] of Object.entries(configTree.auth.partition)) {
            confs.push(`auth partition ${key} {${value}}`)
        }
    }



    return confs.join('\n');
}



/**
 * scans vs config, and discovers child configs
 * @param vsName virtual server name
 * @param vsConfig virtual server tmos config body 
 */
export function digVsConfig(vsName: string, vsConfig: string, configTree: BigipConfObj, rx: TmosRegExTree) {

    /**
     * 
     * What do we need to map on next on the virtual servers?:
     *  - oneConnect?
     *  - expand the discovery of all profiles (apm and supporting)
     * 
     * Or do we expand the irule references like pools/policies?
     * 
     */

    logger.info(`digging vs config for ${vsName}`);

    const pool = vsConfig.match(rx.vs.pool.obj);
    const profiles = vsConfig.match(rx.vs.profiles.obj);
    const rules = vsConfig.match(rx.vs.rules.obj);
    const snat = vsConfig.match(rx.vs.snat.obj);
    const policies = vsConfig.match(rx.vs.ltPolicies.obj);
    const persistence = vsConfig.match(rx.vs.persist.obj);
    const fallBackPersist = vsConfig.match(rx.vs.fbPersist);
    const destination = vsConfig.match(rx.vs.destination);

    // base vsMap config object
    const vsMap: AppMap = {
        vsName,
        vsDest: ''
    };

    // add destination to vsMap object
    if (destination && destination[1]) {
        vsMap.vsDest = destination[1];

    }
    let fullConfig = `ltm virtual ${vsName} {${vsConfig}}\n`

    if(pool && pool[1]) {
        const x = digPoolConfig(pool[1], configTree, rx);
        fullConfig += x.config;
        vsMap.pools = x.map;
        logger.debug(`[${vsName}] found the following pool`, pool[1]);
    }

    if(profiles && profiles[1]){
        fullConfig += digProfileConfigs(profiles[1], configTree, rx)
        logger.debug(`[${vsName}] found the following profiles`, profiles[1]);
    }

    if(rules && rules[1]) {
        // add irule connection destination mapping

        fullConfig += digRuleConfigs(rules[1], configTree, rx)
        logger.debug(`[${vsName}] found the following rules`, rules[1]);
    }

    if(snat && snat[1]) {
        fullConfig += digSnatConfig(snat[1], configTree, rx)
        logger.debug(`[${vsName}] found snat configuration`, snat[1])
    }

    if(policies && policies[1]) {
        // add ltp destination mapping
        fullConfig += digPolicyConfig(policies[1], configTree, rx)
        logger.debug(`[${vsName}] found the following policies`, policies[1]);
    }

    if(persistence && persistence[1]) {
        fullConfig += digPersistConfig(persistence[1], configTree, rx)
        logger.debug(`[${vsName}] found the following persistence`, persistence[1]);
    }
    
    if(fallBackPersist && fallBackPersist[1]) {
        fullConfig += digFbPersistConfig(fallBackPersist[1], configTree)
        logger.debug(`[${vsName}] found the following persistence`, fallBackPersist[1]);
    }

    return { fullConfig, vsMap };
    
}

/**
 * get full pool config and supporting node/monitor configs
 * @param poolName 
 */
function digPoolConfig(poolName: string, configObject: BigipConfObj, rx: TmosRegExTree) {

    logger.debug(`digging pool config for ${poolName}`);

    // const rx = this.rx.vs.pool; // get needed rx sub-tree

    let config = '';
    const map = [];

    const poolConfig = pathValueFromKey(configObject.ltm.pool, poolName)

    if (poolConfig) {

        config += `ltm pool ${poolName} {${poolConfig.value}}\n`;
        const members = poolConfig.value.match(rx.vs.pool.members);
        const monitors = poolConfig.value.match(rx.vs.pool.monitors);

        if(members && members[1]){

            // dig node information from members
            const nodeNames = members[1].match(rx.vs.pool.nodesFromMembers);
            // const nodeAddresses = members[1].match(rx.n)
            
            // regular pool member definition regex
            const memberDef = members[1].match(/(\/[\w\-\/.]+:\d+) {\s+address(.+?)\s+}/g)

            // fqdn pool member definition regex
            const memberFqdnDef = members[1].match(/(\/[\w\-\/.]+:\d+) {\s+fqdn {\s+([\s\S]+?)\s+}\s+}/g)

            logger.debug(`Pool ${poolName} members found:`, nodeNames);

            if (memberDef) {
                memberDef.forEach((el: string) => {
                    const name = el.match(/(\/[\w\-\/.]+)/);
                    const port = el.match(/(?<=:)\d+(?= )/);
                    const addr = el.match(/(?<=address )[\d.]+/);

                    const x = pathValueFromKey(configObject.ltm.node, name[0])
                    config += `ltm node ${x.key} {${x.value}}\n`
                    map.push(`${addr}:${port}`)
                })
            }

            if (memberFqdnDef) {
                memberFqdnDef.forEach((el:string) => {
                    // const memberFqdnNames = el.match(/([\s\S]+?)\n/g);
                    const name = el.match(/(\/[\w\-\/.]+)/);
                    const port = el.match(/(?<=:)\d+(?= )/);

                    const a = pathValueFromKey(configObject.ltm.node, name[0]);
                    config += `ltm node ${a.key} {${a.value}}\n`

                    map.push(`${name}:${port}`)
                })
            }
        }

        if(monitors && monitors[1]) {

            //dig monitor configs like pool members above
            const monitorNames = monitors[1].split(/ and /);
            logger.debug('pool monitor references found:', monitorNames);

            // eslint-disable-next-line prefer-const
            const monitorNameConfigs = [];
            monitorNames.forEach( name => {

                // new way look for key in .ltm.monitor
                const x = pathValueFromKey(configObject.ltm.monitor, name)
                if(x){
                    // rebuild tmos object
                    monitorNameConfigs.push(`ltm monitor ${x.path} ${x.key} {${x.value}}\n`);
                }
            })
            
            logger.debug('pool monitor configs found:', monitorNameConfigs);
            const defaultMonitors = monitorNames.length - monitorNameConfigs.length
            
            if(defaultMonitors){
                logger.debug(`[${poolName}] references ${defaultMonitors} system default monitors, compare previous arrays for details`)
            }
            
            if(monitorNameConfigs){
                config += monitorNameConfigs.join('\n');
            }
        }
    }
    return { config, map };
}






function digProfileConfigs(profilesList: string, configObject: BigipConfObj, rx: TmosRegExTree) {

    // regex profiles list to individual profiles
    // const rx = this.rx.vs.profiles;
    const profileNames = profilesList.match(rx.vs.profiles.names);
    logger.debug(`profile references found: `, profileNames);
    
    // eslint-disable-next-line prefer-const
    let configList = [];
    profileNames.forEach( name => {

        const x = pathValueFromKey(configObject.ltm.profile, name);
        if (x) {
            configList.push(`ltm profile ${x.path} ${x.key} {${x.value}}\n`);
        }

    })
    
    const defaultProfiles = profileNames.length - configList.length;
    if(defaultProfiles){
        logger.debug(`Found ${defaultProfiles} system default profiles, compare previous arrays for details`)
    }
    return configList.join('\n');
}







/**
 * 
 * @param rulesList raw irules regex from vs dig
 */
function digRuleConfigs(rulesList: string, configObject: BigipConfObj, rx: TmosRegExTree) {

    // const rx = this.rx.vs.rules
    const ruleNames = rulesList.match(rx.vs.rules.names);
    logger.debug(`rule references found: `, ruleNames);

    // eslint-disable-next-line prefer-const
    let ruleList = [];
    ruleNames.forEach( name => {
        // search config, return matches
        const x = pathValueFromKey(configObject.ltm.rule, name)

        if (x) {
            ruleList.push(`ltm rule ${x.key} {${x.value}}\n`);
        }
    })

    const defaultRules = ruleNames.length - ruleList.length;
    if(defaultRules) {
        logger.debug(`Found ${defaultRules} system default iRules, compare previous arrays for details`)
    }
    return ruleList.join('\n');
}








/**
 * analyzes vs snat config, returns full snat configuration if pool reference
 * @param snat vs snat reference as string
 */
function digSnatConfig(snat: string, configObject: BigipConfObj, rx: TmosRegExTree) {
    let config = '';
    if (snat.includes('pool')) {
        const snatName = snat.match(rx.vs.snat.name);
        if (snatName) {
            const x = pathValueFromKey(configObject.ltm.snatpool, snatName[1])
            config += `ltm snatpool ${x.key} {${x.value}}\n`;
        } else {
            logger.error(`Detected following snat pool configuration, but did not find in config [${snat}]`)
        }
    } else {
        logger.debug(`snat configuration detected, but no pool reference found, presume -> automap`)
    }
    return config;
}





/**
 * loops through vs ltp list and returns full ltp configs
 * @param ltPolicys vs ltp config
 */
function digPolicyConfig(policys: string, configObject: BigipConfObj, rx: TmosRegExTree) {

    // regex local traffic list to individual profiles
    const policyNames = policys.match(rx.vs.ltPolicies.names);
    logger.debug(`policy references found: `, policyNames);
    
    const configList = [];
    
    // get policy references from vs
    policyNames.forEach( name => {
        
        const x = pathValueFromKey(configObject.ltm.policy, name)
        
        if (x) {
            logger.debug(`policy found [${x.key}]`);
            configList.push(`ltm policy ${x.key} {${x.value}}\n`)
            
            // got through each policy and dig references (like pools)
            const pools = poolsInPolicy(x.value)
            
            if (pools) {
                pools.forEach( pool => {
                    const cfg = pathValueFromKey(configObject.ltm.pool, pool)
                    // if we got here there should be a pool for the reference, 
                    // but just in case, we confirm with (if) statement
                    if (cfg) {
                        // push pool config to list
                        logger.debug(`policy [${x.key}], pool found [${cfg.key}]`);
                        configList.push(`ltm pool ${cfg.key} {${cfg.value}}`)
                    }
                })
            }


        } else {
            logger.error(`Could not find ltPolicy named: ${name}`)
        }

    })

    // removde duplicates
    const unique = uniqueList(configList);
    // join list with line returns to return a single config string
    return unique.join('\n');
}


/**
 * removes duplicates
 * @param x list of strings
 * @return list of unique strings
 */
export function uniqueList (x: string[]) {
    return Array.from(new Set(x));
}




/**
 * get persistence config
 * @param persistence vs persistence referecne
 */
function digPersistConfig(persist: string, configObject: BigipConfObj, rx: TmosRegExTree) {

    let config = '';
    const persistName = persist.match(rx.vs.persist.name);
    if (persistName) {
        const x = pathValueFromKey(configObject.ltm.persistence, persistName[1])
        if (x) {
            config += `ltm persistence ${x.path} ${x.key} {${x.value}}\n`
        }
    }
    return config;
}





/**
 * get fall back persistence config
 * @param fbPersist vs fallback-persistence
 */
function digFbPersistConfig(fbPersist: string, configObject: BigipConfObj) {

    let config = '';
    const x = pathValueFromKey(configObject.ltm.persistence, fbPersist);
    if (x) {
        config += `ltm persistence ${x.path} ${x.key} {${x.value}}\n`
    }
    return config;
}







