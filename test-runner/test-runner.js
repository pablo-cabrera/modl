(function() {

    if (typeof console == "undefined") {
        return;
    }

    var checkResults = function() {

        var results = YUITest.TestRunner.getResults();
        if (YUITest.TestRunner.isRunning() || results === null) {
            return setTimeout(checkResults, 100);
        }

        var failedTestCases = [];

        for (var a in results) {
            var result = results[a];
            if (typeof result !== "object") {
                continue;
            }

            if (result.errors || result.failed) {
                failedTestCases.push(result);
            }
        }

        if (failedTestCases.length) {
            console.warn("Failed tests summary");

            for (var i = 0; i < failedTestCases.length; i++) {
                var result = failedTestCases[i];

                console.group("TestCase: " + result.name + " (P:" + result.passed + ",E:" + result.errors + ",F:" + result.failed + ")");

                for (var b in result) {
                    if (b.indexOf(" ") === -1 && b.indexOf("test") === -1)
                        continue;

                    var test = result[b];
                    if (test.result == "pass")
                        continue;

                    console.warn(message = "[" + test.result + "] " + b + " (" + test.message + ")");
                }

                console.groupEnd();
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

    for (var i=  0; i < events.length; i += 1) {
        YUITest.TestRunner.attach(events[i], function(event) {
                switch(event.type){
                    case this.TEST_CASE_BEGIN_EVENT:
                        console.group("TestCase: " + event.testCase.name);
                        break;

                    case this.TEST_FAIL_EVENT:
                        console.warn("[fail] " + event.testName + ": " + event.error.getMessage());
                        break;

                    case this.ERROR_EVENT:
                        console.error("[error] " + event.methodName + "() caused an error: " + event.error.message);
                        break;

                    case this.TEST_PASS_EVENT:
                        console.debug("[passed] " + event.testName);
                        break;

                    case this.TEST_CASE_COMPLETE_EVENT:
                        console.groupEnd();
                        break;
                }

        });
    }
    checkResults();

    YUITest.TestRunner.run();
}());