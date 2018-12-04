const net = require('net'),
    util = require('./util'),
    getMD5Hash = util.getMD5Hash,
    assign = util.assign,
    parseTransport = util.parseTransport,
    parseRTPPacket = require('./rtp.js'),
    parse = require('url').parse,
    EventEmitter = require('events'),
    transform = require('sdp-transform'),
    
    rfc2435 = require('./payloadType/rfc2435'),

    WWW_AUTH_REGEX = new RegExp('([a-z]+)=\'([^,\s]+)\'');

module.exports.RtspClient = class extends EventEmitter {
    constructor(username, password, headers = {}) {
        super();

        this.username = username;
        this.password = password;
        this.isConnected = false;
        this._cSeq = 0;
        this._packets = [];

        this.headers = {
            'User-Agent': 'rtspclient/1.0.0'
        };
        assign(this.headers, headers);
    }

    _onData(data) {
        if(this.previousRemnants != null) {
            data = Buffer.concat([this.previousRemnants, data]);
            this.previousRemnants = null;
        }
        if (data[0] === 0x24) {
            if(data.length < 4) {
                this.previousRemnants = data;
                return;
            }

            let packetLength = data.readUInt16BE(2);
            if(packetLength > data.length - 4) {
                this.previousRemnants = data;
                return;
            }

            if(data[1] === 0) { // rtp packet                
                let packet = data.slice(4, packetLength + 4);
                let rtpPacket = parseRTPPacket(packet);

                if(rtpPacket != null) { //null means bad packet
                    this._packets.push(rtpPacket);
                    if(rtpPacket.marker) {
                        this._packets.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
                        switch(this._packets[0].payloadType) {
                            case 26: this.emit('frame', rfc2435(this._packets)); break;
                            default: throw Error(`Payload type ${this._packets[0].payloadType} is unsupported`);
                        }
                        this._packets = [];
                    } 
                }
                    
                data = data.slice(4 + packetLength);
                if(data.length > 0)
                    this._onData.call(this, data);
                return;

            } else if(data[1] == 1) { //RTCP packet
                if(packetLength > data.length - 4) {
                    this.previousRemnants = data;
                    return;
                }
                let packet = data.slice(4, packetLength + 4);
                //possibly should do something with this packet?

                data = data.slice(4 + packetLength);
                if(data.length > 0)
                    this._onData.call(this, data);
                return;
            }
        }

        let sData = data.toString('utf8');

        if (sData.split(' ')[0].indexOf('RTSP') < 0) { //so not rtp, rtcp or rtsp... probably framgmented packet
            if(data.length < 10000) { //arbritary number of bytes to mean wait for more data 
                this.previousRemnants = data;
                return;
            }
            throw new Error('unknown protocol? please make sure you are connecting to an rtsp server'); 
        }

        this.emit('log', sData, 'S->C');

        let lines = sData.split('\n');
        let headers = {};
        let mediaHeaders = [];

        lines.forEach((line, index) => {
            if (index == 0)
                return;

            if (line[1] === '=') {
                mediaHeaders.push(line);
            } else {
                let split = line.split(':');
                let data = split.slice(1).join(':').trim();

                headers[split[0].trim()] = data.match(/^[0-9]+$/) ? parseInt(data, 10) : data;
            }
        });

        this.emit('response', lines[0], headers, mediaHeaders);
    }

    connect(url) {
        const { hostname, port } = parse(url);
        this._url = url;

        let format = "";

        return new Promise((resolve, reject) => {
            let client;

            let errorListener = (err) => {
                client.removeListener('error', errorListener);
                reject(err);
            };

            let closeListener = () => {
                client.removeListener('close', closeListener);
                this.close(true);
            };

            let responseListener = (responseName, headers) => {
                let name = responseName.split(' ')[0];
                if (name.indexOf('RTSP/') === 0)
                    return;

                // TODO: Send back errors... for some reason?
                if (name === 'REDIRECT' || name === 'ANNOUNCE')
                    this.respond('200 OK', {
                        CSeq: headers.CSeq
                    });

                if (name === 'REDIRECT') {
                    this.close();
                    this.connect(headers.Location);
                }
            };

            client = net.connect(port || 554, hostname, () => {
                this.isConnected = true;
                this._client = client;

                this.packetLength = -1;
                const packets = [];

                client.removeListener('error', errorListener);

                this.on('response', responseListener);


                resolve(this);
            });

            client.on('data', this._onData.bind(this));
            client.on('error', errorListener);
            client.on('close', closeListener);
        }).then(() => {
            return this.request('DESCRIBE', {
                Accept: 'application/sdp'
            });
        }).then((obj) => {
            let sdp = transform.parse(obj.mediaHeaders.join('\r\n'));

            let mediaSource;
            sdp.media.forEach((media) => {
                if (media.type === 'video' && media.protocol === 'RTP/AVP')
                    mediaSource = media;
            });

            if (!mediaSource)
                throw new Error('only video sources using the RTP/AVP protocol are supported at this time');

            if (mediaSource.control)
                if (mediaSource.control.startsWith('rtsp://'))
                    this._url = mediaSource.control;
                else
                    this._url += '/' + mediaSource.control;

            mediaSource.rtp.forEach((obj) => {
                if (format.length > 0)
                    return;
                if (obj.codec) {
                    format = obj.codec;
                }
            })

            return this.request('SETUP', assign({
                Transport: 'RTP/AVP/TCP;interleaved=0-1'
            }));
        }).then((headers) => {
            if (headers.Transport.split(';')[0] !== 'RTP/AVP/TCP')
                throw new Error('only RTSP servers supporting RTP/AVP over TCP are supported at this time');

            if (headers.Unsupported)
                this._unsupportedExtensions = headers.Unsupported.split(',');
            let transport = parseTransport(headers.Transport);
            this._session = headers.Session;

            return {
                format
            };
        });
    }

    request(requestName, headers = {}, url) {
        let id = ++this._cSeq;
        let string = `${requestName} ${url || this._url} RTSP/1.0\r\nCSeq: ${id}\r\n`;

        assign(headers, this.headers);
        Object.keys(headers).forEach((header, index) => {
            string += `${header}: ${headers[Object.keys(headers)[index]].toString()}\r\n`;
        });

        this.emit('log', string, 'C->S');
        this._client.write(string + '\r\n');

        return new Promise((resolve, reject) => {
            let responseHandler = (responseName, headers, mediaHeaders) => {
                if (headers.CSeq !== id && headers.Cseq !== id)
                    return;

                this.removeListener('response', responseHandler);

                let status = parseInt(responseName.split(' ')[1]);
                if (status !== 200) {
                    if (status === 401) {
                        let type = headers['WWW-Authenticate'].split(' ')[0];
                        let authHeaders = {};

                        let match = WWW_AUTH_REGEX.exec(headers['WWW-Authenticate']);
                        while (match) {
                            authHeaders[match[0]] = match[1];

                            match = WWW_AUTH_REGEX.exec(headers['WWW-Authenticate']);
                        }

                        let authString = '';
                        if (type === 'Digest') {
                            let ha1 = getMD5Hash(`${this.username}:${authHeaders.realm}:${this.password}`);
                            let ha2 = getMD5Hash(`${requestName}:${this._url}`);
                            let ha3 = getMD5Hash(`${ha1}:${authHeaders.nonce}:${ha2}`);

                            authString = `Digest username="${this.username}",realm="${authHeaders.realm}",nonce="${authHeaders.nonce}",uri="${this._url}",response="${ha3}"`;
                        } else if (type === 'Basic') {
                            // so secure, using Base64 to encrypt it
                            authString = 'Basic ' + new Buffer(`${this.username}:${this.password}`).toString('base64');
                        }

                        resolve(this.request(requestName, assign(headers, {
                            Authorization: authString
                        }), url));
                        return;
                    }
                    reject(new Error(`bad RTSP status code ${status}`));
                    return;
                } else {
                    if (mediaHeaders.length > 0) {
                        resolve({
                            headers,
                            mediaHeaders
                        });
                    } else {
                        resolve(headers);
                    }
                }
            };

            this.on('response', responseHandler);
        });
    }

    respond(status, headers = {}) {
        let string = `RTSP/1.0 ${status}\r\n`;

        assign(headers, this.headers);
        string += Object.keys(headers).map((header, index) => {
            return `${header}: ${headers[Object.keys(headers)[index]].toString()}`;
        }).join('\r\n');
        Object.keys(headers).forEach((header, index) => {
            string += `${header}: ${headers[Object.keys(headers)[index]].toString()}\r\n`;
        });

        this.emit('log', string, 'C->S');
        this._client.write(string + '\r\n');
    }

    play() {
        if (!this.isConnected)
            throw new Error('client is not connected');

        return this.request('PLAY', {
            Session: this._session
        }).then(() => {
            return this;
        });
    }

    pause() {
        if (!this.isConnected)
            throw new Error('client is not connected');

        return this.request('PAUSE', {
            Session: this._session
        }).then(() => this);
    }

    close(isImmediate = false) {
        const promise = (resolve, reject) => {
            this._client.end();

            this.removeAllListeners('response');

            this.isConnected = false;
            this._cSeq = 0;

            return this;
        };

        if (!isImmediate) {
            return this.request('TEARDOWN', {
                Session: this._session
            }).then(() => new Promise(promise));
        } else {
            return new Promise(promise);
        }
    }
}
