export declare type ParseResp = {
    totalObjectCount: number;
    ltmObjectCount: number;
    lineCount: number;
    parseTime: number;
    fullObj: unknown;
};
/**
 * turns tmos config file parent objects to json tree
 * *** the original parse function in the main ltm config
 *  is still better than this***
 *      Not only is it about 20% faster, but it is also able
 *      to convert all parent objects
 *
 * I presume this is becuase the objects get staged in an array
 *  before conversion and merging into the tree
 *
 * @param config tmos config as a string
 */
export declare function parseTmosConfig(config: string): ParseResp;