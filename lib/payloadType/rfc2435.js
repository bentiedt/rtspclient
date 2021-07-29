/**
 * references:
 * https://entelijan.net/svn1/javaprj/experimental/jmf/src/com/sun/media/codec/video/jpeg/RTPDePacketizer.java
 * https://tools.ietf.org/html/rfc2435
*/

const lum_dc_codelens = [0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0];
const lum_dc_symbols = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const lum_ac_codelens = [0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 0x7d];
const lum_ac_symbols = [
        0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12,
        0x21, 0x31, 0x41, 0x06, 0x13, 0x51, 0x61, 0x07,
        0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08,
        0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0,
        0x24, 0x33, 0x62, 0x72, 0x82, 0x09, 0x0a, 0x16,
        0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28,
        0x29, 0x2a, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39,
        0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49,
        0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
        0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69,
        0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79,
        0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
        0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98,
        0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7,
        0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6,
        0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5,
        0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xd2, 0xd3, 0xd4,
        0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2,
        0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea,
        0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8,
        0xf9, 0xfa,
];

const chm_dc_codelens = [0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0];
const chm_dc_symbols = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const chm_ac_codelens = [0, 2, 1, 2, 4, 4, 3, 4, 7, 5, 4, 4, 0, 1, 2, 0x77];
const chm_ac_symbols = [
        0x00, 0x01, 0x02, 0x03, 0x11, 0x04, 0x05, 0x21,
        0x31, 0x06, 0x12, 0x41, 0x51, 0x07, 0x61, 0x71,
        0x13, 0x22, 0x32, 0x81, 0x08, 0x14, 0x42, 0x91,
        0xa1, 0xb1, 0xc1, 0x09, 0x23, 0x33, 0x52, 0xf0,
        0x15, 0x62, 0x72, 0xd1, 0x0a, 0x16, 0x24, 0x34,
        0xe1, 0x25, 0xf1, 0x17, 0x18, 0x19, 0x1a, 0x26,
        0x27, 0x28, 0x29, 0x2a, 0x35, 0x36, 0x37, 0x38,
        0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48,
        0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58,
        0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68,
        0x69, 0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78,
        0x79, 0x7a, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87,
        0x88, 0x89, 0x8a, 0x92, 0x93, 0x94, 0x95, 0x96,
        0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5,
        0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4,
        0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3,
        0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xd2,
        0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda,
        0xe2, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9,
        0xea, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8,
        0xf9, 0xfa,
]

function makeQuantHeader(qt, tableNo) {
    let ret = [
        0xFF,
        0xDB, // DQT
        0, //len msb
        qt.length + 3, //len lsb,
        tableNo
    ];
    for(let i = 0; i < qt.length; i++)
        ret.push(qt[i]);

    return ret;
}

function makeHuffmanHeader(codelens, symbols, tableNo, tableClass) {
    let ret = [
        0xFF,
        0xC4,
        0, //len msb
        3 + codelens.length + symbols.length, //len lsb
        (tableClass << 4) | tableNo
    ];
    for(let i = 0; i < codelens.length; i++)
        ret.push(codelens[i]);
    for(let i = 0; i < symbols.length; i++)
        ret.push(symbols[i]);
    
    return ret;
}

function makeDRIHeader(dri) {
    let ret = [
        0xFF,
        0xDD,
        0, //len msb
        4, //len lsb,
        dri >> 8, //dri msb
        dri & 0xFF //dri lsb
    ];
    return ret;
}

/*
* Table K.1 from JPEG spec.
*/
const jpeg_luma_quantizer = [
        16, 11, 10, 16, 24, 40, 51, 61,
        12, 12, 14, 19, 26, 58, 60, 55,
        14, 13, 16, 24, 40, 57, 69, 56,
        14, 17, 22, 29, 51, 87, 80, 62,
        18, 22, 37, 56, 68, 109, 103, 77,
        24, 35, 55, 64, 81, 104, 113, 92,
        49, 64, 78, 87, 103, 121, 120, 101,
        72, 92, 95, 98, 112, 100, 103, 99
];

/*
* Table K.2 from JPEG spec.
*/
const jpeg_chroma_quantizer = [
        17, 18, 24, 47, 99, 99, 99, 99,
        18, 21, 26, 66, 99, 99, 99, 99,
        24, 26, 56, 99, 99, 99, 99, 99,
        47, 66, 99, 99, 99, 99, 99, 99,
        99, 99, 99, 99, 99, 99, 99, 99,
        99, 99, 99, 99, 99, 99, 99, 99,
        99, 99, 99, 99, 99, 99, 99, 99,
        99, 99, 99, 99, 99, 99, 99, 99
];
/*
 * Call MakeTables with the Q factor and two u_char[64] return arrays
 */
