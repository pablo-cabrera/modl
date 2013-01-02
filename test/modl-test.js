(function() {
    "use strict";

    var YUITest = require("yuitest"),
        Assert = YUITest.Assert;

    YUITest.TestRunner.add(new YUITest.TestCase({

        name : "modl-test",

        "should pass" : function() {
            Assert.areEqual("fuck", "fuck");
        }
    }));
}());
