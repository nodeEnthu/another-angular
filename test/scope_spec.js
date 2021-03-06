/* jshint globalstrict: true */
/* global Scope: false */
 
'use strict' ;
describe("Scope", function() {
    var scope;
    beforeEach(function() {
        scope = new Scope();
    });
    it("can be constructed and used as an object", function() {
        scope.aProperty = 1;
        expect(scope.aProperty).toBe(1);
    });
    it("calls the listener function every time digest loop is called", function() {
        var watchFn = function() {
            return "watch";
        };
        var listenerFn = jasmine.createSpy();
        scope.$watch(watchFn, listenerFn);
        scope.$digest();
        expect(listenerFn).toHaveBeenCalled();
    });
    it("watch function is called with scope as an argument", function() {
        var watchFn = jasmine.createSpy();
        var listenerFn = function() {
            return '';
        };
        scope.$watch(watchFn, listenerFn);
        scope.$digest();
        expect(watchFn).toHaveBeenCalledWith(scope);
    });
    it("calls the listener function when the watch is dirty", function() {
        scope.aValue = 'a';
        scope.counter = 0;
        var watchFn = function() {
            return scope.aValue;
        };
        var listenerFn = function() {
            scope.counter = scope.counter + 1;
        };
        scope.$watch(watchFn, listenerFn);
        expect(scope.counter).toBe(0);
        scope.$digest();
        expect(scope.counter).toBe(1);
        scope.$digest();
        expect(scope.counter).toBe(1);
        scope.aValue = 'b';
        scope.$digest();
        expect(scope.counter).toBe(2);

    });
    it("triggers chained watchers in the same digest", function() {
        scope.name = 'Jane';
        scope.$watch(
            function(scope) {
                return scope.nameUpper;
            },
            function(newValue, oldValue, scope) {
                if (newValue) {
                    scope.initial = newValue.substring(0, 1) +  '.' ;
                }
            }
        );
        scope.$watch(
            function(scope) {
                return scope.name;
            },
            function(newValue, oldValue, scope) {
                if (newValue) {
                    scope.nameUpper = newValue.toUpperCase();
                }
            }
        );
        scope.$digest();
        expect(scope.initial).toBe( 'J.' );
        scope.name = 'Bob';
        scope.$digest();
        expect(scope.initial).toBe( 'B.' );
    });
    it("gives up on watches after 10 iterations", function() {
        scope.$watch(function() {
            return scope.counterA;
        }, function() {
            scope.counterB++;
        });
        scope.$watch(function() {
            return scope.counterB;
        }, function() {
            scope.counterA++;
        });
        expect(function() {
            scope.$digest();
        }).toThrow();
    });
    it("ends the digest loop when last dirty watch is clean", function() {
        scope.array = _.range(100);
        var watchExecutions = 0;
        _.times(100, function(i) {
            scope.$watch(
                function(scope) {
                    watchExecutions++;
                    return scope.array[i];
                },
                function(newValue, oldValue, scope) {}
            );
        });
        scope.$digest();
        expect(watchExecutions).toBe(200);
        scope.array[0] = 420;
        scope.$digest();
        expect(watchExecutions).toBe(301);
    });
    it("compares values rather than just refs", function() {
        scope.array = [1, 2, 3];
        scope.counter = 0;
        scope.$watch(function() {
            return scope.array;
        }, function() {
            scope.counter++;
        }, true);
        scope.$digest();
        expect(scope.counter).toBe(1);
        scope.array.push(4);
        scope.$digest();
        expect(scope.counter).toBe(2);

    });
    it("eventually halts $evalAsyncs added by watches", function() {
        scope.aValue = [1, 2, 3];
        scope.$watch(
            function(scope) {
                scope.$evalAsync(function(scope) {});
                return scope.aValue;
            },
            function(newValue, oldValue, scope) {}
        );
        expect(function() {
            scope.$digest();
        }).toThrow();
    });
    it("executes $evalAsynced function later in the same cycle", function() {
        scope.aValue = [1, 2, 3];
        scope.asyncEvaluated = false;
        scope.asyncEvaluatedImmediately = false;
        scope.$watch(
            function(scope) {
                return scope.aValue;
            },
            function(newValue, oldValue, scope) {
                scope.$evalAsync(function(scope) {
                    scope.asyncEvaluated = true;
                });
                scope.asyncEvaluatedImmediately = scope.asyncEvaluated;
            }
        );
        scope.$digest();
        expect(scope.asyncEvaluated).toBe(true);
        expect(scope.asyncEvaluatedImmediately).toBe(false);
    });
    it("has a $$phase field whose value is the current digest phase", function() {
        scope.aValue = [1, 2, 3];
        scope.phaseInWatchFunction = undefined;
        scope.phaseInListenerFunction = undefined;
        scope.phaseInApplyFunction = undefined;
        scope.$watch(
            function(scope) {
                scope.phaseInWatchFunction = scope.$$phase;
                return scope.aValue;
            },
            function(newValue, oldValue, scope) {
                scope.phaseInListenerFunction = scope.$$phase;
            }
        );
        scope.$apply(function(scope) {
            scope.phaseInApplyFunction = scope.$$phase;
        });
        expect(scope.phaseInWatchFunction).toBe( "$digest" );
        expect(scope.phaseInListenerFunction).toBe( "$digest" );
        expect(scope.phaseInApplyFunction).toBe( "$apply" );
    });
    it("schedules a digest in $evalAsync", function(done) {
        scope.aValue = "abc";
        scope.counter = 0;
        scope.$watch(
            function(scope) {
                return scope.aValue;
            },
            function(newValue, oldValue, scope) {
                scope.counter++;
            }
        );
        scope.$evalAsync(function(scope) {});
        expect(scope.counter).toBe(0);
        setTimeout(function() {
            expect(scope.counter).toBe(1);
            done();
        }, 50);
    });
    it( "allows async $apply with $applyAsync" , function(done) {
        scope.counter = 0;
        scope.$watch(
            function(scope) {
                return scope.aValue;
            },
            function(newValue, oldValue, scope) {
                scope.counter++;
            }
        );
        scope.$digest();
        expect(scope.counter).toBe(1);
        scope.$applyAsync(function(scope) {
            scope.aValue = "abc";
        });
        expect(scope.counter).toBe(1);
        setTimeout(function() {
            expect(scope.counter).toBe(2);
            done();
        }, 50);
    });
    it("never executes $applyAsync'ed function in the same cycle", function(done) {
        scope.aValue = [1, 2, 3];
        scope.asyncApplied = false;
        scope.$watch(
            function(scope) {
                return scope.aValue;
            },
            function(newValue, oldValue, scope) {
                scope.$applyAsync(function(scope) {
                    scope.asyncApplied = true;
                });
            }
        );
        scope.$digest();
        expect(scope.asyncApplied).toBe(false);
        setTimeout(function() {
            expect(scope.asyncApplied).toBe(true);
            done();
        }, 50);
    });
    it( "coalesces many calls to $applyAsync" , function(done) {
        scope.counter = 0;
        scope.$watch(
            function(scope) {
                scope.counter++;
                return scope.aValue;
            },
            function(newValue, oldValue, scope) {}
        );
        scope.$applyAsync(function(scope) {
            scope.aValue = "abc";
        });
        scope.$applyAsync(function(scope) {
            scope.aValue = "def";
        });
        setTimeout(function() {
            expect(scope.counter).toBe(2);
            done();
        }, 50);
    });
    it( "cancels and flushes $applyAsync if digested first" , function(done) {
        scope.counter = 0;
        scope.$watch(
            function(scope) {
                scope.counter++;
                return scope.aValue;
            },
            function(newValue, oldValue, scope) {}
        );
        scope.$applyAsync(function(scope) {
            scope.aValue = "abc";
        });
        scope.$applyAsync(function(scope) {
            scope.aValue =  "def" ;
        });
        scope.$digest();
        expect(scope.counter).toBe(2);
        expect(scope.aValue).toEqual("def");
        setTimeout(function() {
            expect(scope.counter).toBe(2);
            done();
        }, 50);
    });
    it("allows destroying a $watch with a removal function", function() {
        scope.aValue = " abc ";
        scope.counter = 0;
        var destroyWatch = scope.$watch(
            function(scope) {
                return scope.aValue;
            },
            function(newValue, oldValue, scope) {
                scope.counter++;
            }
        );
        scope.$digest();
        expect(scope.counter).toBe(1);
        scope.aValue = " def ";
        scope.$digest();
        expect(scope.counter).toBe(2);
        scope.aValue = " ghi ";
        destroyWatch();
        scope.$digest();
        expect(scope.counter).toBe(2);
    });
    it("allows destroying a $watch during digest", function() {
        scope.aValue = ' abc ';
        var watchCalls = [];
        scope.$watch(
            function(scope) {
                watchCalls.push(' first ');
                return scope.aValue;
            }
        );
        var destroyWatch = scope.$watch(
            function(scope) {
                watchCalls.push(' second ');
                destroyWatch();
            }
        );
        scope.$watch(
            function(scope) {
                watchCalls.push(' third ');
                return scope.aValue;
            }
        );
        scope.$digest();
        expect(watchCalls).toEqual([' first ', ' second ', ' third ', ' first ', ' third ']);
    });
    describe('$watchGroup', function() {
        it( 'takes watches as an array and calls listener with arrays' , function() {
            var gotNewValues, gotOldValues;
            scope.aValue = 1;
            scope.anotherValue = 2;
            scope.$watchGroup([

                function(scope) {
                    return scope.aValue;
                },
                function(scope) {
                    return scope.anotherValue;
                }
            ], function(newValues, oldValues, scope) {
                gotNewValues = newValues;
                gotOldValues = oldValues;
            });
            scope.$digest();
            expect(gotNewValues).toEqual([1, 2]);
            expect(gotOldValues).toEqual([1, 2]);
        });
        it('takes group watches and the calls listener only once', function() {
            scope.number = 1;
            scope.anotherNumber = 2;
            var counter = 0;
            scope.$watchGroup([

                function(scope) {
                    return scope.number;
                },
                function(scope) {
                    return scope.anotherNumber;
                }
            ], function() {
                counter = counter + 1;
            });
            scope.$digest();
            expect(counter).toBe(1);
        });
    });
    describe("inheritance", function() {
        it("inherits the properties of its parent scope", function() {
            var parent = new Scope();
            parent.aValue = [1, 2, 3];
            var child = parent.$new();
            expect(child.aValue).toEqual([1, 2, 3]);
        });
        it("can watch a property in the parent", function() {
            var parent = new Scope();
            var child = parent.$new();
            parent.aValue = [1, 2, 3];
            child.counter = 0;
            child.$watch(
                function(scope) {
                    return scope.aValue;
                },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                },
                true
            );
            child.$digest();
            expect(child.counter).toBe(1);
            parent.aValue.push(4);
            child.$digest();
            expect(child.counter).toBe(2);
        });
        it("can be nested at any depth", function() {
            var a = new Scope();
            var aa = a.$new();
            var aaa = aa.$new();
            var aab = aa.$new();
            var ab = a.$new();
            var abb = ab.$new();
            a.value = 1;
            expect(aa.value).toBe(1);
            expect(aaa.value).toBe(1);
            expect(aab.value).toBe(1);
            expect(ab.value).toBe(1);
            expect(abb.value).toBe(1);
            ab.anotherValue = 2;
            expect(abb.anotherValue).toBe(2);
            expect(aa.anotherValue).toBeUndefined();
            expect(aaa.anotherValue).toBeUndefined();
        });
        it("does not digest the watch on parent", function() {
            var parent = new Scope();
            var child = parent.$new();
            parent.aVal = 'aVal';
            parent.$watch(function(scope) {
                return parent.aVal;
            }, function(newVal, oldVal, scope) {
                scope.parentVal = newVal;
            });
            child.$digest();
            expect(parent.parentVal).toBeUndefined();
        });
        it("keeps a record of its children", function() {
            var parent = new Scope();
            var child1 = parent.$new();
            var child2 = parent.$new();
            var child2_1 = child2.$new();
            expect(parent.$$children.length).toBe(2);
            expect(parent.$$children[0]).toBe(child1);
            expect(parent.$$children[1]).toBe(child2);
            expect(child1.$$children.length).toBe(0);
            expect(child2.$$children.length).toBe(1);
            expect(child2.$$children[0]).toBe(child2_1);
        });
        it("digests its children", function() {
            var parent = new Scope();
            var child = parent.$new();
            parent.aValue = ' abc ';
            child.$watch(
                function(scope) {
                    return scope.aValue;
                },
                function(newValue, oldValue, scope) {
                    scope.aValueWas = newValue;
                }
            );
            parent.$digest();
            expect(child.aValueWas).toBe(' abc ');
        });
        it("cannot watch parent attributes when isolated", function() {
            var parent = new Scope();
            var child = parent.$new(true);
            parent.aValue = ' abc ';
            child.$watch(
                function(scope) {
                    return scope.aValue;
                },
                function(newValue, oldValue, scope) {
                    scope.aValueWas = newValue;
                }
            );
            child.$digest();
            expect(child.aValueWas).toBeUndefined();
        });
        it("digests its isolated children", function() {
            var parent = new Scope();
            var child = parent.$new(true);
            child.aValue = 'abc';
            child.$watch(
                function(scope) {
                    return scope.aValue;
                },
                function(newValue, oldValue, scope) {
                    scope.aValueWas = newValue;
                }
            );
            parent.$digest();
            expect(child.aValueWas).toBe('abc');
        });
        it("digests from root on $apply when isolated", function() {
            var parent = new Scope();
            var child = parent.$new(true);
            var child2 = child.$new();
            parent.aValue = ' abc ';
            parent.counter = 0;
            parent.$watch(
                function(scope) {
                    return scope.aValue;
                },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            child2.$apply(function(scope) {
                return 'something';
            });
            expect(parent.counter).toBe(1);
        });
        it("schedules a digest from root on $evalAsync when isolated", function(done) {
            var parent = new Scope();
            var child = parent.$new(true);
            var child2 = child.$new();
            parent.aValue = ' abc ';
            parent.counter = 0;
            parent.$watch(
                function(scope) {
                    return scope.aValue;
                },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            child2.$evalAsync(function(scope) {});
            setTimeout(function() {
                expect(parent.counter).toBe(1);
                done();
            }, 50);
        });
        it("executes $evalAsync functions on isolated scopes", function(done) {
            var parent = new Scope();
            var child = parent.$new(true);
            child.$evalAsync(function(scope) {
                scope.didEvalAsync = true;
            });
            setTimeout(function() {
                expect(child.didEvalAsync).toBe(true);
                done();
            }, 50);
        });
        it("substitutes parent with another object", function() {
            var protoParent = new Scope();
            var substituteParent = new Scope();
            var child = protoParent.$new(false, substituteParent);
            protoParent.parentProp = 'parentProp';
            child.counter = 0;
            expect(child.parentProp).toBe('parentProp');
            child.$watch(function() {
                child.counter++;
            });
            protoParent.$digest();
            expect(child.counter).toBe(0);
            substituteParent.$digest();
            expect(child.counter).toBe(2);
        });
    });
    describe('$watchCollection', function() {
        it('watches just like original watch', function() {
            scope.aValue = 'a';
            scope.counter = 0;
            var watchFn = function() {
                return scope.aValue;
            };
            var listenerFn = function() {
                scope.counter = scope.counter + 1;
            };
            scope.$watchCollection(watchFn, listenerFn);
            expect(scope.counter).toBe(0);
            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.$digest();
            expect(scope.counter).toBe(1);
        });
        it("notices when an attribute is removed from an object", function() {
            scope.counter = 0;
            scope.obj = {
                a: 1
            };
            scope.$watchCollection(
                function(scope) {
                    return scope.obj;
                },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            scope.$digest();
            expect(scope.counter).toBe(1);
            delete scope.obj.a;
            scope.$digest();
            expect(scope.counter).toBe(2);
            scope.$digest();
            expect(scope.counter).toBe(2);
        });
    });
    describe("Events", function() {
        var parent;
        var scope;
        var child;
        var isolatedChild;
        beforeEach(function() {
            parent = new Scope();
            scope = parent.$new();
            child = scope.$new();
            isolatedChild = scope.$new(true);
        });
        it("allows registering listeners", function() {
            var listener1 = function() {};
            var listener2 = function() {};
            var listener3 = function() {};
            scope.$on('someEvent', listener1);
            scope.$on('someEvent', listener2);
            scope.$on('someOtherEvent', listener3);
            expect(scope.$$listeners).toEqual({
                someEvent: [listener1, listener2],
                someOtherEvent: [listener3]
            });
        });
        it("registers different listeners for every scope", function() {
            var listener1 = function() {};
            var listener2 = function() {};
            var listener3 = function() {};
            scope.$on('someEvent', listener1);
            child.$on('someEvent', listener2);
            isolatedChild.$on('someEvent', listener3);
            expect(scope.$$listeners).toEqual({
                someEvent: [listener1]
            });
            expect(child.$$listeners).toEqual({
                someEvent: [listener2]
            });
            expect(isolatedChild.$$listeners).toEqual({
                someEvent: [listener3]
            });
        });
        _.forEach(['$emit', '$broadcast'], function(method) {
            it("calls listeners registered for matching events on " + method, function() {
                var listener1 = jasmine.createSpy();
                var listener2 = jasmine.createSpy();
                scope.$on('someEvent', listener1);
                scope.$on('someOtherEvent', listener2);
                scope[method]('someEvent');
                expect(listener1).toHaveBeenCalled();
                expect(listener2).not.toHaveBeenCalled();
            });
            it('passes an event object with name attr to ' + method, function() {
                var listener = jasmine.createSpy();
                scope.$on('someEvent', listener);
                scope[method]('someEvent');
                expect(listener).toHaveBeenCalled();
                expect(listener.calls.mostRecent().args[0].name).toEqual('someEvent');
            });
            it('passes the same event object', function() {
                var listener1 = jasmine.createSpy();
                var listener2 = jasmine.createSpy();
                scope.$on('someEvent', listener1);
                scope.$on('someEvent', listener2);
                scope[method]('someEvent');
                var event1 = listener1.calls.mostRecent().args[0];
                var event2 = listener2.calls.mostRecent().args[0];
                expect(event1).toBe(event2);
            });
            it("passes additional arguments to listeners on " + method, function() {
                var listener = jasmine.createSpy();
                scope.$on('someEvent', listener);
                scope[method]('someEvent', 'and', ['additional', 'arguments'], '...');
                expect(listener.calls.mostRecent().args[1]).toEqual('and');
                expect(listener.calls.mostRecent().args[2]).toEqual(['additional', 'arguments']);
                expect(listener.calls.mostRecent().args[3]).toEqual('...');
            });
            it("can be deregistered " + method, function() {
                var listener = jasmine.createSpy();
                var deregister = scope.$on('someEvent', listener);
                deregister();
                scope[method]('someEvent');
                expect(listener).not.toHaveBeenCalled();
            });
        });
        it('$emit event propogates up the hierarchy', function() {
            var parentListener = jasmine.createSpy();
            var childListener = jasmine.createSpy();
            parent.$on('someEvent', parentListener);
            child.$on('someEvent', childListener);
            child.$emit('someEvent');
            expect(parentListener).toHaveBeenCalled();
            expect(childListener).toHaveBeenCalled();
        });
        it('propagates the same event up on $emit', function() {
            var parentListener = jasmine.createSpy();
            var childListener = jasmine.createSpy();
            parent.$on('someEvent', parentListener);
            scope.$on('someEvent', childListener);
            scope.$emit('someEvent');
            var scopeEvent = childListener.calls.mostRecent().args[0];
            var parentEvent = parentListener.calls.mostRecent().args[0];
            expect(scopeEvent).toBe(parentEvent);
        });
        it('propagates down the chain on broadcast .. also covers isolated scopes', function() {
            var parentListener = jasmine.createSpy();
            var scopeListener = jasmine.createSpy();
            var childListener = jasmine.createSpy();
            var isolatedChildListener = jasmine.createSpy();
            scope.$on('someEvent', scopeListener);
            child.$on('someEvent', childListener);
            isolatedChild.$on('someEvent', isolatedChildListener);
            scope.$broadcast('someEvent');
            expect(parentListener).not.toHaveBeenCalled();
            expect(scopeListener).toHaveBeenCalled();
            expect(childListener).toHaveBeenCalled();
            expect(isolatedChildListener).toHaveBeenCalled();
        });
        it("does not propagate to parents when stopped", function() {
            var scopeListener = function(event) {
                event.stopPropagation();
            };
            var parentListener = jasmine.createSpy();
            scope.$on('someEvent', scopeListener);
            parent.$on('someEvent', parentListener);
            scope.$emit('someEvent');
            expect(parentListener).not.toHaveBeenCalled();
        });
        it("is received by listeners on current scope after being stopped", function() {
            var listener1 = function(event) {
                event.stopPropagation();
            };
            var listener2 = jasmine.createSpy();
            scope.$on('someEvent', listener1);
            scope.$on('someEvent', listener2);
            scope.$emit('someEvent');
            expect(listener2).toHaveBeenCalled();
        });
    });
});