function makeTables(q) {
    let factor = q,
        lqt = [],
        cqt = [];

    if (q < 1) factor = 1;
    if (q > 99) factor = 99;
    if (q < 50)
        q = 5000 / factor;
      else
        q = 200 - factor * 2;

    for (let i = 0; i < 64; i++) {
        let lq = (jpeg_luma_quantizer[i] * q + 50) / 100;
        let cq = (jpeg_chroma_quantizer[i] * q + 50) / 100;

        /* Limit the quantizers to 1 <= q <= 255 */
        if (lq < 1) lq = 1;
        else if (lq > 255) lq = 255;
        lqt[i] = lq;

        if (cq < 1) cq = 1;
        else if (cq > 255) cq = 255;
        cqt[i] = cq;
    }
    return [
        lqt,
        cqt
    ];
}

function makeQuantTables(tables, precision) {
    precision = precision === 0 ? 64 : 128;

    let ret = [],
        tableCount = tables.length / precision;
    for(let i = 0; i < tableCount; i++) {
        ret.push(...[0xFF, 0xDB, 0]);
        ret.push(precision + 3);
        ret.push(i);
        for(let s = i * precision, e = s + precision; s < e; s++)
            ret.push(tables[s]);
    }
    return ret;
}

function makeHeaders(type, q, w, h, precision, quantTables, restartInterval) {
    w *= 8;
    h *= 8;

    let header = [];

    header.push(0xFF);
    header.push(0xD8);

    if(quantTables == null)
        quantTables = Buffer.from(makeTables(q));

    header.push(...makeQuantTables(quantTables, precision));
    if(restartInterval != 0)
        header.push(makeDRIHeader(restartInterval));

    header.push(...[
        0xFF, 
        0xC0, //sof
        0, //len msb
        17, //len lsb
        8, //8 bit precision
        (h >> 8) & 0xFF, //hight msb
        h & 0xFF, //hight lsb
        (w >> 8) & 0xFF, //width msb
        w & 0xFF, //width lsb
        3, //num of components
        0, //comp 0
        (type == 0 ? 0x21 : 0x22), // hsamp = 2, vsamp = 1 : 2
        0, //quant table 0
        1, //comp 1
        0x11, //hsamp = 1, vsamp = 1
        1, // quant table 1
        2, //comp 2
        0x11, //hsamp = 1, vsamp = 1
        1 //quant table 1
    ]);
    header.push(...makeHuffmanHeader(lum_dc_codelens, lum_dc_symbols, 0, 0));
    header.push(...makeHuffmanHeader(lum_ac_codelens, lum_ac_symbols, 0, 1));
    header.push(...makeHuffmanHeader(chm_dc_codelens, chm_dc_symbols, 1, 0));
    header.push(...makeHuffmanHeader(chm_ac_codelens, chm_ac_symbols, 1, 1));

    header.push(...[
        0xFF, 
        0xDA, /* SOS */
        0,    /* length msb */
        12,   /* length lsb */
        3,    /* 3 components */
        0,    /* comp 0 */
        0,    /* huffman table 0 */
        1,    /* comp 1 */
        0x11, /* huffman table 1 */
        2,    /* comp 2 */
        0x11, /* huffman table 1 */
        0,    /* first DCT coeff */
        63,   /* last DCT coeff */
        0     /* sucessive approx. */
    ]);

    return header;
}

module.exports = function(packets) {
    let i = 0,
        payloadBuffers = [];
    for(let packet of packets) {
        let payload = packet.payload;

        const typeSpecific = payload.readUInt8(),
              fragmentOffset = (payload[1] << 16) | (payload[2] << 8) | payload[3],
              type = payload.readUInt8(4),
              q = payload.readUInt8(5),
              width = payload.readUInt8(6),
              height = payload.readUInt8(7),
              restartHeader = null,
              quantTable = null;

        let offset = 8;
        if(type >=64 && type <= 127) {
            restartHeader = {
                restartInterval: payload.readUInt16BE(offset),
                f: (payload[offset + 2] & 0x80) >>> 7,
                l: (payload[offset + 2] & 0x40) >>> 6,
                restartCount: (payload[offset + 2] & 0x3F) << 8 | payload[offset + 3]
            } 
            offset += 4;
        }

        if(i++ == 0) {
            if(q >= 128 && q <= 255) {
                let mbz = payload.readUInt8(offset),
                    precision = payload.readUInt8(offset + 1),
                    length = payload.readUInt16BE(offset + 2),
                    tableData = null;

                offset += 4;
                //must discard packet if length is > packet size
                if(length > payload.length - offset) {
                    return null;
                }
                if(mbz != 0) {
                    return null; //must be zero
                }

                if(length > 0) {
                    tableData = payload.slice(offset, length + offset);
                    offset += length;
                }

                let header = makeHeaders(type, q, width, height, precision, tableData, restartHeader == null ? 0 : restartHeader.restartInterval);
                payloadBuffers.push(Buffer.from(header));
            }
        }

        payloadBuffers.push(payload.slice(offset));
    }

    return Buffer.concat(payloadBuffers);
}