"use strict";

var G = 6.673e-11;

(function($, ko, window) {
  function Body(json) {
    var self = this;
    self.x = ko.observable();
    self.y = ko.observable();
    self.r = ko.observable();
    self.m = ko.observable();
    self.dxdt = ko.observable();
    self.dydt = ko.observable();
    var fx, fy;

    self.define = function(json) {
      self.x(json.x);
      self.y(json.y);
      self.r(json.r);
      self.m(json.m);
      self.dxdt(json.dxdt || 0);
      self.dydt(json.dydt || 0);
    };

    self.applyForces = function(bodies) {
      fx = 0;
      fy = 0;

      var x = self.x();
      var y = self.y();
      var m = self.m();
      $.each(bodies, function(_, body) {
        if (body === self) return;
        var dx = body.x() - x;
        var dy = body.y() - y;
        var d2 = (dx * dx) + (dy * dy);
        var f = G * m * body.m() / d2;
        var d = Math.sqrt(d2);
        fx += f * (dx / d);
        fy += f * (dy / d);
      });
    };

    self.animate = function(dt) {
      var x = self.x();
      var y = self.y();
      var m = self.m();
      var dxdt = self.dxdt();
      var dydt = self.dydt();
      var dxdt2 = fx / m;
      var dydt2 = fy / m;
      dxdt += dxdt2 * dt;
      dydt += dydt2 * dt;
      self.x(x + dxdt * dt);
      self.y(y + dydt * dt);
      self.dxdt(dxdt);
      self.dydt(dydt);
    };

    if (json)
      self.define(json);
  }

  function ViewModel(json) {
    var self = this;
    self.bodies = ko.observableArray([ ]);

    self.define = function(json) {
      self.bodies($.map(json.bodies, function(json) { return new Body(json); }));
    };

    self.animate = function(dt) {
      var bodies = self.bodies();
      $.each(bodies, function(_, body) {
        body.applyForces(bodies);
      });
      $.each(bodies, function(_, body) {
        body.animate(dt);
      });
    };

    if (json)
      self.define(json);
  }

  var viewModel = new ViewModel();
  var sun = new Body({ x: 500, y: 500, r: 100, m: 100*100*100 });
  viewModel.bodies.push(sun);

  for (var i = 1; i < 10; i++) {
    var planet = new Body({ x: sun.x(), y: sun.y() - sun.r() - i * 40, r: i, m: i*i*i });
    var dx = sun.x() - planet.x();
    var dy = sun.y() - planet.y();
    var v = Math.sqrt(G * (sun.m() + planet.m()) / Math.sqrt((dx * dx) + (dy * dy)));
    planet.dxdt(v);
    viewModel.bodies.push(planet);
  }

  window.setInterval(function() {
    viewModel.animate(1000);
  }, 10);

  ko.applyBindings(viewModel);
})($, ko, window);
