"use strict";
/**
 * todo:
 * - add support for virtual server destinations
 * - add support for variables in brackets ${var}
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.poolsInLTP = exports.poolsInRule = void 0;
/**
 * discovers ltm pools from irule
 * - when a list of pools is provided, will only return discovered pool verified by list
 *
 * All pool definitions in irule need to be on thier own line!!!
 *
 * based off of:  https://devcentral.f5.com/s/articles/irules-101-05-selecting-pools-pool-members-and-nodes
 *
 * @param rule irule
 * @param pools (optional) list of pools on box to verify any matches
 * @returns array of discovered pools in irule
 */
function poolsInRule(rule, existingPools) {
    const poolReg = /\n[\s]*[^#]pool\s([$/A-Za-z_][$/\w._-]+[\s\w\d.]+)/g;
    const rawPools = rule.match(poolReg);
    // let newPools: string[][]; // array of strings or arrays with strings
    // let newPools: ((string | undefined)[] | undefined)[]; // array of strings or arrays with strings
    let newPools; // array of strings or arrays with strings
    // let newPools: Array<string | undefined>; // array of strings or arrays with strings
    if (!rawPools) {
        return; // no pools detected in iRule
    }
    // var something = '';  // = undefined | null?
    newPools = rawPools.map(item => {
        var _a;
        item = item.trim(); // trim leading and trailing space
        item = item.replace('pool ', ''); // trim leading "pool "
        if (/\s/.test(item)) {
            /**
             * If there is a space in the item, it means we have a
             * detailed member specific pool destination
             * takes this:  "jpg.pool member 10.10.10.1 80"
             * to this: ['jpg.pool', 'member', '10.10.10.1', '80']
             */
            return item.split(" ");
            // newPools.push(item.split(""));
        }
        else if (item.includes("$")) {
            item = item.replace('$', ''); // remove leading '$'
            /**
             * the mateched pool destination is a variable, so
             * search the irule again, looking for that variable definition
             *  - will return last match after cleaning
             */
            const regx = new RegExp("\\n[\\s]*[^#]set\\s" + item + "\\s(.+?)\\s", "g");
            // look for item in orginal irule, if found, return last match
            // let poolVar = rule.match(regx);
            let poolVar = (_a = rule.match(regx)) === null || _a === void 0 ? void 0 : _a.pop();
            if (poolVar) {
                poolVar = poolVar.trim(); // trim leading/ending whitespace
                // poolVar = poolVar[0].replace(/^\s+|\s+$/g, '');  // regex method
                // split on spaces, return last element
                // "set html-pool web1Pool" -> web1Pool
                return [poolVar.split(" ").pop()];
            }
        }
        else {
            return [item];
        }
    });
    /**
     * if a list of pools was provided as input, return only items contained in pool list
     *
     * This may not be necessary since tmos won't let you associate an irule that reference
     *  a pool that doesn't exist.  You can create it, but not assign it to a virtual
     *
     */
    if (existingPools && newPools) {
        // existing pool list detected
        newPools = newPools.filter(el => {
            if (existingPools.includes(el[0])) {
                return el;
            }
        });
        return newPools;
    }
    else {
        // no verifcation list, so just return list
        return newPools;
    }
}
exports.poolsInRule = poolsInRule;
/**
 * extracts destination pools from Local Traffic Policy
 *
 * No verification needed since LTPs won't reference a pool not already configured
 *
 * @param ltp tcl/tmos local traffic policy
 */
function poolsInLTP(ltp) {
    const poolReg = /\n[\s]*pool\s(.+?)\s/g;
    const rawPools = ltp.match(poolReg);
    if (!rawPools) {
        return;
    }
    const newPools = rawPools.map(item => {
        item = item.replace('pool ', ''); // trim leading "pool "
        item = item.trim(); // trim leading/ending whitespace
        return item;
    });
    return newPools;
}
exports.poolsInLTP = poolsInLTP;
// export function poolsInAP (ap: string, pools?: string[]): string[] {
//     console.log('called poolsInAP to get referenced ltm pools in a Access Policy (APM)');
//     //working on getting an access policy together
// }
// exports.poolsInRule = poolsInRule;
// exports.poolsInLTP = poolsInLTP;
// exports.poolsInAP = poolsInAP;
//# sourceMappingURL=pools.js.map