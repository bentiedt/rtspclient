const createHash = require('crypto'),
      spawn = require('child_process');
      

module.exports.getMD5Hash = function(string) {
  const md5 = createHash('md5');

  md5.update(string);
  return md5.digest('hex');
}

module.exports.assign = function(dest, ...args) {
  let count = 0;
  const length = args.length;

  for(; count < length; count++) {
    const arg = args[count];

    for(var prop in arg) {
      if(arg.hasOwnProperty(prop)) {
        dest[prop] = arg[prop];
      }
    }
  }
  return dest;
}

module.exports.parseTransport = function(transport) {
  const returned = {};
  transport.split(';').forEach((part) => {
    const split = part.split('=');
    returned[split[0].trim()] = split.slice(1).join('=').trim();
  });

  return returned;
}
