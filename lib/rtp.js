module.exports = function parseRTPPacket(buffer) {
    const version = (buffer[0] & 0xC0) >>> 6,
          padding = (buffer[0] & 0x20) >>> 5,
          extensions = (buffer[0] & 0x16) >>> 4,
          csrcCount = buffer[0] & 0xF,
          marker = (buffer[1] & 0x80) >>> 7,
          payloadType = buffer[1] & 0x7F,
          sequenceNumber = buffer.readUInt16BE(2),
          timestamp = buffer.readUInt32BE(4),
          ssrc = buffer.readUInt32BE(8),
          csrc = [];

    for(let i = 0; i < csrcCount; i ++)
        csrc.push(buffer.readUInt32BE(12 + i * 4));

    const endCsrcIdx = 12 + csrcCount * 4;

    let ret = {
        version,
        padding,
        extensions,
        csrcCount,
        marker,
        payloadType,
        sequenceNumber,
        timestamp,
        ssrc,
        csrc,
        extension: null
    };

    let payloadStartsAt = endCsrcIdx;
    if(extensions) {
        const extensionLength = buffer.readUInt16BE(endCsrcIdx + 2);
        ret.extension = {
            id: buffer.readUInt16BE(endCsrcIdx),
            data: buffer.slice(endCsrcIdx + 4, endCsrcIdx + 4 + extensionLength)
        }
        payloadStartsAt += 4 + extensionLength;
    }
    
    ret.payload = buffer.slice(payloadStartsAt);

    return ret;
}
