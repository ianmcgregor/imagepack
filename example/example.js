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
    .once('complete', animate)
    .once('complete', display)
    .load('packs/pack.bin');

  function display(keys) {
      keys.forEach(function(name) {
        document.body.appendChild(imagepack.getImage(name));
      });
  }

  function animate(keys) {
      var sequence = keys.filter(function(name) {
        return name.slice(0, 6) === 'loader';
      });
      var img = new Image();
      document.body.appendChild(img);
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

}());
