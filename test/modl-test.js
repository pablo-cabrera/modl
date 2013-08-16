(function(global) {
    "use strict";

    var YUITest = global.YUITest || require("yuitest"),
        root = (typeof exports !== "undefined" && global.exports !== exports) ? process.cwd() + "/" : "../",
        modl = global.modl || require(root + "/lib/modl"),
        Assert = YUITest.Assert,

        resume = function(f) {
            return function() {
                var args = Array.prototype.slice.call(arguments);
                test.resume(function() {
                    return f.apply(this, args);
                });
            };
        },

        test = new YUITest.TestCase({

            setUp: function() {
                modl.setup({
                    "root" : root + "test-runner",
                    "debug": false
                });
            },

            name: "modl-test",

            _should: {
                error: {
                    "should break when there are 2 aliases with the same name" : "Alias clash: x"
                }
            },

            "should have a modl object as first argument and an imports object as second": function() {
                modl.
                exports(resume(function(modl, imports) {
                    Assert.isObject(modl);
                    Assert.isObject(modl.exports);
                    Assert.isObject(imports);
                    Assert.areSame(modl.imports, imports);
                }));

                test.wait();
            },

            "should load a local asset": function() {
                modl.
                require("/LocalAsset").
                exports(resume(function(modl, imports) {
                    Assert.isObject(imports["LocalAsset"]);
                }));

                test.wait();
            },

            "should load a single module": function() {
                modl.
                require("mod-a").
                exports(resume(function(modl, imports) {
                    Assert.isObject(imports["mod-a"]);
                }));

                test.wait();
            },

            "should load a module that depends on another module": function() {
                modl.
                require("mod-b").
                exports(resume(function(modl, imports) {
                    Assert.isObject(imports["mod-b"], "No mod-b");
                    Assert.areSame("mod-b", imports["mod-b"].name, "Wrong mod-b");
                    Assert.isObject(imports["mod-b"]["mod-c"], "No mod-c");
                    Assert.areSame("mod-c", imports["mod-b"]["mod-c"].name, "Wrong mod-c");
                }));

                test.wait();
            },

            "should load a module and put into imports using its alias name": function() {
                modl.
                require("mod-a", "module-a").
                exports(resume(function(modl, imports) {
                    Assert.isUndefined(imports["mod-a"]);
                    Assert.isObject(imports["module-a"]);
                    Assert.areSame("mod-a", imports["module-a"].name);
                }));

                test.wait();
            },

            "should load an asset and put into imports using its alias name": function() {
                modl.
                require("/LocalAsset", "MyAsset").
                exports(resume(function(modl, imports) {
                    Assert.isUndefined(imports["LocalAsset"]);
                    Assert.isObject(imports["MyAsset"]);
                    Assert.areSame("LocalAsset", imports["MyAsset"].name);
                }));

                test.wait();
            },

            "should break when there are 2 aliases with the same name": function() {
                modl.
                require("mod-a", "x").
                require("mod-b", "x").
                exports(function() {
                    Assert.fail("Should not have reached here!");
                });
            },

            "should load a concatenated modl": function() {
                modl.require("mod-c", "c").
                exports(resume(function(modl, imports) {
                    Assert.isObject(imports.c);
                    Assert.areSame("mod-c", imports.c.name);
                    Assert.isObject(imports.c.d);
                    Assert.areSame("mod-d", imports.c.d.name);
                }));

                test.wait();
            }

        });

    YUITest.TestRunner.add(test);
}(this));