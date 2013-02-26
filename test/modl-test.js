(function(global) {
    "use strict";

    var YUITest = global.YUITest || require("yuitest"),
        root = (typeof exports !== "undefined" && global.exports !== exports) ? process.cwd() + "/" : "../",
        modl = global.modl || require(root + "/lib/modl"),
        Assert = YUITest.Assert,

        test = new YUITest.TestCase({

            setUp : function() {
                modl.setup({
                    "root" : root + "test-runner"
                });
            },

            name : "modl-test",

            "should load alocal asset" : function() {
                modl.
                require("/LocalAsset").
                exports(function(modl, imports) {
                    test.resume(function() {
                        console.log(imports);
                        Assert.isObject(imports);
                        Assert.isObject(imports["LocalAsset"]);
                    });
                });

                test.wait();
            },

            "should load a single module" : function() {
                modl.
                require("mod-a").
                exports(function(modl, imports) {
                    test.resume(function() {
                        Assert.isObject(imports);
                        Assert.isObject(imports["mod-a"]);
                    });
                });

                test.wait();
            },

            "should load a file within module" : function() {
                modl.
                require("mod-a/AssetA").
                exports(function(modl, imports) {
                    test.resume(function() {
                        Assert.isObject(imports);
                        Assert.isObject(imports["AssetA"]);
                    });
                });

                test.wait();
            }
        });

    YUITest.TestRunner.add(test);
}(this));