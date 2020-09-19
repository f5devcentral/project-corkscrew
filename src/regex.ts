

// import logger grom './logger'

/**
 * This file servers as the central place for all regex's, we'll call it a regex tree
 * 
 * The idea here is to create a base regex object tree, based on v14/v15 code
 *  if/when any changes in config structure that require tweaks to the regex tree
 *  only those changes will need to be configured in a tree for each respective 
 *  configuration deviatione (ex v16), then merged with the default/base regex tree
 *  
 * Need to find a better way to do regex's across the package.  The regular "match",
 *  on string function works, but also returns the entire full match in [0], then
 *  capture groups as nested array on [1].  
 *  - I know there is plenty of improvements to be made by only returning the match capture group [1]
 *  - and defining better capture groups (probably include lookarounds)
 * 
 * Need to also look into if .matchAll will help.  Seems to be available in NodeJS, 
 *  only in ECMA2020 TypeScript
 */

export class RegExTree {

    /**
     * extracts tmos version at beginning of bigip.conf
     */
    public tmosVersionReg = /#TMSH-VERSION: (\d.+)\n/;

    /**
     * if match, returns object name in [1] object value in [2]
     */
    private parentNameValueRegex = /([ \w\-\/.]+) {([\s\S]+?\n| )}/;

    /**
     * Parent tmos object regex
     * Extracts each parent tmos object starting with 
     *  (apm|ltm|security|net|pem|sys|wom|ilx|auth|analytics|wom), 
     *  then "{" and ending "}" just before next partent object
     */
    private parentObjectsRegex = this.multilineRegExp([
        // parent level object beginnings with trailing space
        /(apm|ltm|security|net|pem|sys|wom|ilx|auth|analytics|wom) /,  
        // include any child object definitions and object name
        /[ \w\-\/.]+/,
        // capture single line data or everything till "\n}\n"
        /({.*}\n|{[\s\S]+?\n}\n)/,
        // look forward to capture the last "}" before the next parent item name
        /(?=(apm|ltm|security|net|pem|sys|wom|ilx|auth|analytics|wom))/   
    ], 'g');

    /**
     * following regex will get pool, but not snat pool from vs config
     */
    private poolRegex = /(?<!source-address-translation {\n\s+)pool (.+?)\n/;
    private profilesRegex = /profiles {([\s\S]+?)\n    }\n/;
    private rulesRegex = /rules {([\s\S]+?)\n    }\n/;
    private snatRegex = /source-address-translation {([\s\S]+?)\n    }\n/;
    private ltPoliciesRegex = /policies {([\s\S]+?)\n    }\n/;
    private persistRegex = /persist {([\s\S]+?)\n    }\n/;
    private fallBackPersistRegex = /fallback-persistence (\/\w+.+?)\n/;

    /**
     * base regex tree for extracting tmos config items
     */
    private regexTree: TmosRegExTree = {
        parentObjects: this.parentObjectsRegex,
        parentNameValue: this.parentNameValueRegex,
        vs: {
            pool: this.poolRegex,
            profiles: this.profilesRegex,
            rules: this.rulesRegex,
            snat: this.snatRegex,
            ltpPolicies: this.ltPoliciesRegex,
            persist: this.persistRegex,
            fbPersist: this.fallBackPersistRegex
        }
    }

    constructor() {
        // take tmos version number, return regex tree with version specific tweaks
        
    }

    get(tmosVersion?: number): TmosRegExTree {
        const x = tmosVersion;
        return this.regexTree;
    }


    /**
     * used to produce final regex from multiline/commented regex
     * @param regs regex pieces in array
     * @param opts regex options (g/m/s/i/y/u/s)
     */
    private multilineRegExp(regs, opts: string) {
        return new RegExp(regs.map(reg => reg.source).join(''), opts);
    }
}



export type TmosRegExTree = {
    parentObjects: RegExp,
    parentNameValue: RegExp,
    vs: {
        pool: RegExp,
        profiles: RegExp,
        rules: RegExp,
        snat: RegExp,
        ltpPolicies: RegExp,
        persist: RegExp,
        fbPersist: RegExp
    }
}

// const regexTree = new RegExTree();
// export default regexTree;