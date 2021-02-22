import { parseRule } from '../rule_stats';

const cmdoutput = `
-----------------------------------------------------------
Ltm::Rule Event: /Common/AFM-FILTER-TEST:DNS_REQUEST
-----------------------------------------------------------
Priority                             500 
Executions             
  Total                                0
  Failures                             0
  Aborts                               0
CPU Cycles on Executing
  Average                              0
  Maximum                              0
  Minimum                              0

-----------------------------------------------------------
Ltm::Rule Event: /Common/ALLOW-TO-ERAZFCSQLD1:FLOW_INIT
-----------------------------------------------------------
Priority                             500 
Executions             
  Total                              637
  Failures                             0
  Aborts                               0
CPU Cycles on Executing
  Average                          70.7K
  Maximum                         218.7K
  Minimum                          15.4K

-----------------------------------------------------------
Ltm::Rule Event: /Common/ALLOW-TO-ERAZFCSQLP1:FLOW_INIT
-----------------------------------------------------------
Priority                             500 
Executions             
  Total                            60.6K
  Failures                             0
  Aborts                               0
CPU Cycles on Executing
  Average                          76.3K
  Maximum                         567.0K
  Minimum                          10.2K


`;


const result = parseRule( cmdoutput );
console.log( result );