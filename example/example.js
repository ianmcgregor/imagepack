'use strict';

(function() {


  var imagepack = new window.Imagepack({
      verbose: true
    })
    .on('error', function(error) {
       console.error(error);
    })
    .on('progress', function(progress) {
       console.log(progress);
    })
    .once('complete', getPng)
    .once('complete', getJpg)
    .once('complete', getGif)
    .once('complete', getWebp)
    .load('packs/pack.bin');

  function getPng(names) {
      var sequence = names.filter(function(name) {
        return name.slice(-4) === '.png';
      });
      var el = document.querySelector('[data-js="png"]');
      var img = new Image();
      el.appendChild(img);
      var i = 0;
      var last = 0;
      function loop() {
        window.requestAnimationFrame(loop);

        var now = Date.now();
        if (now - last < 40) {
          return;
        }
        last = now;

        if (i === sequence.length) {
          i = 0;
        }

        img.src = imagepack.getURI(sequence[i]);

        i++;
      }
      loop();
  }

  function getJpg(names) {
      var el = document.querySelector('[data-js="jpg"]');
      names.filter(function(name) {
        return name.slice(-4) === '.jpg';
      }).forEach(function(name) {
        el.appendChild(imagepack.getImage(name));
      });
  }

  function getGif(names) {
      var el = document.querySelector('[data-js="gif"]');
      names.filter(function(name) {
        return name.slice(-4) === '.gif';
      }).forEach(function(name) {
        el.appendChild(imagepack.getImage(name));
      });
  }

  function getWebp(names) {
      var el = document.querySelector('[data-js="webp"]');
      names.filter(function(name) {
        return name.slice(-5) === '.webp';
      }).forEach(function(name) {
        el.appendChild(imagepack.getImage(name));
      });
  }

}());
