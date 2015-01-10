/* jshint globalstrict: true */
/* global setupModuleLoader: false */
'use strict';
describe('setupModuleLoader', function() {
    beforeEach(function() {
        delete window.angular;
    });
    it('exposes angular on the window', function() {
        setupModuleLoader(window);
        expect(window.angular).toBeDefined();
    });
    it('exposes the angular module function', function() {
        setupModuleLoader(window);
        expect(window.angular.module).toBeDefined();
    });
    describe('modules', function() {
        beforeEach(function() {
            setupModuleLoader(window);
        });
        it('allows registering a module', function() {
            var module = window.angular.module('module', []);
            expect(module).toBeDefined();
            expect(module.name).toEqual('module');
        });
        it('replaces a module when registered with same name again', function() {
            var myModule = window.angular.module('myModule', []);
            var myNewModule = window.angular.module('myModule', []);
            expect(myNewModule).not.toBe(myModule);
        });
        it('allows getting an instance of the module', function() {
            var origModule = window.angular.module('myModule', []);
            var getModule = window.angular.module('myModule');
            expect(origModule).toBe(getModule);
        });
    });
});