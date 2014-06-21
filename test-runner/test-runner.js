(function(global) {
    "use strict";

    var YUITest = global.YUITest;

    if (typeof console === "undefined") {
        return;
    }

    var checkResults = function() {
        var results = YUITest.TestRunner.getResults(),
            result;

        if (YUITest.TestRunner.isRunning() || results === null) {
            return setTimeout(checkResults, 100);
        }

        var failedTestCases = [];

        for (var a in results) {
            result = results[a];
            if (typeof result !== "object") {
                continue;
            }

            if (result.errors || result.failed) {
                failedTestCases.push(result);
            }
        }

        if (failedTestCases.length) {
            warn("Failed tests summary");

            for (var i = 0; i < failedTestCases.length; i += 1) {
                result = failedTestCases[i];

                group("TestCase: " + result.name + " (P:" + result.passed + ",E:" + result.errors + ",F:" + result.failed + ")");

                for (var b in result) {
                    if (b.indexOf(" ") === -1 && b.indexOf("test") === -1) {
                        continue;
                    }

                    var test = result[b];
                    if (test.result === "pass") {
                        continue;
                    }

                    warn("[" + test.result + "] " + b + " (" + test.message + ")");
                }

                groupEnd();
            }
        } else {
            console.info("All test passed! =]");
        }
    };

    var events = [
        YUITest.TestRunner.TEST_CASE_BEGIN_EVENT,
        YUITest.TestRunner.TEST_CASE_COMPLETE_EVENT,
        YUITest.TestRunner.TEST_PASS_EVENT,
        YUITest.TestRunner.TEST_FAIL_EVENT,
        YUITest.TestRunner.ERROR_EVENT
    ];

    var group,
        groupEnd,
        log,
        warn,
        error;

    if (typeof console.group === "function") {
        group = function(name) { console.group(name); };
        groupEnd = function() {console.groupEnd(); };
        log = function(log) { console.log(log); };
        warn = function(warn) { console.warn(warn); };
        error = function(error) { console.error(error); };
    } else {
        (function() {
            var ident = "";

            group = function(group) {
                console.log(group);
                ident += "  ";
            };

            log = function(log) { console.log(ident + log); };
            warn = function(warn) { console.warn(ident + warn); }
            error = function(error) { console.error(ident + error); };

            groupEnd = function() {
                ident = ident.substr(0, ident.length - 2);
            };

        }());
    }


    var eventHandler = function(event) {
            switch(event.type){
                case this.TEST_CASE_BEGIN_EVENT:
                    group("TestCase: " + event.testCase.name);
                    break;

                case this.TEST_FAIL_EVENT:
                    warn("[fail] " + event.testName + ": " + event.error.getMessage());
                    break;

                case this.ERROR_EVENT:
                    error("[error] " + event.methodName + "() caused an error: " + event.error.message);
                    break;

                case this.TEST_PASS_EVENT:
                    log("[passed] " + event.testName);
                    break;

                case this.TEST_CASE_COMPLETE_EVENT:
                    groupEnd();
                    break;
            }

    };

    for (var i=  0; i < events.length; i += 1) {
        YUITest.TestRunner.attach(events[i], eventHandler);
    }
    checkResults();

    YUITest.TestRunner.run();
}(this));