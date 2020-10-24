

# f5-corkscrew

<p>&nbsp;</p>

## Overview

The intention for this project/rpm is to provide a common tool to extract tmos applications.  Taking a bigip.conf and extracting all it's configuration items to a form that can easily be searched and different functions performed, all with the intent of migrating the application to something like AS3.

Latest performance stats can be found here:
[testingStats](testingStats.md)

check out the: [CHANGE LOG](CHANGELOG.md) for details of the different releases

### Configuration objects supported in the parsing

- virtual servers and following associated/references profiles/objects:
    - persistence profile (including fall-back persistence)
    - pool
    - irules (not recursive at this time)
    - snat pool
    - local traffic policies (LTPs)
    - pool monitors
    - main stream profiles including http, tcp, clien/server-ssl profiles

<p>&nbsp;</p>

---

<p>&nbsp;</p>

## Tasks/Ideas

- Deeper app parsing
    - looking into digging/crawling the partitions for all configs (complete except for "default" profile information)
    - expand the discovery of pools referenced in irules, local traffic policies
        - this also includes references to other virtual servers and nodes
        - return this information in the app maps
    - what other things need to be added to the parsing?
        - oneConnect profiles?

- Object one-line output
    - Add the ability to return apps as single line objects like `tmsh list net self one-line`
    - There have been many times in the past where I have found that output to be incredibly useful, espcially for large configurations
    - It may have just as much value here
    - To accomodatet his, I would change the data structure of the app, which is currently just a string, to an array, where each item is an object that makes the total application
        - Then as part of the output, depending on a switch `--one-line`, remove line returns from each array item, then combine the array items with line returns to provide a single string like before

- Command line interface
    - this should provide a good way to just download the rpm, issue a command and get parsed apps
    - could be big with support and/or hard core command liners
    - initial version of the command line is available as a single command that returns most of the necessary information

- Exploring the idea of fully jsonifying the entire config
    - I belive this would provide the most flexible and scalable way to consume and search the config in totallity (became true...)
    - all parititions and even the bigip_base.conf could all be added to the same tree to provide a single place to search for eveything config related (at least for migrations) (cone)
    - the struggle is needing to create a function that will search the tree for an object key and return an array of matches including path and value (done)
    - this will allow us to further filter results as needed (done)
        - This approach seems to accomodate different profile types with the same name (done)
    - I also think this method will accomodate possible configuration nameing changes with different versions
        - we should be able to just search for path paramters after the key is found to find the right object type
    - this should also remove the need for the regex tree, or at least reduce it to a minimal size
    - 9.25.2020 - did find out that tmos will not allow conflicting names across the different profile/monitor types
        - this should make searching for an object eaiser
    - 10.24.2020 - ended up going to the "mostly" jsonified config at this point.  
        - Meaning just the parent objects have been converted, but the body has not
        - Searching specific object branches for information is way faster and native to the node engine
        - Focusing on this one data structure allow the removal of all the other ways the data was being held
            - resulting in much more efficient memory utilization
            - which also greatly improved performance
        - If/when we go the route of a fully jsonified config which can have it's benefits, I think it should be a seperate tree
            - This would allow for one to be used for raw config object extraction while the other would provide a way to search for specific object settins across the tree
                -For example, being able to see which virtual servers have port translation enabled, or what ssl profiles have a specific "SSL Option" enabled without having to regex the body of the original config

- a "sanitize" function to remove sensitive information and change IPs/names so configs can be shared as part of the process
    - replace all certificate references with the default f5 cert?
    - change hostname
    - IP address randmonizer
        - to change any and all ip addresses to randomly generated addresses or specify the range
        - This would be done in a one-to-one mapping to not break any of the associations across the config
    - object name obvuscator?
    - return just the config files, like a mini_ucs?

- an option to include the default profiles
    - add the profiles_base.conf file to the config and the app extraction should pick up those objects to provide a complete view of the settings

