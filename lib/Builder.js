"use strict";

var ilk = require("ilk");
var parts = require("parts");
var path = require("path");

module.exports = ilk.tokens(function (
    fs,
    root,
    json,
    parent,
    assets,
    modules,
    name,

    fetch,
    fetchContents,
    fetchJson,
    fetchAssets,
    fetchModules,
    modulePath,
    hasModule,
    moduleDir,
    resolveMissingModules,
    assemble,
    resolveAncestorModule,
    createSubModule
) {

    var Builder = ilk(function (pRoot, pFs) {
        fs.mark(this, pFs || require("fs"));
        root.mark(this, pRoot);
        name.mark(this, null);
        parent.mark(this, null);
        json.mark(this);
        assets.mark(this, {});
        modules.mark(this, {});
    }).

    shared({
        fetchContents: fetchContents,
        fetchJson: fetchJson,
        fetchAssets: fetchAssets,
        fetchModules: fetchModules,
        resolveMissingModules: resolveMissingModules,
        assemble: assemble,
        assets: assets,
        modules: modules,
        json: json,
        resolveAncestorModule: resolveAncestorModule,
        modulePath: modulePath,
        parent: parent,
        fetch: fetch,
        createSubModule: createSubModule,
        name: name,
        moduleDir: moduleDir,
        hasModule: hasModule
    }).

    proto(fetchJson, function () {
        this[json] = JSON.parse(this[fetch]("module.json"));

        if (!this[json].assets) {
            this[json].assets = [];
        }

        if (!this[json].modules) {
            this[json].modules = [];
        }
    }).

    proto(fetch, parts.args(function (args) {
        var file = path.join.apply(null, [this[root]].concat(args));
        return this[fs].readFileSync(file);
    })).

    proto(fetchAssets, parts.that(function (that) {
        this[json].assets.forEach(function (asset) {
            that[assets][asset] = that[fetch](asset + ".js");
        });

        if (!("/module" in this[assets])) {
            this[assets]["/module"] = this[fetch]("/module.js");
        }
    })).

    proto(fetchModules, parts.that(function (that) {
        this[json].modules.forEach(function (module) {
            var moduleRoot, builder;
            if (that[hasModule](module)) {
                that[modules][module] = that[createSubModule](module);
            }
        });
    })).

    proto(createSubModule, function (module) {
        var builder = new Builder(this[moduleDir](module), this[fs]);
        builder[name] = module;
        builder[parent] = this;
        builder[fetchContents]();
        return builder;
    }).

    proto(hasModule, function (module) {
        try {
            return this[fs].statSync(this[moduleDir](module)).isDirectory();
        } catch (e) {
            if (e.code === "ENOENT") {
                return false;
            }

            throw e;
        }
    }).

    proto(fetchContents, function () {
        this[fetchJson]();
        this[fetchAssets]();
        this[fetchModules]();
    }).

    proto(moduleDir, function (module) {
        return path.join(this[root], "node_modules", module);
    }).

    proto(modulePath, function () {
        return this[parent] === null?
            this[name]:
            parts.format("%s/%s",
                    [this[parent][modulePath](), name]);
    }).

    proto(resolveMissingModules, parts.that(function (that) {
        this[json].modules.forEach(function (module) {
            if (module in that[modules]) {
                that[modules][module][resolveMissingModules]();
            } else {
                that[modules][module] = that[resolveAncestorModule](module)
                    [modulePath]();
            }
        });
    })).

    proto(resolveAncestorModule, function (module) {
        if (this[parent] === null) {
            throw new Error(parts.format(
                "Could not resolve module: %s under %s",
                [module, this[root]]));
        }

        try {
            return parts.isObject(this[parent][modules][module])?
                this[parent][modules][module]:
                this[parent][resolveAncestorModule](module);
        } catch (e) {
            throw new Error(parts.format(
                "Could not resolve module: %s under %s",
                [module, this[root]]));
        }
    }).

    proto(assemble, parts.that(function (that) {
        var out = "{";

        out += parts.map(that[assets], function (asset, name) {
            return parts.format("%s:%s", [
               JSON.stringify(name),
               parts.format("function () { %s }", [asset])]);
        }).join(",");

        var modulesOut = parts.map(that[modules], function (module, name) {
            return parts.format("%s:%s", [
                JSON.stringify(name),
                parts.isString(module)?
                    JSON.stringify(module):
                    module[assemble]()]);
        }).join(",");

        if (modulesOut) {
            out += "," + modulesOut;
        }


        out += "}";

        return out;
    })).

    proto({

        build: function () {
            this[fetchContents]();
            this[resolveMissingModules]();
            return this[assemble]();
        }

    });

    return Builder;

});
