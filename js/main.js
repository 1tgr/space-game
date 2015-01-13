"use strict";

var G = 6.673e-11;

(function($, ko, window) {
  var Point = {
    zero: function() {
      return { x: 0, y: 0 };
    },
    add: function(p1, p2) {
      var x = 0, y = 0;
      $.each(arguments, function(_, p) {
        x += p.x;
        y += p.y;
      });

      return { x: x, y: y };
    },
    sub: function(p1, p2) {
      return { x: p1.x - p2.x, y: p1.y - p2.y };
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
    var force = Point.zero(), posPrev = Point.zero(), dtPrev = 1;
    self.pos = ko.observable(Point.zero());
    self.r = ko.observable(0);
    self.m = ko.observable(0);

    self.vel = ko.computed({
      read: function() {
        return Point.div(Point.sub(self.pos(), posPrev), dtPrev);
      },
      write: function(vel) {
        posPrev = Point.sub(self.pos(), vel);
        dtPrev = 1;
        return vel;
      },
      pure: true
    });

    self.define = function(json) {
      self.pos(json.pos);
      self.r(json.r);
      self.m(json.m || json.r * json.r * json.r);
      self.vel({ x: (json.vel || { }).x || 0, y: (json.vel || { }).y || 0 });
    };

    self.applyForces = function(bodies) {
      force = Point.zero();

      var pos = self.pos();
      var m = self.m();
      $.each(bodies, function(_, body) {
        if (body === self) return;
        var d = Point.sub(body.pos(), pos);
        var r2 = Point.magnitudeSqr(d);
        var n = G * m * body.m() / (r2 * Math.sqrt(r2));
        force = Point.add(force, Point.mul(n, d));
      });
    };

    self.animate = function(dt) {
      var pos = self.pos();
      var accel = Point.div(force, self.m());

      // http://lonesock.net/article/verlet.html
      // xi+1 = xi + (dti / dti-1) * (xi - xi-1) + dti * dti * a
      self.pos(Point.add(pos, Point.mul(dt / dtPrev, Point.sub(pos, posPrev)), Point.mul(dt * dt, accel)));

      posPrev = pos;
      dtPrev = dt;
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
      dt *= 100000;
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
    var planet = new Body({ pos: Point.add(sun.pos(), { x: 0, y: -(sun.r() + i * 40) }), r: i });
    var v = Math.sqrt(G * (sun.m() + planet.m()) / Point.distance(sun.pos(), planet.pos()));
    planet.vel(Point.add(sun.vel(), { x: v, y: 0 }));
    viewModel.bodies.push(planet);
  }

  var lastTimestamp;
  function animate(timestamp) {
    if (lastTimestamp) {
      var dt = Math.min((timestamp - lastTimestamp) / 1000, 1);
      var step = 0.01;
      while (dt > step) {
        viewModel.animate(step);
        dt -= step;
      }

      viewModel.animate(dt);
    }

    lastTimestamp = timestamp;
    window.requestAnimationFrame(animate);
  }

  window.requestAnimationFrame(animate);
  ko.applyBindings(viewModel);
})($, ko, window);
