"use strict";
(function(window) {
  function Interpolator(startValue, endValue, seconds, atEnd) {
    var self = this;
    var speed = 1 / (seconds || 1);
    self.t = ko.observable(0);

    self.startTime = new Date();

    self.animate = function (dt) {
      self.t(self.t() + dt * speed);
    };

    self.value = ko.computed(function () {
      var t = self.t();
      if (t >= 1) {
        atEnd();
        return endValue;
      } else {
        return (1 - t) * startValue + t * endValue;
      }
    });
  }

  window.anim = { };
  window.anim.animator = function(owner) {
    function anim(name, commit, seconds) {
      var interps = anim.interpolators();
      var interp = interps[name];
      var obsBefore = interp ? interp.value : owner[name];
      if (!commit) {
        return obsBefore;
      }

      var valueBefore = obsBefore();
      commit();

      var valueAfter = owner[name]();
      interps[name] = new Interpolator(valueBefore, valueAfter, seconds, function () {
        var interps = anim.interpolators.peek();
        delete interps[name];
        anim.interpolators(interps);
      });

      anim.interpolators(interps);
      return undefined;
    }

    anim.interpolators = ko.observable({ });

    anim.animate = function(dt) {
      $.each(anim.interpolators(), function(_, interp) {
        interp.animate(dt);
      });
    };

    return anim;
  };
})(window);