module.exports = function (grunt) {
    "use strict";

    grunt.option("stack", true);

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
            modl: {
                src: [
                    require.resolve("parts"),
                    require.resolve("ilk"),
                    "lib/modl.js",
                    "test/cases/modl.js"
                ],

                options: {
                    environments: ["node", "phantom"]
                }
            },
            builder: {
                src: [
                    "test/cases/Builder.js"
                ],

                options: {
                    environments: ["node"],
                    reporters: [
                        {
                            type: "console",
                            stack: true
                        }
                    ]
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
                evil: true,

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
        },

        watch: {
            lint: {
                files: ["Gruntfile.js", "lib/**/*.js", "test/cases/**/*.js"],
                tasks: ["jscs", "jshint", "gabarito:builder"],
                options: {
                    atBegin: true
                }
            }

        },

        clean: ["build", "dist"]


    });

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-contrib-yuidoc");
    grunt.loadNpmTasks("grunt-contrib-watch");
    grunt.loadNpmTasks("grunt-contrib-clean");

    grunt.loadNpmTasks("grunt-gabarito");
    grunt.loadNpmTasks("grunt-jscs");

    // Defaults
    grunt.registerTask("default", ["jscs", "jshint", "gabarito:modl",
            "gabarito:builder"]);

    grunt.registerTask("dist", ["uglify"]);

};
