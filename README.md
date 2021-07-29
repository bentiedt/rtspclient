rtspclient 0.5.0
===

** This is partial up-merge of almightyju's rtspclient back to mbullington's
yellowstone implementation to incorporate rtspclient's support for MJPEG-encoded RTSP 
streams with the option of parsing out individual JPG frames from the raw data while 
restoring UDP support, keep alives, and authentication from yellowstone **

RtspClient is a high-level library for receiving data from RTSP/RTP with support for MJPEG and JPEG frame decoding.

RtspClient is written with ES6 and works fine with node 7.1.0 but should work with 6.9.1

RtspClient does currently support:

- Raw RTP/AVP over TCP or UDP
- Basic and Digest Authentication
- Pause, Play, and Teardown (Close)

Examples
===

```js
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
```

License
===

You can just read the LICENSE file, or npm. It's MIT.
