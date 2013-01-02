(function(global) {
    "use strict";

    var cwd = process.cwd(),
        YUITest = global.YUITest || require("yuitest"),
        modl = global.modl || require(cwd + "/lib/modl"),
        Assert = YUITest.Assert;

    YUITest.TestRunner.add(new YUITest.TestCase({

        name : "modl-test",

        "should have an object" : function() {
            Assert.isObject(modl);
        },

        "should clear all modules" : function() {
            modl.clear();
            Assert.isObject(modl);
        }
    }));
}(this));