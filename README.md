another-angular
===============

still in works .. following build you own angularjs to make my own..  mainly in an effort to understand angular better and improve js skills
.. any passersby please dont use it 
think m done with the scope object 
It passes following tests

Scope

	can be constructed and used as an object
	calls the listener function every time digest loop is called
	watch function is called with scope as an argument
	calls the listener function when the watch is dirty
	triggers chained watchers in the same digest
	gives up on watches after 10 iterations
	ends the digest loop when last dirty watch is clean
	compares values rather than just refs
	eventually halts $evalAsyncs added by watches
	executes $evalAsynced function later in the same cycle
	has a $$phase field whose value is the current digest phase
	schedules a digest in $evalAsync
	allows async $apply with $applyAsync
	never executes $applyAsync'ed function in the same cycle
	coalesces many calls to $applyAsync
	cancels and flushes $applyAsync if digested first
	allows destroying a $watch with a removal function
	allows destroying a $watch during digest
	
$watchGroup

	takes watches as an array and calls listener with arrays
	takes group watches and the calls listener only once
	inheritance
	inherits the properties of its parent scope
	can watch a property in the parent
	can be nested at any depth
	does not digest the watch on parent
	keeps a record of its children
	digests its children
	cannot watch parent attributes when isolated
	digests its isolated children
	digests from root on $apply when isolated
	schedules a digest from root on $evalAsync when isolated
	executes $evalAsync functions on isolated scopes
	substitutes parent with another object
	
$watchCollection

	watches just like original watch
	notices when an attribute is removed from an object
	
Events

	allows registering listeners
	registers different listeners for every scope
	calls listeners registered for matching events on $emit
	passes an event object with name attr to $emit
	passes the same event object
	passes additional arguments to listeners on $emit
	can be deregistered $emit
	calls listeners registered for matching events on $broadcast
	passes an event object with name attr to $broadcast
	passes the same event object
	passes additional arguments to listeners on $broadcast
	can be deregistered $broadcast
