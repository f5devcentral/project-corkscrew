import { boolean } from "yargs";

export function parseRule( cmdout: string ) {
    
    return ParseRuleStats(cmdout.split("\n"))
}
function ParseRuleStats(myArray: Array<string>) {
    // const regex = /Rule\sEvent:\s+(.*)/g;
    // let rule_name;
    // let rule_names = new Array();      //declaration 
    // while ((rule_name = regex.exec(myArray)) !== null) {
    // // This is necessary to avoid infinite loops with zero-width matches
    //     if (rule_name.index === regex.lastIndex) {
    //         regex.lastIndex++;
    //     }
    //     // The result can be accessed through the `m`-variable.
    //     const temp= rule_name[1];
    //     rule_names.push(temp);
    // }
    let rule_name
    let rule_priority
    let total_executions
    let failures
    let aborts
    let average
    let maximun
    let minimun
    const result = {}

    for (const line of myArray) {
        const line_arrray = line.split(" ")
        if (line.startsWith('Ltm::Rule Event')) {
            rule_name = line_arrray[line_arrray.length-1]
            console.log(rule_name)
        }
        else if (line.startsWith('Priority')) {
            rule_priority = line_arrray[line_arrray.length-2]
            console.log(rule_priority)
        }
        else if (line.startsWith('  Total')) {
            total_executions = line_arrray[line_arrray.length-1]
            console.log(total_executions)

        }
        else if (line.startsWith('  Failures')) {
            failures = line_arrray[line_arrray.length-1]
            console.log(failures)

        }
        else if (line.startsWith('  Aborts')) {
            aborts = line_arrray[line_arrray.length-1]
            console.log(aborts)

        }

        else if (line.startsWith('  Average')) {
            average = line_arrray[line_arrray.length-1]
            console.log(average)

        }
        else if (line.startsWith('  Maximum')) {
            maximun = line_arrray[line_arrray.length-1]
            console.log(maximun)

        }
        else if (line.startsWith('  Minimum')) {
            minimun = line_arrray[line_arrray.length-1]
            console.log(minimun)
            result[rule_name] = {
                 "priority":rule_priority,
                 "executions":{"total":total_executions,
                              "failures": failures,
                              "aborts": aborts, 
                              },
                 "cpu_cycles_on_executing":{
                     "average":average,
                     "maximun":maximun,
                     "minimum":minimun
                 }             
            }
        }
    }
        console.log(result)
    return result
    }