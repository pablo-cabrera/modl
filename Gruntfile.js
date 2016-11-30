module.exports = function (grunt) {
    "use strict";

    grunt.option("stack", true);


    var testFiles = [
        require.resolve("parts"),
        require.resolve("ilk"),
        "lib/modl.js",
        "test/cases/modl.js"
    ];

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),

        meta: {
            banner:
                "/*! " +
                "<%= pkg.title || pkg.name %> v<%= pkg.version %> | " +
                "(c) <%= grunt.template.today(\"yyyy\") %> " +
                "<%= pkg.author.name %> | " +
                " Available via <%= pkg.license %> license " +
                "*/"
        },

        gabarito: {
            dev: {
                src: testFiles,

                options: {
                    environments: ["node", "phantom"]
                }
            }

        },

        uglify: {
            dist: {
                src: "lib/modl.js",
                dest: "dist/modl.js"
            }
        },

        jshint: {
            options: {
                /* enforcing */
                strict: true,
                bitwise: false,
                curly: true,
                eqeqeq: true,
                immed: true,
                latedef: true,
                newcap: true,
                noarg: true,
                noempty: true,
                plusplus: true,
                quotmark: "double",

                undef: true,

                /* relaxing */
                eqnull: true,
                sub: true,

                /* environment */
                node: true,
                browser: true,
                globals: { modl: true }
            },

            files: ["Gruntfile.js", "lib/**/*.js", "test/cases/**/*.js"]
        },

        jscs: {
            src: ["Gruntfile.js", "lib/**/*.js", "test/cases/**/*.js"],
            options: {
                config: ".jscsrc"
            }
        },

        yuidoc: {
            compile: {
                name: "<%= pkg.name %>",
                description: "<%= pkg.description %>",
                version: "<%= pkg.version %>",
                url: "<%= pkg.homepage %>",
                options: {
                    paths: "lib/",
                    outdir: "docs/"
                }
            }
        }

    });

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-contrib-yuidoc");
    grunt.loadNpmTasks("grunt-gabarito");
    grunt.loadNpmTasks("grunt-jscs");

    // Defaults
    grunt.registerTask("default", ["jscs", "jshint", "gabarito"]);
    grunt.registerTask("dist", ["uglify"]);

};
