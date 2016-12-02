"use strict";

var Builder = require("../../lib/Builder");
var path = require("path");
var parts = require("parts");

var gabarito = require("gabarito");
var assert = gabarito.assert;
var matcher = gabarito.matcher;


var fs;
var builder;
var root = "root";
var files;
var shared;
var MyBuilder;

var unique = (function () {
    var counter = 0;

    return function () {
        counter += 1;
        return String(counter);
    };
}());

gabarito.
test("Builder").

before(function () {
    files = {};

    fs = {
        readFileSync: gabarito.spy(function (file) {
            file = file.substr(5);
            return file in files?
                parts.isString(files[file])?
                files[file]:
                JSON.stringify(files[file]):
                null;
        }),

        statSync: gabarito.spy(function () {
            return { isDirectory: gabarito.spy(parts.constant(true)) };
        })
    };

    shared = {};

    MyBuilder = Builder.descend(shared);

    builder = new MyBuilder(root, fs);
}).

clause("build should fetchContents, resolveMissingModules and return assemble",
function () {
    var assembleContents = unique();

    builder[shared.fetchContents] = gabarito.spy();
    builder[shared.resolveMissingModules] = gabarito.spy();
    builder[shared.assemble] = gabarito.spy(parts.constant(assembleContents));

    var out = builder.build();

    assert.that(out).sameAs(assembleContents);

    builder[shared.fetchContents].verify();
    builder[shared.resolveMissingModules].verify();
    builder[shared.assemble].verify();
}).

clause(
"assemble should build the string with the literal for the assets and " +
"submodules",
function () {
    var asset = unique();
    var module = unique();
    var innerModule = unique();

    files["module.json"] = {
        assets: ["/asset"],
        modules: ["module"]
    };

    files["module.js"] = parts.format("return String(%s);", [module]);
    files["asset.js"] = parts.format("return String(%s);", [asset]);

    files["node_modules/module/module.json"] = {};
    files["node_modules/module/module.js"] =
        parts.format("return String(%s);", [innerModule]);

    var body = builder.build();
    var out = (new Function("return " + body + ";"))();

    assert.that(out["/asset"]()).sameAs(asset);
    assert.that(out["/module"]()).sameAs(module);
    assert.that(out.module["/module"]()).sameAs(innerModule);
}).

clause("assemble should call the assemble on submodules", function () {
    var submodule = {};
    submodule[shared.assemble] = gabarito.spy(parts.constant({}));
    builder[shared.modules].submodule = submodule;

    builder[shared.assemble]();

    submodule[shared.assemble].verify();
}).

clause(
"resolveMissingModules should call resolveMissingModules in submodules if it " +
"is present",
function () {
    builder[shared.json] = {
        assets: [],
        modules: ["submodule"]
    };

    var submodule = {};
    submodule[shared.resolveMissingModules] = gabarito.spy();

    builder[shared.modules].submodule = submodule;

    builder[shared.resolveMissingModules]();

    submodule[shared.resolveMissingModules].verify();
}).

clause(
"resolveMissingModules should resolveAncestorModules and call for modulePath " +
"for every missing module",
function () {
    builder[shared.json] = {
        assets: [],
        modules: ["submodule"]
    };

    var ancestorModule = {};
    ancestorModule[shared.modulePath] = gabarito.spy();

    builder[shared.resolveAncestorModule] =
        gabarito.spy(parts.constant(ancestorModule));

    builder[shared.resolveMissingModules]();

    builder[shared.resolveAncestorModule].verify().args("submodule");
    ancestorModule[shared.modulePath].verify();
}).

clause(
"resolveAncestorModule should throw if the builder has no parent builder",
function () {
    var thrown = false;
    try {
        builder[shared.resolveAncestorModule]("module");
    } catch (e) {
        thrown = true;
        assert.that(e.message).isEqualTo(
            parts.format("Could not resolve module: %s under %s",
                ["module", root]));

    }

    assert.that(thrown).isTrue();
}).

clause(
"resolveAncestorModule should return the reference builder if found on the " +
"parent builder", function () {
    var parent = {};
    parent[shared.modules] = { "ancestor": {} };

    builder[shared.parent] = parent;

    var ancestor = builder[shared.resolveAncestorModule]("ancestor");

    assert.that(ancestor).sameAs(parent[shared.modules].ancestor);
}).

clause(
"resolveAncestorModule should ask for the parent builder to resolve the " +
"ancestor module if not found on the parent builder", function () {
    var parent = {};
    parent[shared.modules] = {};
    parent[shared.resolveAncestorModule] = gabarito.spy();

    builder[shared.parent] = parent;

    builder[shared.resolveAncestorModule]("ancestor");

    parent[shared.resolveAncestorModule].verify();
}).

