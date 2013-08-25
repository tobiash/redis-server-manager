var spawn = require('child_process').spawn,
  stream = require('stream');

module.exports = function (rbin) {
  return function getInfo(cb) {
    var info = {},
      re = /\s+(\S+)=(\S+)(?=\s)/g,
      rs = spawn(rbin, ['-v']),
      s = new stream.Writable(),
      arr = [];
    s._write = function (chunk, encoding, callback) {
      arr.push(chunk);
      callback();
    };
    s.on('finish', function () {
      var str = arr.join('');
      // find key=value pairs
      var x;
      while ((x = re.exec(str))) {
        info[x[1]] = x[2];
      }
    });
    rs.stdout.pipe(s);
    rs.on('close', function (code) {
      if (code !== 0) {
        cb(new Error('Could not execute redis binary'), null);
      } else {
        cb(null, info);
      }
    });
  };
};
