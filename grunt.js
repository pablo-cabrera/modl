module.exports = function(grunt) {
    "use strict";

    // Project configuration.
    grunt.initConfig({
        pkg : '<json:package.json>',
        meta : {
            banner : '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
                '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
                '<%= pkg.homepage ? "* " + pkg.homepage + "\n" : "" %>' +
                '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
                ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */'
        },
        lint : {
            files : ['grunt.js', 'lib/**/*.js', 'test/**/*.js']
        },

        test : {
            files : ['test/**/*.js']
        },

        concat : {
            dist : {
                src : ['<banner:meta.banner>',
                        '<file_strip_banner:lib/<%= pkg.name %>.js>'],
                dest : 'dist/<%= pkg.name %>.js'
            }
        },
        min : {
            dist : {
                src : ['<banner:meta.banner>', '<config:concat.dist.dest>'],
                dest : 'dist/<%= pkg.name %>.min.js'
            }
        },
        watch : {
            files : '<config:lint.files>',
            tasks : 'lint'
        },
        jshint : {
            options : {
                /* enforcing */
                strict : true,
                bitwise : false,
                curly : true,
                eqeqeq : true,
                immed : true,
                latedef : true,
                newcap : true,
                noarg : true,
                noempty : true,
                plusplus : true,
                quotmark : "double",
                undef : true,

                /* relaxing */
                eqnull : true,

                /* environment */
                browser : true,
                node : true
            },
            globals : {}
        },
        uglify : {}
    });


    grunt.registerMultiTask("test", "YUI Test Runner", function() {
        var ytestrunner = require("ytestrunner"),
            coverage = process.env.COVERAGE;

        ytestrunner.cli.runConfig({
            verbose : false,
            coverage : coverage ? coverage === "true" : true,
            saveResults : true,
            resultsFile : process.cwd() + '/test-result/results',
            fastCover : false,
            saveCoverage : true,
            coverageFile : process.cwd() + '/test-result/coverage',
            colors : true,
            root : process.cwd(),
            tmp : '/tmp',
            include : this.file.src,
            exclude : [],
            covInclude : ['lib/**/*.js'],
            covExclude : ['**/.*', '**/node_modules/**'],
            resultsFormat : 'junitxml',
            coverageReportFormat : 'lcov'
        }, this.async());
    });

    // Default task.
    grunt.registerTask('default', 'lint test concat min');

};