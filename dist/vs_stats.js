"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseVS = void 0;
function parseVS(cmdout) {
    const obj = {};
    const res = cmdout.split("Ltm::").slice(1);
    for (const i in res) {
        const line = res[i].split("\n");
        const vs_name = line[0].split(" ")[2];
        const result = {};
        result['status'] = mapListDic(line.slice(3, 10));
        result['cpu_usage_ratio'] = mapListDic1(line.slice(37, 40), ' ');
        result['syn cookies'] = mapListDic1(line.slice(25, 34), ' ');
        result['traffic'] = mapListDic1(line.slice(12, 23), ' ', true);
        obj[vs_name] = result;
    }
    // console.log(obj)    
    return obj;
}
exports.parseVS = parseVS;
function mapListDic(myArray) {
    const obj = {};
    for (const value of myArray) {
        obj[value.split(':')[0].trim()] = value.split(':')[1].trim();
        //console.log(myMap)
    }
    // console.log(obj)
    return obj;
}
function mapListDic1(myArray, separator, traffic = false) {
    const myMap = {};
    for (let value of myArray) {
        value = value.trim().replace(/\s\s+/g, ' ');
        const ls = value.split(separator);
        if (traffic == true) {
            const namekey = ls.slice(0, ls.length - 3).join(" ");
            myMap[namekey] = {
                "ClientSide": ls[ls.length - 3],
                "Ephemeral": ls[ls.length - 2],
                "General": ls[ls.length - 1]
            };
            //console.log(obj1)
        }
        else {
            myMap[ls.slice(0, ls.length - 1).join(" ")] = ls[ls.length - 1];
        }
    }
    // console.log(myMap)
    return myMap;
}
//# sourceMappingURL=vs_stats.js.map