clause(
"resolveAncestorModule should throw a new error in case the parent resolve " +
"ancestor module throws", function () {
    var parent = {};
    parent[shared.modules] = {};
    parent[shared.resolveAncestorModule] = function () { throw new Error(); };
    builder[shared.parent] = parent;

    var thrown = false;

    try {
        builder[shared.resolveAncestorModule]("ancestor");
    } catch (e) {
        thrown = true;
        assert.that(e.message).isEqualTo(
            parts.format("Could not resolve module: %s under %s",
                ["ancestor", root]));
    }

    assert.that(thrown).isTrue();
}).

clause("fetchContents should fetchJson, fetchAssets and fetchModules",
function () {
    builder[shared.fetchJson] = gabarito.spy();
    builder[shared.fetchAssets] = gabarito.spy();
    builder[shared.fetchModules] = gabarito.spy();

    builder[shared.fetchContents] ();

    builder[shared.fetchJson].verify();
    builder[shared.fetchAssets].verify();
    builder[shared.fetchModules].verify();
}).

clause(
"fetchJson should read the \"module.json\" under root folder and parse it as " +
"json", function () {
    files["module.json"] = { value: unique() };

    builder[shared.fetchJson]();

    assert.that(builder[shared.json].value).sameAs(files["module.json"].value);
}).

clause("fetchJson should put an empty array under \"assets\" if missing",
function () {
    files["module.json"] = {};

    builder[shared.fetchJson]();

    assert.that(builder[shared.json].assets).isEqualTo([]);
}).

clause("fetchJson should put an empty array under \"modules\" if missing",
function () {
    files["module.json"] = {};

    builder[shared.fetchJson]();

    assert.that(builder[shared.json].modules).isEqualTo([]);
}).

clause("fetch should fetch the file contents relative to the root dir",
function () {
    files["file"] = unique();

    var content = builder[shared.fetch]("file");

    assert.that(content).isEqualTo(files["file"]);
}).

clause(
"fetchAssets should fetch each asset and put under the assets dictionary",
function () {
    files["asset1.js"] = unique();
    files["asset2.js"] = unique();
    files["asset3.js"] = unique();

    builder[shared.json] = { assets: ["/asset1", "/asset2", "/asset3"] };

    builder[shared.fetchAssets]();

    assert.that(builder[shared.assets]["/asset1"]).sameAs(files["asset1.js"]);
    assert.that(builder[shared.assets]["/asset2"]).sameAs(files["asset2.js"]);
    assert.that(builder[shared.assets]["/asset3"]).sameAs(files["asset3.js"]);
}).

clause("fetchAssets should fetch \"/module\" asset if missing", function () {
    files["module.js"] = unique();

    builder[shared.json] = { assets: [] };

    builder[shared.fetchAssets]();

    assert.that(builder[shared.assets]["/module"]).sameAs(files["module.js"]);
}).

clause(
"fetchModules should create a submodule if it exists and put it into the " +
"modules dictionary", function () {
    builder[shared.json] = { modules: ["submodule"] };

    var submodule = {};
    builder[shared.createSubModule] = gabarito.spy(parts.constant(submodule));

    builder[shared.fetchModules]();

    builder[shared.createSubModule].verify().args("submodule");
    assert.that(builder[shared.modules].submodule).sameAs(submodule);
}).

clause(
"createSubModule should create a new builder for the module, set it's name, " +
"set itself as the builder's parent and tell it to fetch its contents",
function () {
    files["node_modules/submodule/module.json"] = {};
    files["node_modules/submodule/module.js"] = unique();


    var submodule = builder[shared.createSubModule]("submodule");

    assert.that(submodule[shared.name]).sameAs("submodule");
    assert.that(submodule[shared.parent]).sameAs(builder);

    assert.that(submodule[shared.assets]["/module"]).
        sameAs(files["node_modules/submodule/module.js"]);
}).

clause("moduleDir should build the submodule's directory", function () {
    var dir = builder[shared.moduleDir]("submodule");

    assert.that(dir).sameAs("root/node_modules/submodule");
}).

clause(
"hasModule should check if the submodule's directory is an actual directory",
function () {
    builder[shared.hasModule]("submodule");

    var grabber = matcher.grabber();

    fs.statSync.verify().
        args("root/node_modules/submodule").
        returning(grabber);

    grabber.grab().isDirectory.verify();
}).

clause("hasModule should return false if the path isn't a directory",
function () {
    fs.statSync = parts.constant({ isDirectory: parts.constant(false) });

    var out = builder[shared.hasModule]("submodule");

    assert.that(out).isFalse();
}).


clause("hasModule should return false if the directory doesn't exist",
function () {
    fs.statSync = function () {
        var error = new Error();
        error.code = "ENOENT";
        throw error;
    };

    var out = builder[shared.hasModule]("submodule");

    assert.that(out).isFalse();
}).

clause("hasModule should rethrow the error if the code is anything else",
function () {
    var error = new Error();
    error.code = "YOMOMMA";

    var thrown = false;
    fs.statSync = function () {
        throw error;
    };

    try {
        builder[shared.hasModule]("submodule");
    } catch (e) {
        thrown = true;
        assert.that(e).sameAs(error);
    }

    assert.that(thrown).isTrue();
}).


after(parts.k);
