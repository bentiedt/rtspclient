const {createHash} = require('crypto'),
      spawn = require('child_process');
      

module.exports.parseRTPPacket = function(buffer) {
    const padding = (buffer[0] >> 5) & 0x01;
    const hasExtensions = (buffer[0] >> 4) & 0x01;
    const marker = (buffer[1]) >>> 7;
    const payloadType = buffer[1] & 0x7f;
    const num_csrc_identifiers = (buffer[0] & 0x0F);
    const payload = buffer.slice((num_csrc_identifiers * 4) + (hasExtensions ? 16 : 12));
    const { length } = payload;
    return {
        id: buffer.readUInt16BE(2),
        timestamp: buffer.readUInt32BE(4),
        marker,
        payload,
        length,
        payloadType
    };
};
module.exports.parseRTCPPacket = function(buffer) {
        const packetType = buffer[1];
        const timestamp = buffer.readUInt32BE(16);
        return {
            timestamp,
            packetType,
            buffer
        };
    }

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
  const parameters = {};
    const parts = transport.split(";");
    const protocol = parts[0];
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const index = part.indexOf("=");
        if (index > -1 && index !== part.length - 1) {
            parameters[part.substring(0, index)] = part.substring(index + 1);
        }
    }
    return {
        protocol,
        parameters
    };
}

function randInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
exports.randInclusive = randInclusive;
module.exports.generateSSRC = function() {
  return randInclusive(1, 0xffffffff);
}