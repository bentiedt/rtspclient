var rtsp = require('../lib/rtsp.js'),
  fs = require('fs');

var client = new rtsp.RtspClient();

// details is a plain Object that includes...
// format - string
client.connect('rtsp://192.168.0.184:554/stream1').then(function(details) {
  client.play();
}).catch(err => {
  console.log(err.stack);
});

var packets = [];
client.on('data', (port, payload, packet) => {
  if (packet.payloadType == 26) {
    packets.push(packet);
    if(packet.marker) {
      packets.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
      var parsedData = rtsp.rfc2435(packets);
      if (parsedData != null) {
        fs.writeFile("test.jpg", parsedData, "binary", function(err) {
          if(err) {
              console.log(err);
          }
        });
      }
      packets = [];
    } 
  }
});

// allows you to optionally allow for RTSP logging
// also allows for you to hook this into your own logging system easily
client.on('log', (data, direction) => {
  console.log(`${direction}:${data}`);
});