"use strict";
(function(window) {
  function linear1D(startValue, endValue, t) {
    return (1 - t) * startValue + t * endValue;
  }

  function Animator(startValue, endAccessor, options) {
    var self = this;
    var speed = 1 / (options.seconds || 1);
    var atEnd = options.atEnd;
    var func = options.func || linear1D;

    self.t = ko.observable(0);
    self.startTime = new Date();

    self.animate = function (dt) {
      self.t(self.t() + dt * speed);
    };

    self.value = ko.computed(function () {
      var t = self.t();
      var endValue = endAccessor.peek();
      if (t >= 1) {
        atEnd();
        return endValue;
      } else {
        return func(startValue, endValue, t);
      }
    });
  }

  window.anim = { };

  window.anim.linear1D = linear1D;

  window.anim.linear2D = function(startPos, endPos, t) {
    return {
      x: linear1D(startPos.x, endPos.x, t),
      y: linear1D(startPos.y, endPos.y, t)
    };
  };

  window.anim.animator = function(owner) {
    var interpolators = { };

    function anim(name, commit, seconds) {
      var animators = anim.animators();
      var animator = animators[name];
      var obsBefore = animator ? animator.value : owner[name];
      if (!commit) {
        return obsBefore;
      }

      var valueBefore = obsBefore();
      commit();

      animators[name] = new Animator(valueBefore, owner[name], {
        seconds: seconds,
        func: interpolators[name],
        atEnd: function () {
          var animators = anim.animators.peek();
          delete animators[name];
          anim.animators(animators);
        }
      });

      anim.animators(animators);
      return undefined;
    }

    anim.animators = ko.observable({ });

    anim.animate = function(dt) {
      $.each(anim.animators(), function(_, animator) {
        animator.animate(dt);
      });
    };

    anim.wrapInput = function(name1, name2, seconds) {
      return ko.computed({
        read: owner[name1],
        write: function(value) {
          anim(name2, function() {
            owner[name1](value);
          }, seconds);
        }
      });
    };

    anim.interpolator = function(name, func) {
      if (func) {
        interpolators[name] = func;
        return undefined;
      }
      else {
        return interpolators[name];
      }
    };

    return anim;
  };
})(window);