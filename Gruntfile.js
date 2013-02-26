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
                dest : 'dist/<%= pkg.name %>.js'
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

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    // Local tasks
    grunt.loadTasks("tasks");

    // Defaults
    grunt.registerTask("default", ["jshint", "test", "concat", "uglify"]);

};