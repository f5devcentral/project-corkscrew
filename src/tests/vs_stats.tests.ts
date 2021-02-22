import { parseVS } from '../vs_stats';

const htmlString = `
show /ltm virtual all-properties

-----------------------------------------------------------
Ltm::Virtual Server: /Common/VS-146.20.176.0-443
-----------------------------------------------------------
Status                         
  Availability     : offline
  State            : enabled
  Reason           : The children pool member(s) are down
  CMP              : enabled
  CMP Mode         : all-cpus
  Destination      : 172.24.201.0:443
  PVA Acceleration : none

Traffic                          ClientSide   Ephemeral      General
  Bits In                               960           0            -
  Bits Out                             1.8K           0            -
  Packets In                              3           0            -
  Packets Out                             5           0            -
  Current Connections                     0           0            -
  Maximum Connections                     2           0            -
  Total Connections                       2           0            -           
  Min Conn Duration/msec                  -           -        45.1K
  Max Conn Duration/msec                  -           -        45.1K
  Mean Conn Duration/msec                 -           -        45.1K
  Total Requests                          -           -            0

SYN Cookies                    
  Status                         not-activated
  Hardware SYN Cookie Instances           0
  Software SYN Cookie Instances           0
  Current SYN Cache                       0
  SYN Cache Overflow                      0
  Total Software                          0
  Total Software Accepted                 0
  Total Software Rejected                 0
  Total Hardware                          0
  Total Hardware Accepted                 0

CPU Usage Ratio (%)            
  Last 5 Seconds                          0
  Last 1 Minute                           0
  Last 5 Minutes                          0

-----------------------------------------------------------
Ltm::Virtual Server: /Common/VS-146.20.176.0-80
-----------------------------------------------------------
Status                         
  Availability     : offline
  State            : enabled
  Reason           : The children pool member(s) are down
  CMP              : enabled
  CMP Mode         : all-cpus
  Destination      : 172.24.201.0:80
  PVA Acceleration : none

Traffic                          ClientSide   Ephemeral      General
  Bits In                              3.2K           0            -
  Bits Out                             2.1K           0            -
  Packets In                             10           0            -
  Packets Out                             6           0            -
  Current Connections                     0           0            -
  Maximum Connections                     2           0            -
  Total Connections                       5           0            -           
  Min Conn Duration/msec                  -           -         3.3K
  Max Conn Duration/msec                  -           -         3.3K
  Mean Conn Duration/msec                 -           -         3.3K
  Total Requests                          -           -            0

SYN Cookies                    
  Status                         not-activated
  Hardware SYN Cookie Instances           0
  Software SYN Cookie Instances           0
  Current SYN Cache                       0
  SYN Cache Overflow                      0
  Total Software                          0
  Total Software Accepted                 0
  Total Software Rejected                 0
  Total Hardware                          0
  Total Hardware Accepted                 0

CPU Usage Ratio (%)            
  Last 5 Seconds                          0
  Last 1 Minute                           0
  Last 5 Minutes                          0

`;


const result = parseVS( htmlString );
console.log( result );