#!/usr/bin/env node

var cli = require("cli");
var fs = require("fs");

var options = cli.parse({
    path: ["p", "Path to module", "path", process.cwd()],
    output: ["o", "Output file", "output", "module.js"]
});

var Builder = require("./lib/Builder");

var out = new Builder(options.path).build();



fs.writeSync(fs.openSync(options.output, "w"), out);
