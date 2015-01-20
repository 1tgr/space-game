"use strict";

var scale = 1e-6;
var G = 6.673e-11 * scale * scale;

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

  ko.bindingHandlers.transform = {
    update: function(element, valueAccessor) {
      var transform = ko.unwrap(valueAccessor());
      if (!$.isArray(transform))
        transform = [ transform ];

      var parts = $.map(transform, function(t) {
        t = ko.unwrap(t);

        function format(name) {
          var value = t[name];
          if (!value) return null;
          value = ko.unwrap(value);
          if (typeof value != "number")
          {
            var x = ko.unwrap(value.x), y = ko.unwrap(value.y);
            value = y == undefined ? x : x + " " + y;
          }

          return name + "(" + value + ")";
        }

        return format("translate") || format("scale");
      });

      $(element).attr("transform", parts.join(" "));
    }
  };

  function Body() {
    var self = this;
    var force = Point.zero(), posPrev = Point.zero(), dtPrev = 1;
    self.name = ko.observable("");
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
  }

  function ViewModel() {
    var self = this;
    var zooms = [ 0.25, 0.5, 0.8, 1, 1.25, 1.5, 2 ];
    self.bodies = ko.observable({ });
    self.focus = ko.observable(null);
    self.scale = ko.observable(1);
    self.anim = anim.animator(self);

    self.focusBody = ko.computed(function() {
      var focus = self.focus();
      return focus && self.bodies()[focus];
    });

    self.translate = ko.computed(function() {
      var body = self.focusBody();
      return body && Point.sub(Point.zero(), body.pos());
    });

    self.anim.easing("translate", "easeInOutQuad");

    self.names = ko.computed(function() {
      var names = [ ];
      $.each(self.bodies(), function(name) {
        names.push(name);
      });
      return names;
    });

    self.bodiesArray = ko.computed(function() {
      var bodies = [ ];
      $.each(self.bodies(), function(_, body) {
        bodies.push(body);
      });
      return bodies;
    });

    self.animate = function(dt) {
      self.anim.animate(dt);

      var bodies = self.bodies();
      dt *= 10;
      $.each(bodies, function(_, body) {
        body.applyForces(bodies);
      });
      $.each(bodies, function(_, body) {
        body.animate(dt);
      });
    };
  }

  var sunData = {
    radius:   696342e3,
    mass: 1988550000e21,
    distance: 0,
    satellites: {
      // Radius, mass: http://en.wikipedia.org/wiki/List_of_Solar_System_objects_by_size
      // Distance: http://en.wikipedia.org/wiki/List_of_gravitationally_rounded_objects_of_the_Solar_System
      // Jupiter's moons: http://en.wikipedia.org/wiki/Moons_of_Jupiter
      Mercury: { radius:  2439.7e3, mass:     330.20e21, distance:   57909175e3 },
        Venus: { radius:  6051.8e3, mass:    4868.50e21, distance:  108208930e3 },
        Earth: { radius:  6371.0e3, mass:    5973.60e21, distance:  149597890e3, satellites: {
         Moon: { radius:  1737.1e3, mass:      73.50e21, distance: 384399e3 }
      } },
         Mars: { radius:  3389.5e3, mass:     641.85e21, distance:  227936640e3 },
      Jupiter: { radius: 69911.0e3, mass: 1898600.00e21, distance:  778412010e3, satellites: {
              Io: { radius: 1821.3e3, mass:  8931900e16, distance:  421700e3 },
          Europa: { radius: 1560.8e3, mass:  4800000e16, distance:  671034e3 },
        Ganymede: { radius: 2631.2e3, mass: 14819000e16, distance: 1070412e3 },
        Callisto: { radius: 2410.3e3, mass: 10759000e16, distance: 1882709e3 }
      } },
       Saturn: { radius: 58232.0e3, mass:  568460.00e21, distance: 1426725400e3 },
       Uranus: { radius: 25362.0e3, mass:   86832.00e21, distance: 2870972200e3 },
      Neptune: { radius: 24622.0e3, mass:  102430.00e21, distance: 4498252900e3 }
    }
  };

  var viewModel = new ViewModel();

  function addSystem(sun, name, data) {
    var sunPos = sun ? sun.pos() : Point.zero();
    var planet = new Body();
    planet.name(name);
    planet.pos(Point.add(sunPos, { x: 0, y: -data.distance * scale }));
    planet.r(data.radius * scale);
    planet.m(data.mass);

    if (sun) {
      var v = Math.sqrt(G * (sun.m() + planet.m()) / Point.distance(sun.pos(), planet.pos()));
      planet.vel(Point.add(sun.vel(), { x: v, y: 0 }));
    }

    var b = viewModel.bodies();
    b[name] = planet;
    viewModel.bodies(b);

    if (data.satellites) {
      $.each(data.satellites, function(name, data) {
        addSystem(planet, name, data);
      });
    }
  }

  addSystem(null, "Sun", sunData);
  viewModel.focus("Jupiter");

  window.setInterval(function() {
    viewModel.animate(10 / 1000);
  }, 10);

  ko.applyBindings(viewModel);
})($, ko, window);
