"use strict";

var G = 6.673e-11;

(function($, ko, window) {
  var Point = {
    add: function(p1, p2) {
      return { x: p1.x + p2.x, y: p1.y + p2.y };
    },
    sub: function(p1, p2) {
      return { x: p2.x - p1.x, y: p2.y - p1.y };
    },
    mul: function(n, p) {
      return { x: n * p.x, y: n * p.y };
    },
    div: function(p, n) {
      return { x: p.x / n, y: p.y / n };
    },
    magnitudeSqr: function(p) {
      return p.x * p.x + p.y * p.y;
    },
    magnitude: function(p) {
      return Math.sqrt(Point.magnitudeSqr(p));
    },
    distanceSqr: function(p1, p2) {
      return Point.magnitudeSqr(Point.sub(p1, p2));
    },
    distance: function(p1, p2) {
      return Math.sqrt(Point.distanceSqr(p1, p2));
    }
  };

  function Body(json) {
    var self = this;
    self.pos = ko.observable();
    self.r = ko.observable();
    self.m = ko.observable();
    self.vel = ko.observable();
    var force;

    self.define = function(json) {
      self.pos(json.pos);
      self.r(json.r);
      self.m(json.m || json.r * json.r * json.r);
      self.vel({ x: (json.vel || { }).x || 0, y: (json.vel || { }).y || 0 });
    };

    self.applyForces = function(bodies) {
      force = { x: 0, y: 0 };

      var pos = self.pos();
      var m = self.m();
      $.each(bodies, function(_, body) {
        if (body === self) return;
        var d = Point.sub(pos, body.pos());
        var r2 = Point.magnitudeSqr(d);
        var n = G * m * body.m() / (r2 * Math.sqrt(r2));
        force = Point.add(force, Point.mul(n, d));
      });
    };

    self.animate = function(dt) {
      var pos = self.pos();
      var m = self.m();
      var vel = self.vel();
      var accel = Point.div(force, m);
      vel = Point.add(vel, Point.mul(dt, accel));
      pos = Point.add(pos, Point.mul(dt, vel));
      self.vel(vel);
      self.pos(pos);
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
  var sun = new Body({ pos: { x: 500, y: 500 }, r: 100 });
  viewModel.bodies.push(sun);

  for (var i = 1; i < 10; i++) {
    var planet = new Body({ pos: { x: sun.pos().x, y: sun.pos().y - sun.r() - i * 40 }, r: i });
    var v = Math.sqrt(G * (sun.m() + planet.m()) / Point.distance(sun.pos(), planet.pos()));
    planet.vel({ x: v, y: 0 });
    viewModel.bodies.push(planet);
  }

  window.setInterval(function() {
    viewModel.animate(1000);
  }, 10);

  ko.applyBindings(viewModel);
})($, ko, window);