- Identify advanced configurations
    - At this time it means any advaned irule or policy that references other VIPs
        - The thought is that this type of configuration would need to be interpreted by the user anyway
        - The referenced vip will be available for extraction, so the user include it with any/all apps as needed
    - I do plan to support the discovery of referenced objects in pools and policies

### Performance enhancements

The initial parsing of the files seems to be the heaviest operation so far:
    - aside from the initial app config searching done through array looping and ucs/qkview searching

The current performance of a 6MB config file with almost 300vs, 223k lines, and over 13k tmos objects fully processed in about 20 seconds seems pretty good for this stage.  I think it would be acceptable for full processing to take up to a couple of minutes (with bigger configurations), given appropriate feedback with status/progress bars.  This would provide the user with information that a long running process is still "processing", without just sitting blank.

Furthermore, the stats being included for the different files, sizes, and processing times should provide adequate information to quickly identify what will be the next bottleneck (whether it's file size, object count, or if we can rely on VS count...?)

If/when we get to the point that we do need to increase performance, I have the following thoughts:

- The unpacking of UCS and kqviews
    - This is currently handled within node, where the entire file has to be loaded into memory, decompressed and specific files extracted.
    - This processing can be pushed to the local system by issueing local system commands to unpack the contents to a local system folder
        - This folder can be searched for the approprate files
        - may be easier to move the needed files to another directory so they can be quickly read recrusively (without filtering) and streamed in
    - This would offload the memory/processing footprint of the archive back to the local system from the node process
    - Should also be tracking file size/count at this step, so at the parsing step, we can make a decision to keep a copy of original config files or not
        - Don't keep anything over 50Mb? -> TBD

- loading of file content -> streaming
    - Right now, the full file is loaded into memory and passed into the main class to be parsed
        - This could be another bottleneck with big configurations (multiple/big files)
    - instead of the current fs.readFileSync, we could look at the fs.readFileStream to stream in the contents

- parsing the stream
    - after the file is loaded, a regex is used to collect all the parent objects "ltm node {...}"
        - this produces an array of matches, then each item in the array gets parsed into the json tree as {ltm: { node: { address: 1.1.1.1 }}}
        - each new tree is then merged back into the main tree to combine everything into a single json object
    - instead of pulling the entire file into memory and producing another array with all the parent objects (effectivily doubling the memory space),
        - we should be streaming in the file, regex a single parent object, removed that object from incoming file string, convert to json, merge with main tree, regex the next piece, repeat
        -  This should minimize memory usage as we stream/process chunks to the final json tree
            - This would also play into the decision to store the original configs for future processing or not

- Things to keep in mind as we ponder performance numbers:
    - Nodejs memory heap is limited to 2gig
    - The nodejs memory in vscode is further limited to 512Mb (for vscode-f5 integration)
    - I don't think I've ever seen a UCS bigger than ~50Mb
    - I don't think I've ever seen a qkview bigger than ~300Mb
    - a 6Mb bigip.conf gets zippped (compressed) down to ~340k (this might be a corner case...)
    - my 80k mini_ucs get's compressed to 32k
    - I have rarely heard of any configs with more than 10k+ VS
        - So a reasonable guestimate could assume we shouldn't see any object counts over 100k

> My point here is that we have a general idea of how big the configs can get and that we are not looking to support 100k Virtual servers and 1m+ objects, or file sizes pushing several hundred Mb or even Gb.  This tells me that we should be able to accomplish the goals envisioned with the project without any red flags or big unknowns that could push the architecture or development path in a completely different direction (custom C/rust parser engine kinda stuff)


<p>&nbsp;</p>

---

<p>&nbsp;</p>

## Exclusions

The following items are excluded from application extraction since the main goal of this is for transitioning to AS3
- certificates
    - not only are these sensitive, but also probably need to be create and associated with the AS3 declaration as part of the automation process
- system settings?
- APM/ASM policies - for now...  maybe whatever APM config is in the config files

<p>&nbsp;</p>

---

<p>&nbsp;</p>

## Architecture

<p>&nbsp;</p>

### TypeScript and JSDOC

The whole thing is written in TypeScript and heavigly documented with JSDoc.  If you use vscode with this setup, you will see all the jsdoc information as you hover over different variables and functions.  

Even though this was written in TypeScript, it can be used in any node project.  This project is compiled to JS and the TS typing are there as needed

<p>&nbsp;</p>

### BigipConfig class

Right now, the main piece is the BigipConfig class in the ltm.ts file.  This class is what takes in the bigip.conf at initiation.  From there different functions can be called to get different information

<p>&nbsp;</p>

### Logger class

The logger class is a simple logger implementation that collect all the logs througout processing and provides a way to return them as part of the response back.  This is mainly to provide some feedback into what is happening without having to straight to debugging node directly.

Trying not to pollute the command line with a bunch of errors, So we catch and log all errors to the logger and the logs can be returned to the user as needed


<p>&nbsp;</p>

### Regex class

The regex class provides a way to structure the different regexs needed to parse the different pieces of information.  I feel that the json tree is not only a good way to hold and access all the regex's, but also an easy way to update pieces of the tree depending on tmos configuration variances of different code versions.  In short, if pools are reference differently in v17, a flag that updates that single regex can easily be configured with mininmal impact to everything else.

Some example modifications have been documented in the function

<p>&nbsp;</p>

### A fully `jsonified` config

I have the idea that the TMOS config loosely represents a json structure.  The parent tmos objects look like names json objects and everything else can end up being a regular object attribute as a "key": "value" pair.

If you check out the output of the `configObjects` class var, you will see a browsable json tree of the parent objects.  What this could mean, is that the entire config could be jsonified, then searched for the needed data without the need for breaking things down with the regex tree.  This could make data search and extraction very quick and efficient.  The main downside to that, is that it is going to reguire some good js/json foo to be able to search and extract the necessary information.  I feel like we are halfway there...

<p>&nbsp;</p>

### Mocha tests

the test file `bigip.conf_1.test.ts` abuses the mocha testing suite to run the code as I have been developing. It's my intent to move more in the direction of test driven development, but I need to think and discuss with others about different approches I have been looking at.


<p>&nbsp;</p>

### Example

We load a config from a file or get it through some other means, like api POST...
```js
const devCloud01 = fs.readFileSync(path.join(__dirname, "artifacts", "devCloud01_9.17.2020.conf"), "utf-8");
```
<p>&nbsp;</p>

Then we create and initialize the class as follows:
```js
const devCloud = new BigipConfig();
```
> UPDATE:  with the parsing of archives, no data is provided at instantiation, now a .load('ucs/qkview/file/path') function is provided to load the data.  After loading, one can execute the .parse() function to parse the configs or parse will happen automatically with the .explode() function (which just returns most of the necessary data)

<p>&nbsp;</p>

The .apps() function returns an array of objects if no parameter is supplied.  However, you can feed it a list of apps (vs names) for it to return configurations for
```json
[{
    "name": "vs_name",
    "config": "extracted_app_config",
    "map": "src->dst IPs"
}]
```

<p>&nbsp;</p>

The .logs() function returns a log of the extraction process.  It is recommended to call this to get the logs if any one of the previous functions do not return a value

<p>&nbsp;</p>

The top of the main class also describes some of the different ways I have the the initial breakdown of the parent objects.  These are public definitions on the class which can be access directly: `const x = devCloud.configMultiLevelObjects`

```js
    /**
     * tmos config as nested json objects 
     * - consolidated parant object keys like ltm/apm/sys/...
     */
    public configObjects: goodBigipObj = {};
```

<p>&nbsp;</p>

---

<p>&nbsp;</p>

## Test file output

This includes most of the different pieces all in a single text file for example.  This is way easier to read all the text output without being serialized for JSON structure.

Updated as of 10.8.2020

> latest test output file [devCloud01_conversionOutput.txt](./devCloud01_conversionOutput.txt)

<p>&nbsp;</p>

---

<p>&nbsp;</p>

## JSON output

theoretical full json output should produce the following in an api form

```json
{
    "id": "<task-id-uuid>",
    "date": "<date-time>",
    "config": {
        "rawConfig": "<original-bigip.conf-as-string>",
        "apps": [{
            "name": "<app-name=>VSname>",
            "config": "<full-tmos-app-config>",
            "map": "<map-of-vs-to-destinations-for-dashboards>"
        }]
    },
    "stats": {
        "processTime": "<total-processing-duration-in-ms>",
        "sourceTmosVersion": "<ex. 15.1.0.1>",
        "totalTmosObjects": "<total number of tmos objects extracted from config",
        "ltm": {
            "virtuals": "<number of virtuals detected>",
            "pools": "<number of pools detected",
            "profiles": "<number of profiles detected (client/server/ssl, tcp, udp, http, ...)>",
            "irules": "<number of irules detected>",
            "snatPools": "<number of snat pools detected>",
            "localTrafficPolicies": "<number of local traffic policies>"
        },
        "apm": {
            "accessProfiles": "<number of access profiles>",
            "accessPolicies": "<number of access policies>"
        }
    },
    "logs": "<logs about config processing>"
}
```



<p>&nbsp;</p>

---

<p>&nbsp;</p>

## Getting Started

Please see Install and Usage below

<p>&nbsp;</p>

---

<p>&nbsp;</p>

## Installation

Aside from trying to incorporat this rpm into another nodejs project (not recommneded in this early stage), there is the command line utility.

Corkscrew comes with a simple command line utility.  This utility takes in a bigip.conf and produces the output of the "explode" function, which pretty much runs through all current functionality.  This output is in json formate and is intented to be parsed with tools like "jq"

### To get the command line utility

1. Make sure you have node installed with NPM

    ```bash
    ted@thanos:~$ node --version && npm --version
    v10.19.0
    6.13.4
    ```

2. Run the following command to download the rpm

        `npm install -g https://github.com/f5devcentral/f5-corkscrew.git`

3. Run `corkscrew` to confirm installation status

    ```bash
    ted@thanos:/mnt/c/Users/bunoo/f5-corkscrew/src/tests$ node --version
    v10.19.0
    ted@thanos:/mnt/c/Users/bunoo/f5-corkscrew/src/tests$ npm --version
    6.13.4
    ted@thanos:/mnt/c/Users/bunoo/f5-corkscrew/src/tests$ corkscrew
    cli.js <command>

    Commands:
    cli.js explode <file>  explode bigip.conf to apps

    Options:
    --help     Show help                                                                                         [boolean]
    --version  Show version number                                                                               [boolean]

    A command is required
    ```

### Getting updates

Since the package is not published to NPM and it is installed directly from the repo, I'm not sure how to track any of the version information so you can easily update when a new version is released.

It seems the only route at this time is to uninstall the package, make sure the directory is deleted, and re-install the packge, which should get the latest version


<p>&nbsp;</p>

---

<p>&nbsp;</p>

## Usage

The npm install should link the corkscrew cli scrit with global search paths, so it should be able to be called from anywhere node/npm knows about

### Basic -> Run corkscrew command to process bigip.conf

example:  `corkscrew explode <./path/to/bigip.conf>`

> NOTE:  It is highly recommended to utilize a tool like "jq" to be able to parse the output as needed

> NOTE:  It is also recommended to pipe the ouput of the explode command to a file so parsing/processing happens once.

### Recommendd -> corkscrew output to file and processed with jq

https://shapeshed.com/jq-json/

Execute corkscrew and pipe the results to a file 

```bash
ted@thanos:/tests$ corkscrew explode ./path/to/bigip.conf >> demo.json
```

How to list app names (vs)

```bash
ted@thanos:/tests$ echo demo.json | jq .config.apps[].name
"/Common/app1_t80_vs"
"/Common/app1_t443_vs"
"/Common/app2_t80_vs"
"/Common/app2_t443_vs"
"/Common/app3_t8443_vs"
"/Common/app4_t80_vs"
"/Common/forwarder_net_0.0.0.0"
```

Get app by array number

```bash
ted@thanos:/mnt/c/Users/bunoo/f5-corkscrew/src/tests$ cat demo.json | jq .config.apps[2]
{
  "name": "/Common/app2_t80_vs",
  "config": "ltm virtual /Common/app2_t80_vs {\n    creation-time 2020-09-17:08:50:22\n    destination /Common/192.168.2.21:80\n    ip-protocol tcp\n    last-modified-time 2020-09-17:08:51:07\n    mask 255.255.255.255\n    profiles {\n        /Common/http { }\n        /Common/tcp { }\n    }\n    rules {\n        /Common/_sys_https_redirect\n    }\n    serverssl-use-sni disabled\n    source 0.0.0.0/0\n    translate-address enabled\n    translate-port enabled\n}\n"
}
```

How to list keys of the parent object

```bash
ted@thanos:/tests$ echo demo.json | jq keys
[
  "config",
  "dateTime",
  "id",
  "logs",
  "stats"
]
```

How to show the details of a nested object

```bash
ted@thanos:/tests$ echo demo.json | jq .stats
{
  "configBytes": 57711,
  "lineCount": 1125,
  "objectCount": 153,
  "objects": {
    "virtuals": 7,
    "profiles": 6,
    "policies": 2,
    "pools": 7,
    "irules": 5,
    "monitors": 6,
    "nodes": 10,
    "snatPools": 1
  },
  "parseTime": 5.4783,
  "appTime": 6.7522,
  "packTime": 1.39
}
```

Examples on how to fetch individual json object details
```bash
ted@thanos:/tests$ echo demo.json | jq .id
"3a07cc36-781c-4183-8fb8-4858a5bab6a7"
ted@thanos:/tests$ echo demo.json | jq .dateTime
"2020-10-08T18:43:29.732Z"
```


<p>&nbsp;</p>

---

<p>&nbsp;</p>

## Development

1. Fork the repo to your own account
2. Create a branch to work on desired feature/fix
3. submit pull request back to original repo pointing back to your updated branch

At a minimum JSDoc practices should be followed to document code and function.  Heavey comments will really help the integration/merge process.

Please include some sort of tests for any new features or functionality.  It's really the only way to develop on this since there is no main app to run the functions

<p>&nbsp;</p>

---

<p>&nbsp;</p>

## Support

For support, please open a GitHub issue.  Note, the code in this repository is community supported and is not supported by F5 Networks.  For a complete list of supported projects please reference [SUPPORT.md](support.md).

<p>&nbsp;</p>

---

<p>&nbsp;</p>

## Community Code of Conduct
Please refer to the [F5 DevCentral Community Code of Conduct](code_of_conduct.md).

<p>&nbsp;</p>

---

<p>&nbsp;</p>

## License
[Apache License 2.0](LICENSE)

<p>&nbsp;</p>

---

<p>&nbsp;</p>

## Copyright
Copyright 2014-2020 F5 Networks Inc.

<p>&nbsp;</p>

### F5 Networks Contributor License Agreement

Before you start contributing to any project sponsored by F5 Networks, Inc. (F5) on GitHub, you will need to sign a Contributor License Agreement (CLA).

If you are signing as an individual, we recommend that you talk to your employer (if applicable) before signing the CLA since some employment agreements may have restrictions on your contributions to other projects.
Otherwise by submitting a CLA you represent that you are legally entitled to grant the licenses recited therein.

If your employer has rights to intellectual property that you create, such as your contributions, you represent that you have received permission to make contributions on behalf of that employer, that your employer has waived such rights for your contributions, or that your employer has executed a separate CLA with F5.

If you are signing on behalf of a company, you represent that you are legally entitled to grant the license recited therein.
You represent further that each employee of the entity that submits contributions is authorized to submit such contributions on behalf of the entity pursuant to the CLA.