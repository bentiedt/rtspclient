rtspclient 0.5.0
===

**I originally took this repository from mbullington's yellow stone so credit should 
go to him for the initial work, i simply needed a working version for Axis mjpeg streams**

RtspClient is a high-level library for receiving data from RTSP/RTP. It
currently only supports RTSP/RTP over TCP MJPEG. 
It's probably easy enough to implement other RFC specs but I have no need for myself.

RtspClient is written with ES6 and works fine with node 7.1.0 but should work with 6.9.1

RtspClient does currently support:

- Raw RTP/AVP over TCP
- Basic and Digest Authentication
- Pause, Play, and Teardown (Close)

In the future, RtspClient plans to support:

- RTCP
- Record and Announce Methods
- Full Client RTSP support
- Basic scriptable RTSP server (which also allows for unit tests)



Examples
===

An example of most of the API can be found at examples/wowza.js.

```js
var RtspClient = require('rtspclient').RtspClient;

var client = new RtspClient();

// details is a plain Object that includes...
// format - string
client.connect('rtsp://someserver/mjpeg').then(function(details) {
  client.play();
}).catch(err => {
  console.log(err.stack);
});

//frame is a buffer
client.on('frame', frame => {
  console.log(frame);
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