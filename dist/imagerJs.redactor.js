/*! ImagerJs - 1.0.8 */

(function () {
    "use strict";
    var that = {};


    that.remove = function (jpeg) {
        var b64 = false;
        if (jpeg.slice(0, 2) == "\xff\xd8") {
        } else if (jpeg.slice(0, 23) == "data:image/jpeg;base64,") {
            jpeg = atob(jpeg.split(",")[1]);
            b64 = true;
        } else {
            throw ("Given data is not jpeg.");
        }
        
        var segments = splitIntoSegments(jpeg);
        if (segments[1].slice(0, 2) == "\xff\xe1") {
            segments = [segments[0]].concat(segments.slice(2));
        } else if (segments[2].slice(0, 2) == "\xff\xe1") {
            segments = segments.slice(0, 2).concat(segments.slice(3));
        } else {
            throw("Exif not found.");
        }
        
        var new_data = segments.join("");
        if (b64) {
            new_data = "data:image/jpeg;base64," + btoa(new_data);
        }

        return new_data;
    };


    that.insert = function (exif, jpeg) {
        var b64 = false;
        if (exif.slice(0, 6) != "\x45\x78\x69\x66\x00\x00") {
            throw ("Given data is not exif.");
        }
        if (jpeg.slice(0, 2) == "\xff\xd8") {
        } else if (jpeg.slice(0, 23) == "data:image/jpeg;base64,") {
            jpeg = atob(jpeg.split(",")[1]);
            b64 = true;
        } else {
            throw ("Given data is not jpeg.");
        }

        var exifStr = "\xff\xe1" + pack(">H", [exif.length + 2]) + exif;
        var segments = splitIntoSegments(jpeg);
        var new_data = mergeSegments(segments, exifStr);
        if (b64) {
            new_data = "data:image/jpeg;base64," + btoa(new_data);
        }

        return new_data;
    };


    that.load = function (data) {
        var input_data;
        if (typeof (data) == "string") {
            if (data.slice(0, 2) == "\xff\xd8") {
                input_data = data;
            } else if (data.slice(0, 23) == "data:image/jpeg;base64,") {
                input_data = atob(data.split(",")[1]);
            } else if (data.slice(0, 4) == "Exif") {
                input_data = data.slice(6);
            } else {
                throw ("'load' gots invalid file data.");
            }
        } else {
            throw ("'load' gots invalid type argument.");
        }

        var exifDict = {};
        var exif_dict = {
            "0th": {},
            "Exif": {},
            "GPS": {},
            "Interop": {},
            "1st": {},
            "thumbnail": null
        };
        var exifReader = new ExifReader(input_data);
        if (exifReader.tiftag === null) {
            return exif_dict;
        }

        if (exifReader.tiftag.slice(0, 2) == "\x49\x49") {
            exifReader.endian_mark = "<";
        } else {
            exifReader.endian_mark = ">";
        }

        var pointer = unpack(exifReader.endian_mark + "L",
            exifReader.tiftag.slice(4, 8))[0];
        exif_dict["0th"] = exifReader.get_ifd(pointer, "0th");

        var first_ifd_pointer = exif_dict["0th"]["first_ifd_pointer"];
        delete exif_dict["0th"]["first_ifd_pointer"];

        if (34665 in exif_dict["0th"]) {
            pointer = exif_dict["0th"][34665];
            exif_dict["Exif"] = exifReader.get_ifd(pointer, "Exif");
        }
        if (34853 in exif_dict["0th"]) {
            pointer = exif_dict["0th"][34853];
            exif_dict["GPS"] = exifReader.get_ifd(pointer, "GPS");
        }
        if (40965 in exif_dict["Exif"]) {
            pointer = exif_dict["Exif"][40965];
            exif_dict["Interop"] = exifReader.get_ifd(pointer, "Interop");
        }
        if (first_ifd_pointer != "\x00\x00\x00\x00") {
            pointer = unpack(exifReader.endian_mark + "L",
                first_ifd_pointer)[0];
            exif_dict["1st"] = exifReader.get_ifd(pointer, "1st");
            if ((513 in exif_dict["1st"]) && (514 in exif_dict["1st"])) {
                var end = exif_dict["1st"][513] + exif_dict["1st"][514];
                var thumb = exifReader.tiftag.slice(exif_dict["1st"][513], end);
                exif_dict["thumbnail"] = thumb;
            }
        }

        return exif_dict;
    };


    that.dump = function (exif_dict_original) {
        var TIFF_HEADER_LENGTH = 8;

        var exif_dict = copy(exif_dict_original);
        var header = "Exif\x00\x00\x4d\x4d\x00\x2a\x00\x00\x00\x08";
        var exif_is = false;
        var gps_is = false;
        var interop_is = false;
        var first_is = false;

        var zeroth_ifd,
            exif_ifd,
            interop_ifd,
            gps_ifd,
            first_ifd;
        if ("0th" in exif_dict) {
            zeroth_ifd = exif_dict["0th"];
        } else {
            zeroth_ifd = {};
        }
        if ((("Exif" in exif_dict) && (Object.keys(exif_dict["Exif"]).length)) ||
            (("Interop" in exif_dict) && (Object.keys(exif_dict["Interop"]).length))) {
            zeroth_ifd[34665] = 1;
            exif_is = true;
            exif_ifd = exif_dict["Exif"];
            if (("Interop" in exif_dict) && Object.keys(exif_dict["Interop"]).length) {
                exif_ifd[40965] = 1;
                interop_is = true;
                interop_ifd = exif_dict["Interop"];
            }
        }
        if (("GPS" in exif_dict) && (Object.keys(exif_dict["GPS"]).length)) {
            zeroth_ifd[34853] = 1;
            gps_is = true;
            gps_ifd = exif_dict["GPS"];
        }
        if (("1st" in exif_dict) &&
            ("thumbnail" in exif_dict) &&
            (exif_dict["thumbnail"] != null)) {
            first_is = true;
            exif_dict["1st"][513] = 1;
            exif_dict["1st"][514] = 1;
            first_ifd = exif_dict["1st"];
        }

        var zeroth_set = _dict_to_bytes(zeroth_ifd, "0th", 0);
        var zeroth_length = (zeroth_set[0].length + exif_is * 12 + gps_is * 12 + 4 +
            zeroth_set[1].length);

        var exif_set,
            exif_bytes = "",
            exif_length = 0,
            gps_set,
            gps_bytes = "",
            gps_length = 0,
            interop_set,
            interop_bytes = "",
            interop_length = 0,
            first_set,
            first_bytes = "",
            thumbnail;
        if (exif_is) {
            exif_set = _dict_to_bytes(exif_ifd, "Exif", zeroth_length);
            exif_length = exif_set[0].length + interop_is * 12 + exif_set[1].length;
        }
        if (gps_is) {
            gps_set = _dict_to_bytes(gps_ifd, "GPS", zeroth_length + exif_length);
            gps_bytes = gps_set.join("");
            gps_length = gps_bytes.length;
        }
        if (interop_is) {
            var offset = zeroth_length + exif_length + gps_length;
            interop_set = _dict_to_bytes(interop_ifd, "Interop", offset);
            interop_bytes = interop_set.join("");
            interop_length = interop_bytes.length;
        }
        if (first_is) {
            var offset = zeroth_length + exif_length + gps_length + interop_length;
            first_set = _dict_to_bytes(first_ifd, "1st", offset);
            thumbnail = _get_thumbnail(exif_dict["thumbnail"]);
            if (thumbnail.length > 64000) {
                throw ("Given thumbnail is too large. max 64kB");
            }
        }

        var exif_pointer = "",
            gps_pointer = "",
            interop_pointer = "",
            first_ifd_pointer = "\x00\x00\x00\x00";
        if (exif_is) {
            var pointer_value = TIFF_HEADER_LENGTH + zeroth_length;
            var pointer_str = pack(">L", [pointer_value]);
            var key = 34665;
            var key_str = pack(">H", [key]);
            var type_str = pack(">H", [TYPES["Long"]]);
            var length_str = pack(">L", [1]);
            exif_pointer = key_str + type_str + length_str + pointer_str;
        }
        if (gps_is) {
            var pointer_value = TIFF_HEADER_LENGTH + zeroth_length + exif_length;
            var pointer_str = pack(">L", [pointer_value]);
            var key = 34853;
            var key_str = pack(">H", [key]);
            var type_str = pack(">H", [TYPES["Long"]]);
            var length_str = pack(">L", [1]);
            gps_pointer = key_str + type_str + length_str + pointer_str;
        }
        if (interop_is) {
            var pointer_value = (TIFF_HEADER_LENGTH +
                zeroth_length + exif_length + gps_length);
            var pointer_str = pack(">L", [pointer_value]);
            var key = 40965;
            var key_str = pack(">H", [key]);
            var type_str = pack(">H", [TYPES["Long"]]);
            var length_str = pack(">L", [1]);
            interop_pointer = key_str + type_str + length_str + pointer_str;
        }
        if (first_is) {
            var pointer_value = (TIFF_HEADER_LENGTH + zeroth_length +
                exif_length + gps_length + interop_length);
            first_ifd_pointer = pack(">L", [pointer_value]);
            var thumbnail_pointer = (pointer_value + first_set[0].length + 24 +
                4 + first_set[1].length);
            var thumbnail_p_bytes = ("\x02\x01\x00\x04\x00\x00\x00\x01" +
                pack(">L", [thumbnail_pointer]));
            var thumbnail_length_bytes = ("\x02\x02\x00\x04\x00\x00\x00\x01" +
                pack(">L", [thumbnail.length]));
            first_bytes = (first_set[0] + thumbnail_p_bytes +
                thumbnail_length_bytes + "\x00\x00\x00\x00" +
                first_set[1] + thumbnail);
        }

        var zeroth_bytes = (zeroth_set[0] + exif_pointer + gps_pointer +
            first_ifd_pointer + zeroth_set[1]);
        if (exif_is) {
            exif_bytes = exif_set[0] + interop_pointer + exif_set[1];
        }

        return (header + zeroth_bytes + exif_bytes + gps_bytes +
            interop_bytes + first_bytes);
    };


    function copy(obj) {
        return JSON.parse(JSON.stringify(obj));
    }


    function _get_thumbnail(jpeg) {
        var segments = splitIntoSegments(jpeg);
        while (("\xff\xe0" <= segments[1].slice(0, 2)) && (segments[1].slice(0, 2) <= "\xff\xef")) {
            segments = [segments[0]].concat(segments.slice(2));
        }
        return segments.join("");
    }


    function _pack_byte(array) {
        return pack(">" + nStr("B", array.length), array);
    }


    function _pack_short(array) {
        return pack(">" + nStr("H", array.length), array);
    }


    function _pack_long(array) {
        return pack(">" + nStr("L", array.length), array);
    }


    function _value_to_bytes(raw_value, value_type, offset) {
        var four_bytes_over = "";
        var value_str = "";
        var length,
            new_value,
            num,
            den;

        if (value_type == "Byte") {
            length = raw_value.length;
            if (length <= 4) {
                value_str = (_pack_byte(raw_value) +
                    nStr("\x00", 4 - length));
            } else {
                value_str = pack(">L", [offset]);
                four_bytes_over = _pack_byte(raw_value);
            }
        } else if (value_type == "Short") {
            length = raw_value.length;
            if (length <= 2) {
                value_str = (_pack_short(raw_value) +
                    nStr("\x00\x00", 2 - length));
            } else {
                value_str = pack(">L", [offset]);
                four_bytes_over = _pack_short(raw_value);
            }
        } else if (value_type == "Long") {
            length = raw_value.length;
            if (length <= 1) {
                value_str = _pack_long(raw_value);
            } else {
                value_str = pack(">L", [offset]);
                four_bytes_over = _pack_long(raw_value);
            }
        } else if (value_type == "Ascii") {
            new_value = raw_value + "\x00";
            length = new_value.length;
            if (length > 4) {
                value_str = pack(">L", [offset]);
                four_bytes_over = new_value;
            } else {
                value_str = new_value + nStr("\x00", 4 - length);
            }
        } else if (value_type == "Rational") {
            if (typeof (raw_value[0]) == "number") {
                length = 1;
                num = raw_value[0];
                den = raw_value[1];
                new_value = pack(">L", [num]) + pack(">L", [den]);
            } else {
                length = raw_value.length;
                new_value = "";
                for (var n = 0; n < length; n++) {
                    num = raw_value[n][0];
                    den = raw_value[n][1];
                    new_value += (pack(">L", [num]) +
                        pack(">L", [den]));
                }
            }
            value_str = pack(">L", [offset]);
            four_bytes_over = new_value;
        } else if (value_type == "SRational") {
            if (typeof (raw_value[0]) == "number") {
                length = 1;
                num = raw_value[0];
                den = raw_value[1];
                new_value = pack(">l", [num]) + pack(">l", [den]);
            } else {
                length = raw_value.length;
                new_value = "";
                for (var n = 0; n < length; n++) {
                    num = raw_value[n][0];
                    den = raw_value[n][1];
                    new_value += (pack(">l", [num]) +
                        pack(">l", [den]));
                }
            }
            value_str = pack(">L", [offset]);
            four_bytes_over = new_value;
        } else if (value_type == "Undefined") {
            length = raw_value.length;
            if (length > 4) {
                value_str = pack(">L", [offset]);
                four_bytes_over = raw_value;
            } else {
                value_str = raw_value + nStr("\x00", 4 - length);
            }
        }

        var length_str = pack(">L", [length]);

        return [length_str, value_str, four_bytes_over];
    }

    function _dict_to_bytes(ifd_dict, ifd, ifd_offset) {
        var TIFF_HEADER_LENGTH = 8;
        var tag_count = Object.keys(ifd_dict).length;
        var entry_header = pack(">H", [tag_count]);
        var entries_length;
        if (["0th", "1st"].indexOf(ifd) > -1) {
            entries_length = 2 + tag_count * 12 + 4;
        } else {
            entries_length = 2 + tag_count * 12;
        }
        var entries = "";
        var values = "";
        var key;

        for (var key in ifd_dict) {
            if (typeof (key) == "string") {
                key = parseInt(key);
            }
            if ((ifd == "0th") && ([34665, 34853].indexOf(key) > -1)) {
                continue;
            } else if ((ifd == "Exif") && (key == 40965)) {
                continue;
            } else if ((ifd == "1st") && ([513, 514].indexOf(key) > -1)) {
                continue;
            }

            var raw_value = ifd_dict[key];
            var key_str = pack(">H", [key]);
            var value_type = TAGS[ifd][key]["type"];
            var type_str = pack(">H", [TYPES[value_type]]);

            if (typeof (raw_value) == "number") {
                raw_value = [raw_value];
            }
            var offset = TIFF_HEADER_LENGTH + entries_length + ifd_offset + values.length;
            var b = _value_to_bytes(raw_value, value_type, offset);
            var length_str = b[0];
            var value_str = b[1];
            var four_bytes_over = b[2];

            entries += key_str + type_str + length_str + value_str;
            values += four_bytes_over;
        }

        return [entry_header + entries, values];
    }



    function ExifReader(data) {
        var segments,
            app1;
        if (data.slice(0, 2) == "\xff\xd8") { // JPEG
            segments = splitIntoSegments(data);
            app1 = getApp1(segments);
            if (app1) {
                this.tiftag = app1.slice(10);
            } else {
                this.tiftag = null;
            }
        } else if (["\x49\x49", "\x4d\x4d"].indexOf(data.slice(0, 2)) > -1) { // TIFF
            this.tiftag = data;
        } else if (data.slice(0, 4) == "Exif") { // Exif
            this.tiftag = data.slice(6);
        } else {
            throw ("Given file is neither JPEG nor TIFF.");
        }
    }

    ExifReader.prototype = {
        get_ifd: function (pointer, ifd_name) {
            var ifd_dict = {};
            var tag_count = unpack(this.endian_mark + "H",
                this.tiftag.slice(pointer, pointer + 2))[0];
            var offset = pointer + 2;
            var t;
            if (["0th", "1st"].indexOf(ifd_name) > -1) {
                t = "Image";
            } else {
                t = ifd_name;
            }

            for (var x = 0; x < tag_count; x++) {
                pointer = offset + 12 * x;
                var tag = unpack(this.endian_mark + "H",
                    this.tiftag.slice(pointer, pointer + 2))[0];
                var value_type = unpack(this.endian_mark + "H",
                    this.tiftag.slice(pointer + 2, pointer + 4))[0];
                var value_num = unpack(this.endian_mark + "L",
                    this.tiftag.slice(pointer + 4, pointer + 8))[0];
                var value = this.tiftag.slice(pointer + 8, pointer + 12);

                var v_set = [value_type, value_num, value];
                if (tag in TAGS[t]) {
                    ifd_dict[tag] = this.convert_value(v_set);
                }
            }

            if (ifd_name == "0th") {
                pointer = offset + 12 * tag_count;
                ifd_dict["first_ifd_pointer"] = this.tiftag.slice(pointer, pointer + 4);
            }

            return ifd_dict;
        },

        convert_value: function (val) {
            var data = null;
            var t = val[0];
            var length = val[1];
            var value = val[2];
            var pointer;

            if (t == 1) { // BYTE
                if (length > 4) {
                    pointer = unpack(this.endian_mark + "L", value)[0];
                    data = unpack(this.endian_mark + nStr("B", length),
                        this.tiftag.slice(pointer, pointer + length));
                } else {
                    data = unpack(this.endian_mark + nStr("B", length), value.slice(0, length));
                }
            } else if (t == 2) { // ASCII
                if (length > 4) {
                    pointer = unpack(this.endian_mark + "L", value)[0];
                    data = this.tiftag.slice(pointer, pointer + length - 1);
                } else {
                    data = value.slice(0, length - 1);
                }
            } else if (t == 3) { // SHORT
                if (length > 2) {
                    pointer = unpack(this.endian_mark + "L", value)[0];
                    data = unpack(this.endian_mark + nStr("H", length),
                        this.tiftag.slice(pointer, pointer + length * 2));
                } else {
                    data = unpack(this.endian_mark + nStr("H", length),
                        value.slice(0, length * 2));
                }
            } else if (t == 4) { // LONG
                if (length > 1) {
                    pointer = unpack(this.endian_mark + "L", value)[0];
                    data = unpack(this.endian_mark + nStr("L", length),
                        this.tiftag.slice(pointer, pointer + length * 4));
                } else {
                    data = unpack(this.endian_mark + nStr("L", length),
                        value);
                }
            } else if (t == 5) { // RATIONAL
                pointer = unpack(this.endian_mark + "L", value)[0];
                if (length > 1) {
                    data = [];
                    for (var x = 0; x < length; x++) {
                        data.push([unpack(this.endian_mark + "L",
                                this.tiftag.slice(pointer + x * 8, pointer + 4 + x * 8))[0],
                                   unpack(this.endian_mark + "L",
                                this.tiftag.slice(pointer + 4 + x * 8, pointer + 8 + x * 8))[0]
                                   ]);
                    }
                } else {
                    data = [unpack(this.endian_mark + "L",
                            this.tiftag.slice(pointer, pointer + 4))[0],
                            unpack(this.endian_mark + "L",
                            this.tiftag.slice(pointer + 4, pointer + 8))[0]
                            ];
                }
            } else if (t == 7) { // UNDEFINED BYTES
                if (length > 4) {
                    pointer = unpack(this.endian_mark + "L", value)[0];
                    data = this.tiftag.slice(pointer, pointer + length);
                } else {
                    data = value.slice(0, length);
                }
            } else if (t == 10) { // SRATIONAL
                pointer = unpack(this.endian_mark + "L", value)[0];
                if (length > 1) {
                    data = [];
                    for (var x = 0; x < length; x++) {
                        data.push([unpack(this.endian_mark + "l",
                                this.tiftag.slice(pointer + x * 8, pointer + 4 + x * 8))[0],
                                   unpack(this.endian_mark + "l",
                                this.tiftag.slice(pointer + 4 + x * 8, pointer + 8 + x * 8))[0]
                                  ]);
                    }
                } else {
                    data = [unpack(this.endian_mark + "l",
                            this.tiftag.slice(pointer, pointer + 4))[0],
                            unpack(this.endian_mark + "l",
                            this.tiftag.slice(pointer + 4, pointer + 8))[0]
                           ];
                }
            } else {
                throw ("Exif might be wrong. Got incorrect value " +
                    "type to decode. type:" + t);
            }

            if ((data instanceof Array) && (data.length == 1)) {
                return data[0];
            } else {
                return data;
            }
        },
    };


    if (typeof btoa === "undefined") {
        var btoa = function (input) {        var output = "";
            var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
            var i = 0;
            var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

            while (i < input.length) {

                chr1 = input.charCodeAt(i++);
                chr2 = input.charCodeAt(i++);
                chr3 = input.charCodeAt(i++);

                enc1 = chr1 >> 2;
                enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                enc4 = chr3 & 63;

                if (isNaN(chr2)) {
                    enc3 = enc4 = 64;
                } else if (isNaN(chr3)) {
                    enc4 = 64;
                }

                output = output +
                keyStr.charAt(enc1) + keyStr.charAt(enc2) +
                keyStr.charAt(enc3) + keyStr.charAt(enc4);

            }

            return output;
        };
    }
    
    
    if (typeof atob === "undefined") {
        var atob = function (input) {
            var output = "";
            var chr1, chr2, chr3;
            var enc1, enc2, enc3, enc4;
            var i = 0;
            var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

            input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

            while (i < input.length) {

                enc1 = keyStr.indexOf(input.charAt(i++));
                enc2 = keyStr.indexOf(input.charAt(i++));
                enc3 = keyStr.indexOf(input.charAt(i++));
                enc4 = keyStr.indexOf(input.charAt(i++));

                chr1 = (enc1 << 2) | (enc2 >> 4);
                chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                chr3 = ((enc3 & 3) << 6) | enc4;

                output = output + String.fromCharCode(chr1);

                if (enc3 != 64) {
                    output = output + String.fromCharCode(chr2);
                }
                if (enc4 != 64) {
                    output = output + String.fromCharCode(chr3);
                }

            }

            return output;
        };
    }


    function getImageSize(imageArray) {
        var segments = slice2Segments(imageArray);
        var seg,
            width,
            height,
            SOF = [192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207];

        for (var x = 0; x < segments.length; x++) {
            seg = segments[x];
            if (SOF.indexOf(seg[1]) >= 0) {
                height = seg[5] * 256 + seg[6];
                width = seg[7] * 256 + seg[8];
                break;
            }
        }
        return [width, height];
    }


    function pack(mark, array) {
        if (!(array instanceof Array)) {
            throw ("'pack' error. Got invalid type argument.");
        }
        if ((mark.length - 1) != array.length) {
            throw ("'pack' error. " + (mark.length - 1) + " marks, " + array.length + " elements.");
        }

        var littleEndian;
        if (mark[0] == "<") {
            littleEndian = true;
        } else if (mark[0] == ">") {
            littleEndian = false;
        } else {
            throw ("");
        }
        var packed = "";
        var p = 1;
        var val = null;
        var c = null;
        var valStr = null;

        while (c = mark[p]) {
            if (c.toLowerCase() == "b") {
                val = array[p - 1];
                if ((c == "b") && (val < 0)) {
                    val += 0x100;
                }
                if ((val > 0xff) || (val < 0)) {
                    throw ("'pack' error.");
                } else {
                    valStr = String.fromCharCode(val);
                }
            } else if (c == "H") {
                val = array[p - 1];
                if ((val > 0xffff) || (val < 0)) {
                    throw ("'pack' error.");
                } else {
                    valStr = String.fromCharCode(Math.floor((val % 0x10000) / 0x100)) +
                        String.fromCharCode(val % 0x100);
                    if (littleEndian) {
                        valStr = valStr.split("").reverse().join("");
                    }
                }
            } else if (c.toLowerCase() == "l") {
                val = array[p - 1];
                if ((c == "l") && (val < 0)) {
                    val += 0x100000000;
                }
                if ((val > 0xffffffff) || (val < 0)) {
                    throw ("'pack' error.");
                } else {
                    valStr = String.fromCharCode(Math.floor(val / 0x1000000)) +
                        String.fromCharCode(Math.floor((val % 0x1000000) / 0x10000)) +
                        String.fromCharCode(Math.floor((val % 0x10000) / 0x100)) +
                        String.fromCharCode(val % 0x100);
                    if (littleEndian) {
                        valStr = valStr.split("").reverse().join("");
                    }
                }
            } else {
                throw ("'pack' error.");
            }

            packed += valStr;
            p += 1;
        }

        return packed;
    }

    function unpack(mark, str) {
        if (typeof (str) != "string") {
            throw ("'unpack' error. Got invalid type argument.");
        }
        var l = 0;
        for (var markPointer = 1; markPointer < mark.length; markPointer++) {
            if (mark[markPointer].toLowerCase() == "b") {
                l += 1;
            } else if (mark[markPointer].toLowerCase() == "h") {
                l += 2;
            } else if (mark[markPointer].toLowerCase() == "l") {
                l += 4;
            } else {
                throw ("'unpack' error. Got invalid mark.");
            }
        }

        if (l != str.length) {
            throw ("'unpack' error. Mismatch between symbol and string length. " + l + ":" + str.length);
        }

        var littleEndian;
        if (mark[0] == "<") {
            littleEndian = true;
        } else if (mark[0] == ">") {
            littleEndian = false;
        } else {
            throw ("'unpack' error.");
        }
        var unpacked = [];
        var strPointer = 0;
        var p = 1;
        var val = null;
        var c = null;
        var length = null;
        var sliced = "";

        while (c = mark[p]) {
            if (c.toLowerCase() == "b") {
                length = 1;
                sliced = str.slice(strPointer, strPointer + length);
                val = sliced.charCodeAt(0);
                if ((c == "b") && (val >= 0x80)) {
                    val -= 0x100;
                }
            } else if (c == "H") {
                length = 2;
                sliced = str.slice(strPointer, strPointer + length);
                if (littleEndian) {
                    sliced = sliced.split("").reverse().join("");
                }
                val = sliced.charCodeAt(0) * 0x100 +
                    sliced.charCodeAt(1);
            } else if (c.toLowerCase() == "l") {
                length = 4;
                sliced = str.slice(strPointer, strPointer + length);
                if (littleEndian) {
                    sliced = sliced.split("").reverse().join("");
                }
                val = sliced.charCodeAt(0) * 0x1000000 +
                    sliced.charCodeAt(1) * 0x10000 +
                    sliced.charCodeAt(2) * 0x100 +
                    sliced.charCodeAt(3);
                if ((c == "l") && (val >= 0x80000000)) {
                    val -= 0x100000000;
                }
            } else {
                throw ("'unpack' error. " + c);
            }

            unpacked.push(val);
            strPointer += length;
            p += 1;
        }

        return unpacked;
    }

    function nStr(ch, num) {
        var str = "";
        for (var i = 0; i < num; i++) {
            str += ch;
        }
        return str;
    }

    function splitIntoSegments(data) {
        if (data.slice(0, 2) != "\xff\xd8") {
            throw ("Given data isn't JPEG.");
        }

        var head = 2;
        var segments = ["\xff\xd8"];
        while (true) {
            if (data.slice(head, head + 2) == "\xff\xda") {
                segments.push(data.slice(head));
                break;
            } else {
                var length = unpack(">H", data.slice(head + 2, head + 4))[0];
                var endPoint = head + length + 2;
                segments.push(data.slice(head, endPoint));
                head = endPoint;
            }

            if (head >= data.length) {
                throw ("Wrong JPEG data.");
            }
        }
        return segments;
    }


    function getApp1(segments) {
        var seg;
        for (var i = 0; i < segments.length; i++) {
            seg = segments[i];
            if (seg.slice(0, 2) == "\xff\xe1") {
                return seg;
            }
        }
        return null;
    }


    function mergeSegments(segments, exif) {
        if ((segments[1].slice(0, 2) == "\xff\xe0") &&
            (segments[2].slice(0, 2) == "\xff\xe1")) {
            if (exif) {
                segments[2] = exif;
                segments = ["\xff\xd8", exif].concat(segments.slice(2));
            } else if (exif == null) {
                segments = segments.slice(0, 2).concat(segments.slice(3));
            } else {
                segments = segments.slice(0).concat(segments.slice(2));
            }
        } else if (segments[1].slice(0, 2) == "\xff\xe0") {
            if (exif) {
                segments[1] = exif;
            }
        } else if (segments[1].slice(0, 2) == "\xff\xe1") {
            if (exif) {
                segments[1] = exif;
            } else if (exif == null) {
                segments = segments.slice(0).concat(segments.slice(2));
            }
        } else {
            if (exif) {
                segments = [segments[0], exif].concat(segments.slice(1));
            }
        }

        return segments.join("");
    }


    function toHex(str) {
        var hexStr = "";
        for (var i = 0; i < str.length; i++) {
            var h = str.charCodeAt(i);
            var hex = ((h < 10) ? "0" : "") + h.toString(16);
            hexStr += hex + " ";
        }
        return hexStr;
    }


    var TYPES = {
        "Byte": 1,
        "Ascii": 2,
        "Short": 3,
        "Long": 4,
        "Rational": 5,
        "Undefined": 7,
        "SLong": 9,
        "SRational": 10
    };


    var TAGS = {
        'Image': {
            11: {
                'name': 'ProcessingSoftware',
                'type': 'Ascii'
            },
            254: {
                'name': 'NewSubfileType',
                'type': 'Long'
            },
            255: {
                'name': 'SubfileType',
                'type': 'Short'
            },
            256: {
                'name': 'ImageWidth',
                'type': 'Long'
            },
            257: {
                'name': 'ImageLength',
                'type': 'Long'
            },
            258: {
                'name': 'BitsPerSample',
                'type': 'Short'
            },
            259: {
                'name': 'Compression',
                'type': 'Short'
            },
            262: {
                'name': 'PhotometricInterpretation',
                'type': 'Short'
            },
            263: {
                'name': 'Threshholding',
                'type': 'Short'
            },
            264: {
                'name': 'CellWidth',
                'type': 'Short'
            },
            265: {
                'name': 'CellLength',
                'type': 'Short'
            },
            266: {
                'name': 'FillOrder',
                'type': 'Short'
            },
            269: {
                'name': 'DocumentName',
                'type': 'Ascii'
            },
            270: {
                'name': 'ImageDescription',
                'type': 'Ascii'
            },
            271: {
                'name': 'Make',
                'type': 'Ascii'
            },
            272: {
                'name': 'Model',
                'type': 'Ascii'
            },
            273: {
                'name': 'StripOffsets',
                'type': 'Long'
            },
            274: {
                'name': 'Orientation',
                'type': 'Short'
            },
            277: {
                'name': 'SamplesPerPixel',
                'type': 'Short'
            },
            278: {
                'name': 'RowsPerStrip',
                'type': 'Long'
            },
            279: {
                'name': 'StripByteCounts',
                'type': 'Long'
            },
            282: {
                'name': 'XResolution',
                'type': 'Rational'
            },
            283: {
                'name': 'YResolution',
                'type': 'Rational'
            },
            284: {
                'name': 'PlanarConfiguration',
                'type': 'Short'
            },
            290: {
                'name': 'GrayResponseUnit',
                'type': 'Short'
            },
            291: {
                'name': 'GrayResponseCurve',
                'type': 'Short'
            },
            292: {
                'name': 'T4Options',
                'type': 'Long'
            },
            293: {
                'name': 'T6Options',
                'type': 'Long'
            },
            296: {
                'name': 'ResolutionUnit',
                'type': 'Short'
            },
            301: {
                'name': 'TransferFunction',
                'type': 'Short'
            },
            305: {
                'name': 'Software',
                'type': 'Ascii'
            },
            306: {
                'name': 'DateTime',
                'type': 'Ascii'
            },
            315: {
                'name': 'Artist',
                'type': 'Ascii'
            },
            316: {
                'name': 'HostComputer',
                'type': 'Ascii'
            },
            317: {
                'name': 'Predictor',
                'type': 'Short'
            },
            318: {
                'name': 'WhitePoint',
                'type': 'Rational'
            },
            319: {
                'name': 'PrimaryChromaticities',
                'type': 'Rational'
            },
            320: {
                'name': 'ColorMap',
                'type': 'Short'
            },
            321: {
                'name': 'HalftoneHints',
                'type': 'Short'
            },
            322: {
                'name': 'TileWidth',
                'type': 'Short'
            },
            323: {
                'name': 'TileLength',
                'type': 'Short'
            },
            324: {
                'name': 'TileOffsets',
                'type': 'Short'
            },
            325: {
                'name': 'TileByteCounts',
                'type': 'Short'
            },
            330: {
                'name': 'SubIFDs',
                'type': 'Long'
            },
            332: {
                'name': 'InkSet',
                'type': 'Short'
            },
            333: {
                'name': 'InkNames',
                'type': 'Ascii'
            },
            334: {
                'name': 'NumberOfInks',
                'type': 'Short'
            },
            336: {
                'name': 'DotRange',
                'type': 'Byte'
            },
            337: {
                'name': 'TargetPrinter',
                'type': 'Ascii'
            },
            338: {
                'name': 'ExtraSamples',
                'type': 'Short'
            },
            339: {
                'name': 'SampleFormat',
                'type': 'Short'
            },
            340: {
                'name': 'SMinSampleValue',
                'type': 'Short'
            },
            341: {
                'name': 'SMaxSampleValue',
                'type': 'Short'
            },
            342: {
                'name': 'TransferRange',
                'type': 'Short'
            },
            343: {
                'name': 'ClipPath',
                'type': 'Byte'
            },
            344: {
                'name': 'XClipPathUnits',
                'type': 'Long'
            },
            345: {
                'name': 'YClipPathUnits',
                'type': 'Long'
            },
            346: {
                'name': 'Indexed',
                'type': 'Short'
            },
            347: {
                'name': 'JPEGTables',
                'type': 'Undefined'
            },
            351: {
                'name': 'OPIProxy',
                'type': 'Short'
            },
            512: {
                'name': 'JPEGProc',
                'type': 'Long'
            },
            513: {
                'name': 'JPEGInterchangeFormat',
                'type': 'Long'
            },
            514: {
                'name': 'JPEGInterchangeFormatLength',
                'type': 'Long'
            },
            515: {
                'name': 'JPEGRestartInterval',
                'type': 'Short'
            },
            517: {
                'name': 'JPEGLosslessPredictors',
                'type': 'Short'
            },
            518: {
                'name': 'JPEGPointTransforms',
                'type': 'Short'
            },
            519: {
                'name': 'JPEGQTables',
                'type': 'Long'
            },
            520: {
                'name': 'JPEGDCTables',
                'type': 'Long'
            },
            521: {
                'name': 'JPEGACTables',
                'type': 'Long'
            },
            529: {
                'name': 'YCbCrCoefficients',
                'type': 'Rational'
            },
            530: {
                'name': 'YCbCrSubSampling',
                'type': 'Short'
            },
            531: {
                'name': 'YCbCrPositioning',
                'type': 'Short'
            },
            532: {
                'name': 'ReferenceBlackWhite',
                'type': 'Rational'
            },
            700: {
                'name': 'XMLPacket',
                'type': 'Byte'
            },
            18246: {
                'name': 'Rating',
                'type': 'Short'
            },
            18249: {
                'name': 'RatingPercent',
                'type': 'Short'
            },
            32781: {
                'name': 'ImageID',
                'type': 'Ascii'
            },
            33421: {
                'name': 'CFARepeatPatternDim',
                'type': 'Short'
            },
            33422: {
                'name': 'CFAPattern',
                'type': 'Byte'
            },
            33423: {
                'name': 'BatteryLevel',
                'type': 'Rational'
            },
            33432: {
                'name': 'Copyright',
                'type': 'Ascii'
            },
            33434: {
                'name': 'ExposureTime',
                'type': 'Rational'
            },
            34377: {
                'name': 'ImageResources',
                'type': 'Byte'
            },
            34665: {
                'name': 'ExifTag',
                'type': 'Long'
            },
            34675: {
                'name': 'InterColorProfile',
                'type': 'Undefined'
            },
            34853: {
                'name': 'GPSTag',
                'type': 'Long'
            },
            34857: {
                'name': 'Interlace',
                'type': 'Short'
            },
            34858: {
                'name': 'TimeZoneOffset',
                'type': 'Long'
            },
            34859: {
                'name': 'SelfTimerMode',
                'type': 'Short'
            },
            37387: {
                'name': 'FlashEnergy',
                'type': 'Rational'
            },
            37388: {
                'name': 'SpatialFrequencyResponse',
                'type': 'Undefined'
            },
            37389: {
                'name': 'Noise',
                'type': 'Undefined'
            },
            37390: {
                'name': 'FocalPlaneXResolution',
                'type': 'Rational'
            },
            37391: {
                'name': 'FocalPlaneYResolution',
                'type': 'Rational'
            },
            37392: {
                'name': 'FocalPlaneResolutionUnit',
                'type': 'Short'
            },
            37393: {
                'name': 'ImageNumber',
                'type': 'Long'
            },
            37394: {
                'name': 'SecurityClassification',
                'type': 'Ascii'
            },
            37395: {
                'name': 'ImageHistory',
                'type': 'Ascii'
            },
            37397: {
                'name': 'ExposureIndex',
                'type': 'Rational'
            },
            37398: {
                'name': 'TIFFEPStandardID',
                'type': 'Byte'
            },
            37399: {
                'name': 'SensingMethod',
                'type': 'Short'
            },
            40091: {
                'name': 'XPTitle',
                'type': 'Byte'
            },
            40092: {
                'name': 'XPComment',
                'type': 'Byte'
            },
            40093: {
                'name': 'XPAuthor',
                'type': 'Byte'
            },
            40094: {
                'name': 'XPKeywords',
                'type': 'Byte'
            },
            40095: {
                'name': 'XPSubject',
                'type': 'Byte'
            },
            50341: {
                'name': 'PrintImageMatching',
                'type': 'Undefined'
            },
            50706: {
                'name': 'DNGVersion',
                'type': 'Byte'
            },
            50707: {
                'name': 'DNGBackwardVersion',
                'type': 'Byte'
            },
            50708: {
                'name': 'UniqueCameraModel',
                'type': 'Ascii'
            },
            50709: {
                'name': 'LocalizedCameraModel',
                'type': 'Byte'
            },
            50710: {
                'name': 'CFAPlaneColor',
                'type': 'Byte'
            },
            50711: {
                'name': 'CFALayout',
                'type': 'Short'
            },
            50712: {
                'name': 'LinearizationTable',
                'type': 'Short'
            },
            50713: {
                'name': 'BlackLevelRepeatDim',
                'type': 'Short'
            },
            50714: {
                'name': 'BlackLevel',
                'type': 'Rational'
            },
            50715: {
                'name': 'BlackLevelDeltaH',
                'type': 'SRational'
            },
            50716: {
                'name': 'BlackLevelDeltaV',
                'type': 'SRational'
            },
            50717: {
                'name': 'WhiteLevel',
                'type': 'Short'
            },
            50718: {
                'name': 'DefaultScale',
                'type': 'Rational'
            },
            50719: {
                'name': 'DefaultCropOrigin',
                'type': 'Short'
            },
            50720: {
                'name': 'DefaultCropSize',
                'type': 'Short'
            },
            50721: {
                'name': 'ColorMatrix1',
                'type': 'SRational'
            },
            50722: {
                'name': 'ColorMatrix2',
                'type': 'SRational'
            },
            50723: {
                'name': 'CameraCalibration1',
                'type': 'SRational'
            },
            50724: {
                'name': 'CameraCalibration2',
                'type': 'SRational'
            },
            50725: {
                'name': 'ReductionMatrix1',
                'type': 'SRational'
            },
            50726: {
                'name': 'ReductionMatrix2',
                'type': 'SRational'
            },
            50727: {
                'name': 'AnalogBalance',
                'type': 'Rational'
            },
            50728: {
                'name': 'AsShotNeutral',
                'type': 'Short'
            },
            50729: {
                'name': 'AsShotWhiteXY',
                'type': 'Rational'
            },
            50730: {
                'name': 'BaselineExposure',
                'type': 'SRational'
            },
            50731: {
                'name': 'BaselineNoise',
                'type': 'Rational'
            },
            50732: {
                'name': 'BaselineSharpness',
                'type': 'Rational'
            },
            50733: {
                'name': 'BayerGreenSplit',
                'type': 'Long'
            },
            50734: {
                'name': 'LinearResponseLimit',
                'type': 'Rational'
            },
            50735: {
                'name': 'CameraSerialNumber',
                'type': 'Ascii'
            },
            50736: {
                'name': 'LensInfo',
                'type': 'Rational'
            },
            50737: {
                'name': 'ChromaBlurRadius',
                'type': 'Rational'
            },
            50738: {
                'name': 'AntiAliasStrength',
                'type': 'Rational'
            },
            50739: {
                'name': 'ShadowScale',
                'type': 'SRational'
            },
            50740: {
                'name': 'DNGPrivateData',
                'type': 'Byte'
            },
            50741: {
                'name': 'MakerNoteSafety',
                'type': 'Short'
            },
            50778: {
                'name': 'CalibrationIlluminant1',
                'type': 'Short'
            },
            50779: {
                'name': 'CalibrationIlluminant2',
                'type': 'Short'
            },
            50780: {
                'name': 'BestQualityScale',
                'type': 'Rational'
            },
            50781: {
                'name': 'RawDataUniqueID',
                'type': 'Byte'
            },
            50827: {
                'name': 'OriginalRawFileName',
                'type': 'Byte'
            },
            50828: {
                'name': 'OriginalRawFileData',
                'type': 'Undefined'
            },
            50829: {
                'name': 'ActiveArea',
                'type': 'Short'
            },
            50830: {
                'name': 'MaskedAreas',
                'type': 'Short'
            },
            50831: {
                'name': 'AsShotICCProfile',
                'type': 'Undefined'
            },
            50832: {
                'name': 'AsShotPreProfileMatrix',
                'type': 'SRational'
            },
            50833: {
                'name': 'CurrentICCProfile',
                'type': 'Undefined'
            },
            50834: {
                'name': 'CurrentPreProfileMatrix',
                'type': 'SRational'
            },
            50879: {
                'name': 'ColorimetricReference',
                'type': 'Short'
            },
            50931: {
                'name': 'CameraCalibrationSignature',
                'type': 'Byte'
            },
            50932: {
                'name': 'ProfileCalibrationSignature',
                'type': 'Byte'
            },
            50934: {
                'name': 'AsShotProfileName',
                'type': 'Byte'
            },
            50935: {
                'name': 'NoiseReductionApplied',
                'type': 'Rational'
            },
            50936: {
                'name': 'ProfileName',
                'type': 'Byte'
            },
            50937: {
                'name': 'ProfileHueSatMapDims',
                'type': 'Long'
            },
            50938: {
                'name': 'ProfileHueSatMapData1',
                'type': 'Float'
            },
            50939: {
                'name': 'ProfileHueSatMapData2',
                'type': 'Float'
            },
            50940: {
                'name': 'ProfileToneCurve',
                'type': 'Float'
            },
            50941: {
                'name': 'ProfileEmbedPolicy',
                'type': 'Long'
            },
            50942: {
                'name': 'ProfileCopyright',
                'type': 'Byte'
            },
            50964: {
                'name': 'ForwardMatrix1',
                'type': 'SRational'
            },
            50965: {
                'name': 'ForwardMatrix2',
                'type': 'SRational'
            },
            50966: {
                'name': 'PreviewApplicationName',
                'type': 'Byte'
            },
            50967: {
                'name': 'PreviewApplicationVersion',
                'type': 'Byte'
            },
            50968: {
                'name': 'PreviewSettingsName',
                'type': 'Byte'
            },
            50969: {
                'name': 'PreviewSettingsDigest',
                'type': 'Byte'
            },
            50970: {
                'name': 'PreviewColorSpace',
                'type': 'Long'
            },
            50971: {
                'name': 'PreviewDateTime',
                'type': 'Ascii'
            },
            50972: {
                'name': 'RawImageDigest',
                'type': 'Undefined'
            },
            50973: {
                'name': 'OriginalRawFileDigest',
                'type': 'Undefined'
            },
            50974: {
                'name': 'SubTileBlockSize',
                'type': 'Long'
            },
            50975: {
                'name': 'RowInterleaveFactor',
                'type': 'Long'
            },
            50981: {
                'name': 'ProfileLookTableDims',
                'type': 'Long'
            },
            50982: {
                'name': 'ProfileLookTableData',
                'type': 'Float'
            },
            51008: {
                'name': 'OpcodeList1',
                'type': 'Undefined'
            },
            51009: {
                'name': 'OpcodeList2',
                'type': 'Undefined'
            },
            51022: {
                'name': 'OpcodeList3',
                'type': 'Undefined'
            }
        },
        'Exif': {
            33434: {
                'name': 'ExposureTime',
                'type': 'Rational'
            },
            33437: {
                'name': 'FNumber',
                'type': 'Rational'
            },
            34850: {
                'name': 'ExposureProgram',
                'type': 'Short'
            },
            34852: {
                'name': 'SpectralSensitivity',
                'type': 'Ascii'
            },
            34855: {
                'name': 'ISOSpeedRatings',
                'type': 'Short'
            },
            34856: {
                'name': 'OECF',
                'type': 'Undefined'
            },
            34864: {
                'name': 'SensitivityType',
                'type': 'Short'
            },
            34865: {
                'name': 'StandardOutputSensitivity',
                'type': 'Long'
            },
            34866: {
                'name': 'RecommendedExposureIndex',
                'type': 'Long'
            },
            34867: {
                'name': 'ISOSpeed',
                'type': 'Long'
            },
            34868: {
                'name': 'ISOSpeedLatitudeyyy',
                'type': 'Long'
            },
            34869: {
                'name': 'ISOSpeedLatitudezzz',
                'type': 'Long'
            },
            36864: {
                'name': 'ExifVersion',
                'type': 'Undefined'
            },
            36867: {
                'name': 'DateTimeOriginal',
                'type': 'Ascii'
            },
            36868: {
                'name': 'DateTimeDigitized',
                'type': 'Ascii'
            },
            37121: {
                'name': 'ComponentsConfiguration',
                'type': 'Undefined'
            },
            37122: {
                'name': 'CompressedBitsPerPixel',
                'type': 'Rational'
            },
            37377: {
                'name': 'ShutterSpeedValue',
                'type': 'SRational'
            },
            37378: {
                'name': 'ApertureValue',
                'type': 'Rational'
            },
            37379: {
                'name': 'BrightnessValue',
                'type': 'SRational'
            },
            37380: {
                'name': 'ExposureBiasValue',
                'type': 'SRational'
            },
            37381: {
                'name': 'MaxApertureValue',
                'type': 'Rational'
            },
            37382: {
                'name': 'SubjectDistance',
                'type': 'Rational'
            },
            37383: {
                'name': 'MeteringMode',
                'type': 'Short'
            },
            37384: {
                'name': 'LightSource',
                'type': 'Short'
            },
            37385: {
                'name': 'Flash',
                'type': 'Short'
            },
            37386: {
                'name': 'FocalLength',
                'type': 'Rational'
            },
            37396: {
                'name': 'SubjectArea',
                'type': 'Short'
            },
            37500: {
                'name': 'MakerNote',
                'type': 'Undefined'
            },
            37510: {
                'name': 'UserComment',
                'type': 'Ascii'
            },
            37520: {
                'name': 'SubSecTime',
                'type': 'Ascii'
            },
            37521: {
                'name': 'SubSecTimeOriginal',
                'type': 'Ascii'
            },
            37522: {
                'name': 'SubSecTimeDigitized',
                'type': 'Ascii'
            },
            40960: {
                'name': 'FlashpixVersion',
                'type': 'Undefined'
            },
            40961: {
                'name': 'ColorSpace',
                'type': 'Short'
            },
            40962: {
                'name': 'PixelXDimension',
                'type': 'Long'
            },
            40963: {
                'name': 'PixelYDimension',
                'type': 'Long'
            },
            40964: {
                'name': 'RelatedSoundFile',
                'type': 'Ascii'
            },
            40965: {
                'name': 'InteroperabilityTag',
                'type': 'Long'
            },
            41483: {
                'name': 'FlashEnergy',
                'type': 'Rational'
            },
            41484: {
                'name': 'SpatialFrequencyResponse',
                'type': 'Undefined'
            },
            41486: {
                'name': 'FocalPlaneXResolution',
                'type': 'Rational'
            },
            41487: {
                'name': 'FocalPlaneYResolution',
                'type': 'Rational'
            },
            41488: {
                'name': 'FocalPlaneResolutionUnit',
                'type': 'Short'
            },
            41492: {
                'name': 'SubjectLocation',
                'type': 'Short'
            },
            41493: {
                'name': 'ExposureIndex',
                'type': 'Rational'
            },
            41495: {
                'name': 'SensingMethod',
                'type': 'Short'
            },
            41728: {
                'name': 'FileSource',
                'type': 'Undefined'
            },
            41729: {
                'name': 'SceneType',
                'type': 'Undefined'
            },
            41730: {
                'name': 'CFAPattern',
                'type': 'Undefined'
            },
            41985: {
                'name': 'CustomRendered',
                'type': 'Short'
            },
            41986: {
                'name': 'ExposureMode',
                'type': 'Short'
            },
            41987: {
                'name': 'WhiteBalance',
                'type': 'Short'
            },
            41988: {
                'name': 'DigitalZoomRatio',
                'type': 'Rational'
            },
            41989: {
                'name': 'FocalLengthIn35mmFilm',
                'type': 'Short'
            },
            41990: {
                'name': 'SceneCaptureType',
                'type': 'Short'
            },
            41991: {
                'name': 'GainControl',
                'type': 'Short'
            },
            41992: {
                'name': 'Contrast',
                'type': 'Short'
            },
            41993: {
                'name': 'Saturation',
                'type': 'Short'
            },
            41994: {
                'name': 'Sharpness',
                'type': 'Short'
            },
            41995: {
                'name': 'DeviceSettingDescription',
                'type': 'Undefined'
            },
            41996: {
                'name': 'SubjectDistanceRange',
                'type': 'Short'
            },
            42016: {
                'name': 'ImageUniqueID',
                'type': 'Ascii'
            },
            42032: {
                'name': 'CameraOwnerName',
                'type': 'Ascii'
            },
            42033: {
                'name': 'BodySerialNumber',
                'type': 'Ascii'
            },
            42034: {
                'name': 'LensSpecification',
                'type': 'Rational'
            },
            42035: {
                'name': 'LensMake',
                'type': 'Ascii'
            },
            42036: {
                'name': 'LensModel',
                'type': 'Ascii'
            },
            42037: {
                'name': 'LensSerialNumber',
                'type': 'Ascii'
            },
            42240: {
                'name': 'Gamma',
                'type': 'Rational'
            }
        },
        'GPS': {
            0: {
                'name': 'GPSVersionID',
                'type': 'Byte'
            },
            1: {
                'name': 'GPSLatitudeRef',
                'type': 'Ascii'
            },
            2: {
                'name': 'GPSLatitude',
                'type': 'Rational'
            },
            3: {
                'name': 'GPSLongitudeRef',
                'type': 'Ascii'
            },
            4: {
                'name': 'GPSLongitude',
                'type': 'Rational'
            },
            5: {
                'name': 'GPSAltitudeRef',
                'type': 'Byte'
            },
            6: {
                'name': 'GPSAltitude',
                'type': 'Rational'
            },
            7: {
                'name': 'GPSTimeStamp',
                'type': 'Rational'
            },
            8: {
                'name': 'GPSSatellites',
                'type': 'Ascii'
            },
            9: {
                'name': 'GPSStatus',
                'type': 'Ascii'
            },
            10: {
                'name': 'GPSMeasureMode',
                'type': 'Ascii'
            },
            11: {
                'name': 'GPSDOP',
                'type': 'Rational'
            },
            12: {
                'name': 'GPSSpeedRef',
                'type': 'Ascii'
            },
            13: {
                'name': 'GPSSpeed',
                'type': 'Rational'
            },
            14: {
                'name': 'GPSTrackRef',
                'type': 'Ascii'
            },
            15: {
                'name': 'GPSTrack',
                'type': 'Rational'
            },
            16: {
                'name': 'GPSImgDirectionRef',
                'type': 'Ascii'
            },
            17: {
                'name': 'GPSImgDirection',
                'type': 'Rational'
            },
            18: {
                'name': 'GPSMapDatum',
                'type': 'Ascii'
            },
            19: {
                'name': 'GPSDestLatitudeRef',
                'type': 'Ascii'
            },
            20: {
                'name': 'GPSDestLatitude',
                'type': 'Rational'
            },
            21: {
                'name': 'GPSDestLongitudeRef',
                'type': 'Ascii'
            },
            22: {
                'name': 'GPSDestLongitude',
                'type': 'Rational'
            },
            23: {
                'name': 'GPSDestBearingRef',
                'type': 'Ascii'
            },
            24: {
                'name': 'GPSDestBearing',
                'type': 'Rational'
            },
            25: {
                'name': 'GPSDestDistanceRef',
                'type': 'Ascii'
            },
            26: {
                'name': 'GPSDestDistance',
                'type': 'Rational'
            },
            27: {
                'name': 'GPSProcessingMethod',
                'type': 'Undefined'
            },
            28: {
                'name': 'GPSAreaInformation',
                'type': 'Undefined'
            },
            29: {
                'name': 'GPSDateStamp',
                'type': 'Ascii'
            },
            30: {
                'name': 'GPSDifferential',
                'type': 'Short'
            },
            31: {
                'name': 'GPSHPositioningError',
                'type': 'Rational'
            }
        },
        'Interop': {
            1: {
                'name': 'InteroperabilityIndex',
                'type': 'Ascii'
            }
        },
    };
    TAGS["0th"] = TAGS["Image"];
    TAGS["1st"] = TAGS["Image"];
    that.TAGS = TAGS;

    
    that.ImageIFD = {
        ProcessingSoftware:11,
        NewSubfileType:254,
        SubfileType:255,
        ImageWidth:256,
        ImageLength:257,
        BitsPerSample:258,
        Compression:259,
        PhotometricInterpretation:262,
        Threshholding:263,
        CellWidth:264,
        CellLength:265,
        FillOrder:266,
        DocumentName:269,
        ImageDescription:270,
        Make:271,
        Model:272,
        StripOffsets:273,
        Orientation:274,
        SamplesPerPixel:277,
        RowsPerStrip:278,
        StripByteCounts:279,
        XResolution:282,
        YResolution:283,
        PlanarConfiguration:284,
        GrayResponseUnit:290,
        GrayResponseCurve:291,
        T4Options:292,
        T6Options:293,
        ResolutionUnit:296,
        TransferFunction:301,
        Software:305,
        DateTime:306,
        Artist:315,
        HostComputer:316,
        Predictor:317,
        WhitePoint:318,
        PrimaryChromaticities:319,
        ColorMap:320,
        HalftoneHints:321,
        TileWidth:322,
        TileLength:323,
        TileOffsets:324,
        TileByteCounts:325,
        SubIFDs:330,
        InkSet:332,
        InkNames:333,
        NumberOfInks:334,
        DotRange:336,
        TargetPrinter:337,
        ExtraSamples:338,
        SampleFormat:339,
        SMinSampleValue:340,
        SMaxSampleValue:341,
        TransferRange:342,
        ClipPath:343,
        XClipPathUnits:344,
        YClipPathUnits:345,
        Indexed:346,
        JPEGTables:347,
        OPIProxy:351,
        JPEGProc:512,
        JPEGInterchangeFormat:513,
        JPEGInterchangeFormatLength:514,
        JPEGRestartInterval:515,
        JPEGLosslessPredictors:517,
        JPEGPointTransforms:518,
        JPEGQTables:519,
        JPEGDCTables:520,
        JPEGACTables:521,
        YCbCrCoefficients:529,
        YCbCrSubSampling:530,
        YCbCrPositioning:531,
        ReferenceBlackWhite:532,
        XMLPacket:700,
        Rating:18246,
        RatingPercent:18249,
        ImageID:32781,
        CFARepeatPatternDim:33421,
        CFAPattern:33422,
        BatteryLevel:33423,
        Copyright:33432,
        ExposureTime:33434,
        ImageResources:34377,
        ExifTag:34665,
        InterColorProfile:34675,
        GPSTag:34853,
        Interlace:34857,
        TimeZoneOffset:34858,
        SelfTimerMode:34859,
        FlashEnergy:37387,
        SpatialFrequencyResponse:37388,
        Noise:37389,
        FocalPlaneXResolution:37390,
        FocalPlaneYResolution:37391,
        FocalPlaneResolutionUnit:37392,
        ImageNumber:37393,
        SecurityClassification:37394,
        ImageHistory:37395,
        ExposureIndex:37397,
        TIFFEPStandardID:37398,
        SensingMethod:37399,
        XPTitle:40091,
        XPComment:40092,
        XPAuthor:40093,
        XPKeywords:40094,
        XPSubject:40095,
        PrintImageMatching:50341,
        DNGVersion:50706,
        DNGBackwardVersion:50707,
        UniqueCameraModel:50708,
        LocalizedCameraModel:50709,
        CFAPlaneColor:50710,
        CFALayout:50711,
        LinearizationTable:50712,
        BlackLevelRepeatDim:50713,
        BlackLevel:50714,
        BlackLevelDeltaH:50715,
        BlackLevelDeltaV:50716,
        WhiteLevel:50717,
        DefaultScale:50718,
        DefaultCropOrigin:50719,
        DefaultCropSize:50720,
        ColorMatrix1:50721,
        ColorMatrix2:50722,
        CameraCalibration1:50723,
        CameraCalibration2:50724,
        ReductionMatrix1:50725,
        ReductionMatrix2:50726,
        AnalogBalance:50727,
        AsShotNeutral:50728,
        AsShotWhiteXY:50729,
        BaselineExposure:50730,
        BaselineNoise:50731,
        BaselineSharpness:50732,
        BayerGreenSplit:50733,
        LinearResponseLimit:50734,
        CameraSerialNumber:50735,
        LensInfo:50736,
        ChromaBlurRadius:50737,
        AntiAliasStrength:50738,
        ShadowScale:50739,
        DNGPrivateData:50740,
        MakerNoteSafety:50741,
        CalibrationIlluminant1:50778,
        CalibrationIlluminant2:50779,
        BestQualityScale:50780,
        RawDataUniqueID:50781,
        OriginalRawFileName:50827,
        OriginalRawFileData:50828,
        ActiveArea:50829,
        MaskedAreas:50830,
        AsShotICCProfile:50831,
        AsShotPreProfileMatrix:50832,
        CurrentICCProfile:50833,
        CurrentPreProfileMatrix:50834,
        ColorimetricReference:50879,
        CameraCalibrationSignature:50931,
        ProfileCalibrationSignature:50932,
        AsShotProfileName:50934,
        NoiseReductionApplied:50935,
        ProfileName:50936,
        ProfileHueSatMapDims:50937,
        ProfileHueSatMapData1:50938,
        ProfileHueSatMapData2:50939,
        ProfileToneCurve:50940,
        ProfileEmbedPolicy:50941,
        ProfileCopyright:50942,
        ForwardMatrix1:50964,
        ForwardMatrix2:50965,
        PreviewApplicationName:50966,
        PreviewApplicationVersion:50967,
        PreviewSettingsName:50968,
        PreviewSettingsDigest:50969,
        PreviewColorSpace:50970,
        PreviewDateTime:50971,
        RawImageDigest:50972,
        OriginalRawFileDigest:50973,
        SubTileBlockSize:50974,
        RowInterleaveFactor:50975,
        ProfileLookTableDims:50981,
        ProfileLookTableData:50982,
        OpcodeList1:51008,
        OpcodeList2:51009,
        OpcodeList3:51022,
        NoiseProfile:51041,
    };

    
    that.ExifIFD = {
        ExposureTime:33434,
        FNumber:33437,
        ExposureProgram:34850,
        SpectralSensitivity:34852,
        ISOSpeedRatings:34855,
        OECF:34856,
        SensitivityType:34864,
        StandardOutputSensitivity:34865,
        RecommendedExposureIndex:34866,
        ISOSpeed:34867,
        ISOSpeedLatitudeyyy:34868,
        ISOSpeedLatitudezzz:34869,
        ExifVersion:36864,
        DateTimeOriginal:36867,
        DateTimeDigitized:36868,
        ComponentsConfiguration:37121,
        CompressedBitsPerPixel:37122,
        ShutterSpeedValue:37377,
        ApertureValue:37378,
        BrightnessValue:37379,
        ExposureBiasValue:37380,
        MaxApertureValue:37381,
        SubjectDistance:37382,
        MeteringMode:37383,
        LightSource:37384,
        Flash:37385,
        FocalLength:37386,
        SubjectArea:37396,
        MakerNote:37500,
        UserComment:37510,
        SubSecTime:37520,
        SubSecTimeOriginal:37521,
        SubSecTimeDigitized:37522,
        FlashpixVersion:40960,
        ColorSpace:40961,
        PixelXDimension:40962,
        PixelYDimension:40963,
        RelatedSoundFile:40964,
        InteroperabilityTag:40965,
        FlashEnergy:41483,
        SpatialFrequencyResponse:41484,
        FocalPlaneXResolution:41486,
        FocalPlaneYResolution:41487,
        FocalPlaneResolutionUnit:41488,
        SubjectLocation:41492,
        ExposureIndex:41493,
        SensingMethod:41495,
        FileSource:41728,
        SceneType:41729,
        CFAPattern:41730,
        CustomRendered:41985,
        ExposureMode:41986,
        WhiteBalance:41987,
        DigitalZoomRatio:41988,
        FocalLengthIn35mmFilm:41989,
        SceneCaptureType:41990,
        GainControl:41991,
        Contrast:41992,
        Saturation:41993,
        Sharpness:41994,
        DeviceSettingDescription:41995,
        SubjectDistanceRange:41996,
        ImageUniqueID:42016,
        CameraOwnerName:42032,
        BodySerialNumber:42033,
        LensSpecification:42034,
        LensMake:42035,
        LensModel:42036,
        LensSerialNumber:42037,
        Gamma:42240,
    };


    that.GPSIFD = {
        GPSVersionID:0,
        GPSLatitudeRef:1,
        GPSLatitude:2,
        GPSLongitudeRef:3,
        GPSLongitude:4,
        GPSAltitudeRef:5,
        GPSAltitude:6,
        GPSTimeStamp:7,
        GPSSatellites:8,
        GPSStatus:9,
        GPSMeasureMode:10,
        GPSDOP:11,
        GPSSpeedRef:12,
        GPSSpeed:13,
        GPSTrackRef:14,
        GPSTrack:15,
        GPSImgDirectionRef:16,
        GPSImgDirection:17,
        GPSMapDatum:18,
        GPSDestLatitudeRef:19,
        GPSDestLatitude:20,
        GPSDestLongitudeRef:21,
        GPSDestLongitude:22,
        GPSDestBearingRef:23,
        GPSDestBearing:24,
        GPSDestDistanceRef:25,
        GPSDestDistance:26,
        GPSProcessingMethod:27,
        GPSAreaInformation:28,
        GPSDateStamp:29,
        GPSDifferential:30,
        GPSHPositioningError:31,
    };


    that.InteropIFD = {
        InteroperabilityIndex:1,
    };
    
    
    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = that;
        }
        exports.piexif = that;
    } else {
        window.piexif = that;
    }

})();
var ImagerJs = {
  /**
   * @namespace ImagerJs.plugins
   * @memberof ImagerJs
   */
  plugins: {},
  /**
   * @namespace ImagerJs.util
   * @memberof ImagerJs
   */
  util: {},

  /**
   * @namespace ImagerJs.translations
   * @memberof ImagerJs
   */
  translations: {}
};
(function ($, namespace) {
  var $body = null;
  var $overlay = $('<div class="modaljs-overlay hidden hidden-add-end noselect"></div>');
  var $wrapper = $('<div class="modaljs-wrapper hidden noselect">' +
    '<div class="modaljs-wrapper2 modaljs-modals-container noselect"></div>' +
    '</div>');

  $(document).ready(function () {
    $body = $('body');
    $body.append($overlay);
    $body.append($wrapper);
  });

  var Modal = function Modal() {
    var _this = this;
    var $modal = $('<div class="modaljs hidden noselect">' +
      '<header></header>' +
      '<div class="modaljs-template-container noselect"></div>' +
      '<footer>' +
      '</footer>');

    $wrapper.find('.modaljs-modals-container').append($modal);

    $wrapper.find('.modaljs').scroll(function () {
      $(window).trigger('resize');
    });

    this.$modal = $modal;
    this.classname = '';

    this.cancelHandler = null;

    $(window).resize(function () {
      _this.fixPosition();
    });

    $('body').on('imagerResize', function () {
      _this.fixPosition();
    });
  };

  Modal.prototype.setTitle = function (title) {
    this.$modal.find('header').html(title);
  };

  Modal.prototype.setTemplate = function (template) {
    this.$modal.find('.modaljs-template-container').append($(template));
  };

  Modal.prototype.fixPosition = function () {
    if ($wrapper.find('.modaljs').length < 1) {
      return;
    }

    var headerHeight = $wrapper.find('.modaljs > header')
      [0].getBoundingClientRect().height;
    var bodyHeight = $wrapper.find('.modaljs > .modaljs-template-container')
      [0].getBoundingClientRect().height;
    var footerHeight = $wrapper.find('.modaljs > footer')
      [0].getBoundingClientRect().height;

    var fullContentHeight = headerHeight + bodyHeight + footerHeight;

    if ($(window).height() <= fullContentHeight) {
      $wrapper.addClass('fullheight');
    } else {
      $wrapper.removeClass('fullheight');
    }
  };

  Modal.prototype.addCancelButton = function (buttonText, handler) {
    var _this = this;

    _this.cancelHandler = handler;

    var $button = $('<button></button>').text(buttonText);
    $button.on('click', function () {
      _this.hide();
      if (_this.cancelHandler) {
        _this.cancelHandler();
      }
    });

    _this.$modal.find('footer').append($button);

    _this._fixButtonsSize();
  };

  Modal.prototype.addClass = function (classname) {
    this.classname += ' ' + classname;
    this.$modal.addClass(classname);
  };

  Modal.prototype.addActionButton = function (buttonText, handler) {
    var _this = this;

    var $button = $('<button></button>')
      .addClass('modaljs-action-button')
      .text(buttonText);

    $button.on('click', function () {
      var handlerResponse = handler();
      if (handlerResponse === undefined && handlerResponse !== false) {
        _this.hide();
      }
    });

    _this.$modal.find('footer').append($button);

    _this._fixButtonsSize();
  };

  Modal.prototype._fixButtonsSize = function () {
    var $buttons = this.$modal.find('footer button');
    $buttons.css('width', (100 / $buttons.length) + '%');
  };

  Modal.prototype.show = function () {
    var _this = this;

    $overlay.addClass(this.classname);

    $overlay.removeClass('hidden-add-end');
    $overlay.removeClass('hidden');
    $overlay.css('height', $('body').height());
    $overlay.on('click', function () {
      _this.hide();
      if (_this.cancelHandler) {
        _this.cancelHandler();
      }
    });

    $wrapper.removeClass('hidden');

    this.$modal.removeClass('hidden');

    var bodyWidthBefore = $body.width();
    this.overflowBefore = $body.css('overflow');

    $body.css('overflow', 'hidden');
    this.widthDiff = $body.width() - bodyWidthBefore;
    this.paddingBefore = $body.css('padding-right');

    $body.css('padding-right', this.widthDiff + 'px');
  };

  Modal.prototype.hide = function () {
    $overlay.removeClass(this.classname);

    $overlay.addClass('hidden');
    setTimeout(function () {
      $overlay.addClass('hidden-add-end');
    }, 400);

    $overlay.off('click');

    $wrapper.addClass('hidden');
    this.$modal.addClass('hidden');

    $body.css('overflow', this.overflowBefore);
    $body.css('padding-right', this.paddingBefore);
  };

  Modal.prototype.remove = function () {
    this.$modal.remove();
    this.cancelHandler = false;
  };

  namespace.Modal = Modal;
})(jQuery, window);
(function ($, namespace, util) {
  var Toolbar = function ToolbarPlugin(options) {
    var _this = this;

    options = options || {};

    var defaultOptions = {
      tooltipEnabled: true,
      tooltipCss: null
    };

    _this.options = $.extend(defaultOptions, options);

    _this.$toolbar = $('<ul class="toolbar"></ul>')
      .attr('contenteditable', 'false')
      .addClass('noselect')
      .addClass('toolbar-topLeft');

    _this.tooltips = [];
    _this.buttonsGroups = {};
  };

  Toolbar.prototype.getElement = function () {
    return this.$toolbar;
  };

  Toolbar.prototype.addButton = function (className, iconClass,
                                          tooltipText, clickHandler) {
    var $button = this.createButton(className, iconClass, clickHandler);

    this.$toolbar.append($button);
    this.createTooltip($button.find('a'), className, tooltipText, 'bottom');

    return $button;
  };

  Toolbar.prototype.createButton = function (className, iconClass,
                                             clickHandler) {
    var _this = this;

    var $button = $(
      '<li data-sizeable="toolbar-button" ' +
      'data-cssrules="width,height">' +
      '<a href="#" ' +
      'data-sizeable="toolbar-button" ' +
      'data-cssrules="line-height,font-size:($v / 2.5)" tabindex="-1">' +
      '<i class="fa ' + iconClass + '"></i>' +
      '</a>' +
      '</li>').addClass(className);

    util.bindClick($button.find('a'), 'imager-button', function () {
      return clickHandler(_this);
    });

    return $button;
  };

  /**
   * Add a button to this toolbar. Button will be appended to group.
   * Group is a one button which will show dropdown with its buttons on click.
   *
   * @param className {String}    Add specified class to button's <li> element.
   * @param iconClass {String}    Add specified class to button's <i> element.
   * @param tooltipText {String} Tooltip text that will be shown on mouse over.
   * @param group {Object} Group object with group class name and tooltip text
   * @param group.name {String} Group unique id
   * @param group.tooltip {String} A tooltip text that will be shown on mouse over
   * @param clickHandler {Function} function that will be invoked
   *                                when user clicks on this button.
   */
  Toolbar.prototype.addButtonToGroup = function (className, iconClass,
                                                 tooltipText, group,
                                                 clickHandler) {
    var $groupContainer = null;
    if (!this.buttonsGroups[group.name]) {
      $groupContainer = $(
        '<li class="btn-group" ' +
        'data-editable-canvas-sizeable="toolbar-button" ' +
        'data-editable-canvas-cssrules="width,height">' +
        '<a href="#" ' +
        'data-editable-canvas-sizeable="toolbar-button" ' +
        'data-editable-canvas-cssrules="line-height,font-size:($v / 2.5)" ' +
        'tabindex="-1">' +
        '<i class="fa ' + iconClass + '"></i>' +
        '</a>' +
        '<ul class="group-items-container hidden">' +
        '</ul>' +
        '</li>');

      this.buttonsGroups[group.name] = $groupContainer;
      this.$toolbar.append($groupContainer);

      util.bindClick($groupContainer.children('a'),
        'drawer-toolbar-group-button', function () {
          $groupContainer.find('ul.group-items-container').toggleClass('hidden');
        }
      );

      this.createTooltip(
        $groupContainer.children('a'), group.name, group.tooltip, 'bottom'
      );
    }

    $groupContainer = this.buttonsGroups[group.name];

    var $button = this.createButton(className, iconClass,
      function (clickEvent) {
        $groupContainer.find('ul.group-items-container').toggleClass('hidden');

        clickHandler(clickEvent);

        $groupContainer.attr('class', $button.attr('class'))
          .addClass('btn-group');
        $groupContainer.children('a')
          .attr('class', $button.children('a').attr('class'));
        $groupContainer.children('a')
          .html($button.children('a').html());
      });

    $groupContainer.find('.group-items-container').append($button);

    this.createTooltip($button.find('a'),
      className + ' group-item', tooltipText, 'right');

    return $button;
  };


  Toolbar.prototype.createTooltip = function ($button, className, title,
                                              align) {
    if (!this.options.tooltipEnabled) {
      return;
    }

    var $tooltip = $('<span>')
      .addClass('toolbar-tooltip tooltip-' + className)
      .html(title);

    $tooltip.appendTo('body');
    this.tooltips.push($tooltip);

    if (this.options.tooltipCss) {
      $tooltip.css(this.options.tooltipCss);
    }

    $button.on('mouseenter', function () {
      if ($(this).hasClass('disabled')) return;

      var btnPos = $button.offset();
      var btnHeight = $button.innerHeight();
      var btnWidth = $button.innerWidth();

      $tooltip.addClass('active');

      var top = 0;
      var left = 0;

      switch (align) {
        case 'right':
          top = btnPos.top + (($button.height() - $tooltip.outerHeight()) / 2);
          left = btnPos.left + btnWidth;
          break;
        default:
          top = (btnPos.top + btnHeight);
          left = (btnPos.left + btnWidth / 2 - $tooltip.innerWidth() / 2);
          break;
      }
      $tooltip.css({
        top: top + 'px',
        left: left + 'px'
      });
    });

    $button.on('mouseout', function () {
      $tooltip.removeClass('active');
    });
  };

  Toolbar.prototype.setActiveButton = function (buttonClassName) {
    this.$toolbar.find('li.' + buttonClassName).children('a').addClass('active');
  };

  Toolbar.prototype.clearActiveButton = function () {
    this.$toolbar.find('li').children('a').removeClass('active');
  };

  Toolbar.prototype.remove = function () {
    if (this.$toolbar) {
      this.$toolbar.remove();
      this.$toolbar = null;
    }

    if (this.tooltips) {
      this.tooltips.map(function ($tooltip) {
        $tooltip.remove();
        $tooltip = null;
        return null;
      });
      this.tooltips = null;
    }
  };

  namespace.Toolbar = Toolbar;

})(jQuery, window, ImagerJs.util);
(function ($, translations, namespace) {
  /**
   *
   * Provides a select that could be used to change imager quality.
   *
   * @param imagerInstance
   * @constructor
   *
   */
  var QualitySelector = function (imagerInstance, options) {
    var _this = this;

    _this.defaultOptions = {
      sizes: [
        {label: 'Original', scale: 1, quality: 1.0, percentage: 100},
        {label: 'Large', scale: 0.5, quality: 0.5, percentage: 50},
        {label: 'Medium', scale: 0.2, quality: 0.2, percentage: 20},
        {label: 'Small', scale: 0.05, quality: 0.05, percentage: 5}
      ],
      allowCustomSetting: true
    };

    options = options ? options : {};
    _this.options = $.extend(true, _this.defaultOptions, options);
        
    if (_this.options.allowCustomSetting) {
        _this.options.sizes.push(
            { label: 'Custom' }
        );  
    }
    
    _this.imager = imagerInstance;

    _this.$qualitySelector = $(
      '<div class="imager-quality-wrapper">' +
      '<form>' +
      '<div class="imager-quality-container form-group">' +
      '<label for="imager-quality">' + translations.t('Quality') + '</label>' +
      '<select id="imager-quality" class="form-control">' +
      '</select>' +
      '</div>' +
      '</form>' +
      '<form class="form-inline custom-quality hidden">' +
      '<div class="form-group">' +
      '<label for="imager-quality-custom" ' +
      'class="imager-quality-custom">' +
      translations.t('Custom quality percent') +
      '</label>' +
      '<div class="input-group">' +
      '<input id="imager-quality-custom" type="number" min="1" max="100"' +
      'class="form-control imager-quality-custom" value="100"/>' +
      '<div class="input-group-addon">%</div>' +
      '<div class="size-in-kb"></div>' +
      '</div>' +
      '</div>' +
      '</form>' +
      '</div>'
    )
      .addClass('hidden');

    _this.$qualitySelector.find('input.imager-quality-custom')
      .change(function () {
        var customQuality = parseInt($(this).val());

        _this.imager.quality = customQuality / 100;
        _this.imager.targetScale = customQuality / 100;
        _this.imager.render();

        var size = _this.imager.getDataSize() / 1024;
        var sizeText = Math.round(size) + ' ' + translations.t('KB');
        _this.$qualitySelector.find('.size-in-kb').text(sizeText);
      });

    _this.$qualitySelector.find('select').on('change', function () {
      var value = parseInt($(this).val());

      var selectedQuality = _this.options.sizes[value];

      if (selectedQuality === null || selectedQuality === undefined) {
        selectedQuality = _this.options.sizes[0];
      }

      if (selectedQuality.label == 'Custom') {
        _this.$qualitySelector.find('form.custom-quality').removeClass('hidden');
        _this.$qualitySelector.addClass('custom-quality-visible');
        _this.imager.$imageElement.addClass('custom-quality-visible');
      } else {
        _this.$qualitySelector.find('form.custom-quality').addClass('hidden');
        _this.$qualitySelector.removeClass('custom-quality-visible');
        _this.imager.$imageElement.removeClass('custom-quality-visible');
      }

      $('body').trigger('imagerResize');

      _this.imager.adjustEditContainer();

      _this.imager.quality = selectedQuality.quality ? selectedQuality.quality : 0.5;
      _this.imager.targetScale = selectedQuality.scale ? selectedQuality.scale : 0.5;
      _this.imager.render();
    });
  };

  QualitySelector.prototype.getElement = function () {
    return this.$qualitySelector;
  };

  QualitySelector.prototype.update = function () {
    var selected = this.$qualitySelector.find('option:selected').val();
    this.$qualitySelector.find('option').remove();

    for (var i = 0; i < this.options.sizes.length; i++) {
      var s = this.options.sizes[i];

      var label = translations.t(s.label);

      if (s.percentage !== undefined) {
        this.imager.quality = s.quality;
        this.imager.targetScale = s.scale;
        this.imager.render();

        var size = this.imager.getDataSize() / 1024;

        label += ' - ' + Math.round(size) + ' ' + translations.t('KB') +
          ' (' + s.percentage + '%)';
      }

      var $swatch = $(
        '<option value="' + i + '">' +
        label +
        '</option>');

      this.$qualitySelector.find('select').append($swatch);
    }

    if (selected) {
      this.$qualitySelector.find('select').val(selected);
    } else {
      this.$qualitySelector.find('select').val(0);
    }

    this.$qualitySelector.find('select').trigger('change');
  };

  QualitySelector.prototype.val = function () {
    this.$qualitySelector.find('select')
      .val.apply(this.$qualitySelector, arguments);
  };

  QualitySelector.prototype.show = function () {
    this.$qualitySelector.removeClass('hidden');
  };

  QualitySelector.prototype.hide = function () {
    this.$qualitySelector.addClass('hidden');
  };

  namespace.ImagerQualitySelector = QualitySelector;

})(jQuery, ImagerJs.translations, window);
(function ($, namespace) {
  namespace.set = function(strings){
    strings = strings ? strings : {};
    namespace.translations = $.extend(true, namespace.translations, strings);
  };

  namespace.translations = {
    'Incorret file type': 'Incorret file type',
    'Insert': 'Insert',
    'Cancel': 'Cancel',
    'Add image': 'Add image',
    'Quality': 'Quality',

    'Rotate': 'Rotate',
    'Crop': 'Crop',

    'Original': 'Original',
    'KB': 'KB',
    'Large': 'Large',
    'Medium': 'Medium',
    'Small': 'Small',
    'Custom quality percent': 'Custom quality percent',
    'Custom': 'Custom',

    'Image properties': 'Image properties',
    'Size:': 'Size:',
    'width in px': 'width in px',
    'height in px': 'height in px',
    'Left': 'Left',
    'Right': 'Right',
    'Center': 'Center',
    'Inline': 'Inline',
    'Floating': 'Floating',
    'Transparent background': 'Transparent background',
    'Apply': 'Apply',
    'Reject': 'Reject',
    'Delete image': 'Delete image',
    'Move image': 'Move image',
    'Are you sure want to delete this image?': 'Are you sure want to delete this image?',
    'Or drop files here': 'Or drop files here',
    'No file selected.': 'No file selected.',
    'Please wait...': 'Please wait...',
    'Save': 'Save',
    'Undo': 'Undo',
    'Rotate manually': 'Rotate manually',
    'Rotate 90 left': 'Rotate 90° left',
    'Rotate 90 right': 'Rotate 90° left',

    'Image is too big and could cause very poor performance.': 'Image is too big and could cause very poor performance.'
  };

  namespace.t = function (textString) {
    if (namespace.translations[textString]) {
      return namespace.translations[textString];
    } else {
      console.warn('String not found in texts:' + textString);
      return textString;
    }
  };
})(jQuery, ImagerJs.translations);
(function ($, namespace, pluginsCatalog, util, translations) {
  var imagerInstances = [];

  var PLATFORM = {
    ios: 'ios',
    android: 'android',
    windowsMobile: 'windowsMobile',
    genericMobile: 'genericMobile'
  };

  /**
   *
   * @param $imageElement <img> Element to attach to
   *
   * @param options {Object} Options
   * @param options.editModeCss {Object} Css object for image edit box.
   * <br>
   * For example, to make background transparent like in photoshop, try this:
   * <br>
   * <code><pre>
   *   {
   *    "background": "url(assets/transparent.png)"
   *   }
   * </pre></code>
   * <br>
   *
   * Edit box border also could be set here like this:
   * <br>
   * <code><pre>
   *   {
   *    "border": "1px dashed green"
   *   }
   * </pre></code>
   *
   * @param {Function} options.detectTouch
   * A custom function that will be used by ImagerJs to determine whether it is
   * running on touch device or not.
   * <br><br>
   *
   * This function must return <code>true</code> or <code>false</code>.
   * <br><br>
   *
   * <code>true</code> means that touch device is detected and ImagerJs should
   * adjust its toolbar size, add touch events etc.
   * <br><br>
   *
   * Note that if this function is not specified, ImagerJs will use its own
   * detection mechanism.
   * <br><br>
   *
   * To disable any detection simply set this parameter to such function:
   * <code><pre>function() { return false; }</pre></code>
   *
   * @param {String} options.waitingCursor
   * Cursor that will be used for long-running operations.
   * <br><br>
   *
   * Example:
   * <code><pre>url(path/to/cursor.cur), default</pre></code>
   *
   * Note the word 'default' at the end: that is the name of cursor that will
   * be used when url is unavailable.
   *
   * More information about css cursor property could be found here:
   * {@link https://developer.mozilla.org/en-US/docs/Web/CSS/cursor}
   *
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/CSS/cursor}
   *
   * @param {Number} options.imageSizeForPerformanceWarning Size in bytes.
   *
   * If image is bigger that provided number, an alert will be shown
   * saying that such big images could cause serious performance issues.
   *
   * @param {Number} options.maxImageWidth Maximum image width in pixels.
   *
   * If image is width is larger than this value it will be scaled down with .
   * This option allows avoiding bad performance with large images.
   *
   * @param {Number} options.maxImageHeight Maximum image height in pixels.
   *
   * If image is width is larger than this value it will be scaled down with .
   * This option allows avoiding bad performance with large images.
   *
   * @param {Number} options.canvasSizeLimit : Maximum canvas size, in pixels.
   * Canvas is scaled down, if it gets more then this value.
   * Default is 32 megapixels for desktop, and 5 megapixels for mobile.
   * Warning: if canvasSizeLimit is set larger, then browser restrictions, big images can fail to load.
   *
   * If image is height is larger than this value it will be scaled down.
   * This option allows avoiding bad performance with large images.
   *
   * @constructor
   * @memberof ImagerJs
   */
  var Imager = function ($imageElement, options) {
    var _this = this;

    _this.$imageElement = $($imageElement);

    _this.defaultOptions = {
      saveData: undefined,
      loadData: undefined,
      quality: 1,
      targetScale: 1,
      plugins: [],
      format: undefined,
      toolbarButtonSize: 32,
      toolbarButtonSizeTouch: 50,
      editModeCss: {
        border: '1px solid white'
      },
      pluginsConfig: {},
      detectTouch: null,
      waitingCursor: 'wait',
      imageSizeForPerformanceWarning: 1000000, // 1 MB
      maxImageWidth: 2048,
      maxImageHeight: 2048
    };

    options = options ? options : {};
    _this.options = $.extend(true, _this.defaultOptions, options);

    _this.debug = false;

    /**
     * Whether to show temporary canvases that are used to render some image states
     * before final rendering to the canvas that user sees.
     *
     * Use this for debugging with breakpoints.
     *
     * @type {boolean}
     */
    _this.showTemporaryCanvas = false;

    _this.targetScale = _this.options.targetScale;
    _this.quality = _this.options.quality;

    _this._eventEmitter = $({});
    _this._isInEditMode = false;

    /**
     * Array containing operations history with images.
     * @type {Array}
     */
    _this.history = [];

    imagerInstances.push(_this);

    /**
     * Will be set only for jpeg images.
     * Stores exif info of the original image.
     * @type {null|Object}
     */
    _this.originalExif = null;

    // detect Platform
    this.detectPlatform();

    // if no canvasSizeLimit set in options, set it
    if (!this.options.canvasSizeLimit) {
      if ([PLATFORM.ios, PLATFORM.android, PLATFORM.windowsMobile].indexOf(_this.platform) !== -1) {
        // 5 MP on devices
        this.canvasSizeLimit = 5 * 1024 * 1024;
      } else {
        // 32 MP on desktop
        this.canvasSizeLimit = 32 * 1024 * 1024;
      }
    }

    _this.$originalImage = _this.$imageElement.clone();

    _this.handleImageElementSrcChanged();


    /**
     * Imager will instantiate all plugins and store them here.
     * @type {Object|null}
     */
    _this.pluginsInstances = null;
    _this.instantiatePlugins(pluginsCatalog);

    $('body').on('imagerResize', function () {
      _this.adjustEditContainer();
    });

    $(window).on('resize', function () {
      _this.adjustEditContainer();
    });
  };

  Imager.prototype.on = function (event, handler) {
    this._eventEmitter.on(event, handler);
  };

  Imager.prototype.off = function (event) {
    this._eventEmitter.off(event);
  };

  Imager.prototype.trigger = function (event, args) {
    this._eventEmitter.trigger(event, args);

    var eventMethodName = 'on' +
      event.substr(0, 1).toUpperCase() + event.substr(1);

    for (var i = 0; i < this.pluginsInstances.length; i++) {
      var p = this.pluginsInstances[i];

      if (p[eventMethodName] !== undefined) {
        p[eventMethodName](args);
      }
    }
  };

  Imager.prototype.log = function () {
    if (this.debug) {
      var args = Array.prototype.slice.call(arguments);
      console.log.apply(console, args);
    }
  };

  Imager.prototype.invokePluginsMethod = function (methodName) {
    var results = [];

    var args = Array.prototype.slice.call(arguments);

    args = args.slice(1); // remove method name

    for (var i = 0; i < this.pluginsInstances.length; i++) {
      var p = this.pluginsInstances[i];

      if (p[methodName] !== undefined) {
        var result = p[methodName].apply(p, args);

        if (result) {
          results.push({
            name: p.__name,
            instance: p,
            result: result
          });
        }
      }
    }

    return results;
  };

  /**
   * Sorts plugins based in their `weight`
   */
  Imager.prototype.pluginSort = function (p1, p2) {
    if (p1.weight === undefined || p2.weight === null) {
      p1.weight = Infinity;
    }

    if (p2.weight === undefined || p2.weight === null) {
      p2.weight = Infinity;
    }

    if (p1.weight < p2.weight) {
      return -1;
    }

    if (p1.weight > p2.weight) {
      return 1;
    }

    return 0;
  };

  /*
   * Iterates through plugins array from config and instantiates them.
   */
  Imager.prototype.instantiatePlugins = function (plugins) {
    this.pluginsInstances = [];

    for (var pluginName in plugins) {
      if (this.options.plugins.indexOf(pluginName) > -1) {
        if (plugins.hasOwnProperty(pluginName)) {
          var pluginInstance = new plugins[pluginName](
            this, this.options.pluginsConfig[pluginName]
          );

          pluginInstance.__name = pluginName;
          this.pluginsInstances.push(pluginInstance);
        }
      }
    }

    this.pluginsInstances.sort(this.pluginSort);
  };

  /**
   * Returns plugin instance by its name
   *
   * @param pluginName
   * @returns {*}
   */
  Imager.prototype.getPluginInstance = function (pluginName) {
    for (var i = 0; i < this.pluginsInstances.length; i++) {
      var p = this.pluginsInstances[i];

      if (p.__name == pluginName) {
        return p;
      }
    }

    return undefined;
  };

  /**
   * This function should be called when image's `src` attribute is changed from outside of the imager.
   * It checks `src` attribute, detects image format, prepares image (rotates it according to EXIF for example)
   * and triggers `ready` event on imager.
   */
  Imager.prototype.handleImageElementSrcChanged = function () {
    var _this = this;

    if (!_this.options.format) {
      _this.options.format = _this.getImageFormat(_this.$imageElement.attr('src'));
    }

    if (_this.$imageElement.attr('data-imager-id')) {
      // if image already has an id, then it has been edited using Imager.
      // and should contain original image data somewhere
      _this.id = _this.$imageElement.attr('data-imager-id');

      if (_this.$imageElement.attr('src').length < 1) {
        throw new Error('Imager was initialized on an empty image. Please check image\'s `src` attribute. ' +
          'It should not be empty.');
      }
    } else {
      _this.id = util.uuid();
      _this.$imageElement.attr('data-imager-id', _this.id);
    }

    //region prepare image
    // Image needs some preparations before it could be used by imager.
    // Fix EXIF rotation data, make image smaller on slow devices etc.
    _this.fixImageSizeAndRotation(_this.$imageElement)
      .then(function(imageData) {
        _this.$imageElement.attr('src', imageData);
        _this.$imageElement.attr('imager-attached', true);
      })
      .fail(function(err) {
        console.error(err);
      });

    _this.$imageElement.on('load.imagerInit', function () {
      _this.$imageElement.off('load.imagerInit');
      _this.trigger('ready');
    });
  };

  /**
   * Prepares image after first loading. It checks image EXIF data and fixes it's rotation,
   * scales image down if it's too large.
   *
   * @param {HTMLImageElement} $image
   * @returns {jQuery.Deferred.<string>} Image data base64 string
   */
  Imager.prototype.fixImageSizeAndRotation = function ($image) {
    // first of all we need to avoid HUGE problems that safari has when displaying
    // images that have exif orientation other than 1.
    // So first step is to remove any exif data from image.
    // Since we can do that only on base64 string  - here we check whether our image is a base64
    // encoded string. If yes - we can start right away. If not, we need to download it as data first using
    // XMLHttpRequest.

    var _this = this;
    var deferred = $.Deferred();

    var imageSrc = $image.attr('src');

    if(imageSrc.length < 1) {
      return $.when('');
    }
    else if (imageSrc.indexOf('data:image') === 0) {
      return this._fixBase64ImageSizeAndRotation(imageSrc);
    } else if (imageSrc.indexOf('http') === 0) {
      var xhr = new XMLHttpRequest();
      xhr.responseType = 'blob';
      xhr.onload = function () {
        var reader = new FileReader();
        reader.onloadend = function () {
          _this._fixBase64ImageSizeAndRotation(reader.result)
            .then(function (imageData) {
              deferred.resolve(imageData);
            });
        };
        reader.onerror = function (err) {
          deferred.reject(err);
        };
        reader.readAsDataURL(xhr.response);
      };
      xhr.open('GET', imageSrc);
      xhr.send();
      return deferred.promise();
    } else {
      console.error('Unsupported image `src`!');
      return $.when('');
    }
  };

  /**
   * Base64 image data could contain EXIF data which causes
   * @param imageBase64Data
   * @returns {*}
   * @private
   */
  Imager.prototype._fixBase64ImageSizeAndRotation = function (imageBase64Data) {
    var _this = this;
    var deferred = $.Deferred();

    var imageFormat = _this.getImageFormat(_this.$imageElement.attr('src'));

    if(imageFormat === 'jpeg' || imageFormat === 'jpg') {
      // first of all - get rid of any rotation in exif
      this.originalExif = piexif.load(imageBase64Data);
      var originalOrientation = this.originalExif['0th'][piexif.ImageIFD.Orientation];
      this.originalExif['0th'][piexif.ImageIFD.Orientation] = 1;
      imageBase64Data = piexif.insert(piexif.dump(this.originalExif), imageBase64Data);
    }

    var image = document.createElement('img');
    image.onload = imageLoaded;
    image.src = imageBase64Data;

    function imageLoaded() {
      var canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      var ctx = canvas.getContext('2d');

      if(imageFormat === 'jpeg' || imageFormat === 'jpg') {
        switch (originalOrientation) {
          case 2:
            // horizontal flip
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            break;
          case 3:
            // 180° rotate left
            ctx.translate(canvas.width, canvas.height);
            ctx.rotate(Math.PI);
            break;
          case 4:
            // vertical flip
            ctx.translate(0, canvas.height);
            ctx.scale(1, -1);
            break;
          case 5:
            // vertical flip + 90 rotate right
            canvas.width = image.naturalHeight;
            canvas.height = image.naturalWidth;

            ctx.rotate(0.5 * Math.PI);
            ctx.scale(1, -1);
            break;
          case 6:
            // 90° rotate right and flip canvas width and height
            canvas.width = image.naturalHeight;
            canvas.height = image.naturalWidth;

            ctx.translate(canvas.width, 0);
            ctx.rotate(0.5 * Math.PI);
            break;
          case 7:
            // horizontal flip + 90 rotate right

            canvas.width = image.naturalHeight;
            canvas.height = image.naturalWidth;

            ctx.rotate(0.5 * Math.PI);
            ctx.translate(canvas.width, -canvas.height);
            ctx.scale(-1, 1);
            break;
          case 8:
            // 90° rotate left
            canvas.width = image.naturalHeight;
            canvas.height = image.naturalWidth;

            ctx.rotate(-0.5 * Math.PI);
            ctx.translate(-canvas.width, 0);
            break;
        }
      }

      ctx.drawImage(image, 0, 0);

      if (canvas.width > _this.options.maxImageWidth) {
        var newWidth = _this.options.maxImageWidth;

        var scalePercent = _this.options.maxImageWidth * 100 / canvas.width;

        var newHeight = scalePercent * canvas.height / 100;

        _this.log('Image is bigger than we could handle, resizing to', newWidth, newHeight);

        util.resizeImage(canvas,
          canvas.width, canvas.height, newWidth, newHeight);
      }

      deferred.resolve(canvas.toDataURL(_this.options.format));
    }

    return deferred.promise();
  };

  Imager.prototype.startSelector = function () {
    var _this = this;

    this.$selectorContainer = $(
      '<div class="imager-selector-container" tabindex="1"></div>'
    );

    var onImagerReady = function () {
      _this.off('ready', onImagerReady);

      _this.startEditing();
      _this.$selectorContainer.remove();
      _this.$selectorContainer = null;
    };

    var onImageLoad = function () {
      _this.$imageElement.off('load', onImageLoad);

      _this.handleImageElementSrcChanged();
      _this.on('ready', onImagerReady);
    };

    var fileSelector = new util.FileSelector('image/*');
    fileSelector.onFileSelected(function (file) {
      util.setWaiting(_this.$selectorContainer, translations.t('Please wait...'));

      setTimeout(function () {
        _this.$imageElement.attr('src', file.data);
        _this.$imageElement.css('height', 'auto');
        _this.$imageElement.css('min-height', 'inherit');
        _this.$imageElement.css('min-width', 'inherit');

        _this.$imageElement.on('load', onImageLoad);
      }, 200);
    });

    this.$selectorContainer.append(fileSelector.getElement());

    $('body').append(this.$selectorContainer);

    var imageOffset = this.$imageElement.offset();

    this.$selectorContainer.css({
      left: imageOffset.left,
      top: imageOffset.top,
      width: this.$imageElement.width(),
      height: this.$imageElement.height()
    });
  };

  Imager.prototype.startEditing = function () {
    this.log('startEditing()');

    this.hideOriginalImage();

    if (!this.$imageElement[0].complete) {
      throw new Error('Trying to start editing image that was not yet loaded. ' +
        'Please add `ready` event listener to imager.');
    }

    this.originalPreviewWidth = this.$imageElement.width();
    this.originalPreviewHeight = this.$imageElement.height();

    this.$editContainer = $(
      '<div class="imager-edit-container" tabindex="1"></div>'
    );

    if (this.options.editModeCss) {
      this.$editContainer.css(this.options.editModeCss);
    }

    $('body').append(this.$editContainer);

    this._createEditCanvas();

    this.adjustEditContainer();

    this.trigger('editStart');

    this.render();

    this._isInEditMode = true;

    this.$editContainer.focus();

    var sizeInBytes = this.getDataSize();
    if (sizeInBytes > this.options.imageSizeForPerformanceWarning) {
      util.setOverlayMessage(
        this.$editContainer,
        'Image is too big and could cause very poor performance.',
        'default',
        'Ok',
        function () {
          util.removeOverlayMessage(this.$editContainer);
        }.bind(this));
    }

    this._adjustElementsSize('toolbar-button',
      this.touchDevice ?
        this.options.toolbarButtonSizeTouch :
        this.options.toolbarButtonSize
    );

    // clean up the history
    if (this.history.length === 0) {
      this.commitChanges('Original');
    }

    this.trigger('historyChange');
  };

  Imager.prototype.stopEditing = function () {
    if (!this._isInEditMode) {
      return;
    }

    this.showOriginalImage();

    this.render();

    var pluginsDataRaw = this.invokePluginsMethod('serialize');
    var pluginsData = {};
    $(pluginsDataRaw).each(function (i, d) {
      pluginsData[d.name] = d.result;
    });

    var imageData = null;

    try {
      imageData = this.canvas.toDataURL('image/' + this.options.format, this.quality);
    } catch (err) {
      if (err.name && err.name === 'SecurityError') {
        console.error('Failed to get image data from canvas because of security error.' +
          'Usually this happens when image drawed on canvas is located on separate domain without' +
          'proper access-control headers.');
      } else {
        console.error(err);
      }
    }

    if (!imageData) {
      console.error('Failed to get image data from canvas.');
    }

    // save current changes to image
    this.$imageElement.attr('src', imageData);

    this.$editContainer.remove();
    this.$editContainer = null;

    this.canvas = null;
    this.tempCanvas = null;

    this.trigger('editStop', {imageData: imageData, pluginsData: pluginsData});

    this._isInEditMode = false;
  };

  /**
   * Change the container's z-index property.
   *
   * @param zIndexValue
   */
  Imager.prototype.setZindex = function (zIndexValue) {
    if (this.$editContainer) {
      this.$editContainer.css('z-index', zIndexValue);
    }
  };

  /**
   * Stores current image to history, then renders current canvas into image.
   *
   * @param operationMessage
   */
  Imager.prototype.commitChanges = function (operationMessage, callback) {
    var _this = this;

    var originalQuality = this.quality;
    var originalTargetScale = this.targetScale;

    this.quality = 1;
    this.targetScale = 1;
    this.adjustCanvasSize();
    this.render();

    // save current canvas image to image element
    var imageData = this.canvas.toDataURL('image/' + this.options.format, 100);

    // set image loading handlers
    this.$imageElement.on('load', imageLoadHandler);
    this.$imageElement.on('error', onImageLoadError);

    // load image
    this.$imageElement.attr('src', imageData);

    function imageLoadHandler() {
      _this.$imageElement.off('load', imageLoadHandler);

      _this.quality = originalQuality;
      _this.targetScale = originalTargetScale;
      _this.adjustCanvasSize();

      _this.history.push({
        message: operationMessage,
        image: imageData,
        width: _this.$imageElement.width(),
        height: _this.$imageElement.height()
      });

      _this.originalPreviewWidth = _this.$imageElement.width();
      _this.originalPreviewHeight = _this.$imageElement.height();

      _this.render();
      _this.trigger('historyChange');

      if (callback && (callback instanceof Function)) {
        callback();
      }
    }

    function onImageLoadError(event) {
      console.warn('commitChanges() : image failed to load :', event);
      console.trace();
    }
  };

  Imager.prototype.isInEditMode = function () {
    return this._isInEditMode;
  };

  /**
   * Creates canvas for showing temporary edited image.
   * Created temporary canvas for drawing temporary data by plugins etc.
   *
   * Those canvases could be accessed as this.canvas and this.tempCanvas.
   *
   * @private
   */
  Imager.prototype._createEditCanvas = function () {
    var imageWidth = this.$imageElement.width();
    var imageHeight = this.$imageElement.height();

    var imageNaturalWidth = this.$imageElement[0].naturalWidth;
    var imageNaturalHeight = this.$imageElement[0].naturalHeight;

    var $canvas = $('<canvas class="imager-edit-canvas"/>');
    $canvas.css({
      width: imageWidth,
      height: imageHeight
    });

    this.canvas = $canvas[0];

    this.adjustCanvasSize();

    this.$editContainer.append($canvas);

    this.tempCanvas = document.createElement('canvas');
    this.tempCanvas.width = imageNaturalWidth;
    this.tempCanvas.height = imageNaturalHeight;

    if (this.showTemporaryCanvas) {
      $('body').append(this.tempCanvas);
      $(this.tempCanvas).css({
        position: 'absolute',
        left: '50px',
        top: '50px',
        width: imageWidth
      });
    }
  };

  /**
   * Renders image on temporary canvas and then invokes plugin methods
   * that shoul modify image.
   *
   * @param [ctx] Context on which to draw image.
   */
  Imager.prototype.render = function (ctx) {
    ctx = ctx !== undefined ? ctx : this.canvas.getContext('2d');

    var realWidth = this.$imageElement[0].naturalWidth;
    var realHeight = this.$imageElement[0].naturalHeight;

    if (realWidth === 0 || realHeight === 0) {
      console.warn('Trying to render canvas with zero width or height');
      console.trace();
      return;
    }

    // reset canvas size to image natural size
    ctx.canvas.width = realWidth * this.targetScale;
    ctx.canvas.height = realHeight * this.targetScale;

    this.tempCanvas.width = realWidth;
    this.tempCanvas.height = realHeight;

    var destWidth = ctx.canvas.width;
    var destHeight = ctx.canvas.height;

    var viewPort = {
      sourceLeft: 0,
      sourceTop: 0,
      sourceWidth: realWidth,
      sourceHeight: realHeight,
      destLeft: 0,
      destTop: 0,
      destWidth: destWidth,
      destHeight: destHeight,
      paddingWidth: 0,
      paddingHeight: 0
    };

    this.drawImage(this.$imageElement, ctx, viewPort);

    this.invokePluginsMethod('render', ctx);
  };

  Imager.prototype.clearCanvas = function (ctx) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    if (this.options.format == 'jpeg') {
      ctx.fillStyle = "#FFFFFF"; // jpeg does not support transparency
                                 // so without this line all non painted areas will be black.
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
  };

  Imager.prototype.drawImage = function ($img, ctx, viewPort) {
    if (ctx.canvas.width === 0 || ctx.canvas.height === 0) {
      console.warn('Imager.drawImage() : Trying to render canvas with either width or height equal to 0');
      return;
    }

    this._drawWithScaling($img, ctx, this.tempCanvas.getContext('2d'),
      viewPort.sourceLeft, viewPort.sourceTop,
      viewPort.sourceWidth, viewPort.sourceHeight,

      viewPort.destLeft, viewPort.destTop,
      viewPort.destWidth, viewPort.destHeight,

      viewPort.paddingWidth, viewPort.paddingHeight
    );
  };

  /**
   * Draws image on canvas with specified dimensions.
   * Drawing is performed in few steps to make image smooth.
   *
   * More information about interpolation here:
   * http://stackoverflow.com/questions/17861447/html5-canvas-drawimage-how-to-apply-antialiasing
   *
   * @param {HTMLImageElement} $img Image to draw
   * @param ctx           Canvas context to draw on
   * @param tempCtx       Temporary canvas context to draw on interpolation steps
   * @param sourceLeft    Source image x coordinate
   * @param sourceTop     Source image y coordinate
   * @param sourceWidth   Source image width
   * @param sourceHeight  Source image height
   * @param destLeft      Destination image x coordinate
   * @param destTop       Destination image y coordinate
   * @param destWidth     Destination image width
   * @param destHeight    Destination image height
   * @param paddingWidth  Width padding that will be applied to target image
   * @param paddingHeight Height padding that will be applied to target image
   * @private
   */
  Imager.prototype._drawWithScaling = function ($img, ctx, tempCtx,
                                                sourceLeft, sourceTop,
                                                sourceWidth, sourceHeight,
                                                destLeft, destTop,
                                                destWidth, destHeight,
                                                paddingWidth, paddingHeight) {

    paddingWidth = paddingWidth !== undefined ? paddingWidth : 0;
    paddingHeight = paddingHeight !== undefined ? paddingHeight : 0;

    sourceLeft = sourceLeft !== undefined ? sourceLeft : 0;
    sourceTop = sourceTop !== undefined ? sourceTop : 0;

    var paddingWidthHalf = paddingWidth / 2;
    var paddingHeightHalf = paddingHeight / 2;

    var tempCanvas = tempCtx.canvas;

    tempCtx.clearRect(0, 0, sourceWidth, sourceHeight);

    var img = $img[0];

    var steps = 3;

    var step = 0.5;

    var currentStepWidth = sourceWidth;
    var currentStepHeight = sourceHeight;

    var currentStepSourceLeft = sourceLeft;
    var currentStepSourceTop = sourceTop;

    tempCtx.drawImage(img,
      currentStepSourceLeft, currentStepSourceTop,
      sourceWidth, sourceHeight,
      0, 0, currentStepWidth, currentStepHeight);

    for (var s = 0; s < steps; s++) {
      if (currentStepWidth <= destWidth * 2 ||
        currentStepHeight <= destHeight * 2) {
        break;
      }

      var prevStepWidth = currentStepWidth;
      var prevStepHeight = currentStepHeight;

      currentStepWidth *= step;
      currentStepHeight *= step;

      currentStepSourceLeft *= step;
      currentStepSourceTop *= step;

      var stepTempCanvas = document.createElement('canvas');
      stepTempCanvas.width = tempCtx.canvas.width;
      stepTempCanvas.height = tempCtx.canvas.height;

      var stepTempCtx = stepTempCanvas.getContext('2d');
      stepTempCtx.clearRect(0, 0, stepTempCanvas.width, stepTempCanvas.height);

      stepTempCtx.drawImage(tempCanvas,
        currentStepSourceLeft, currentStepSourceTop, prevStepWidth, prevStepHeight,
        0, 0, currentStepWidth, currentStepHeight);

      tempCtx.clearRect(0, 0, tempCtx.canvas.width, tempCtx.canvas.height);

      tempCtx.drawImage(stepTempCanvas,
        0, 0, currentStepWidth, currentStepHeight,
        0, 0, currentStepWidth, currentStepHeight
      );
    }

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.drawImage(tempCanvas,
      0, 0, currentStepWidth, currentStepHeight,
      destLeft + paddingWidthHalf, destTop + paddingHeightHalf,
      destWidth - paddingWidth, destHeight - paddingHeight
    );
  };

  /**
   * Sets preview area dimensions.
   * Note that this affects only the size of image that user sees.
   * Internal image size is not affected.
   *
   * @param {number} width
   * @param {number} height
   */
  Imager.prototype.setPreviewSize = function (width, height) {
    this.$imageElement.css({
      width: width,
      height: height
    });

    $(this.canvas).css({
      width: width,
      height: height
    });

    $('body').trigger('imagerResize');
    this.log('resize trigger');

    this.originalPreviewWidth = this.$imageElement.width();
    this.originalPreviewHeight = this.$imageElement.height();
  };

  Imager.prototype.getPreviewSize = function () {
    return {
      width: this.$imageElement.width(),
      height: this.$imageElement.height()
    };
  };

  Imager.prototype.getImageRealSize = function () {
    return {
      width: this.$imageElement[0].naturalWidth,
      height: this.$imageElement[0].naturalHeight
    };
  };

  Imager.prototype.getCanvasSize = function () {
    return {
      width: this.canvas.width,
      height: this.canvas.height
    };
  };

  Imager.prototype.convertScale = function (value, sourceMax, targetMax) {
    var valueInPercents = value * 100 / sourceMax;

    return valueInPercents * targetMax / 100;
  };

  Imager.prototype.hideOriginalImage = function () {
    this.$imageElement.css('opacity', 0);
  };

  Imager.prototype.showOriginalImage = function () {
    this.$imageElement.css('opacity', 1);
  };

  /**
   * Takes image's real size (naturalWidth & naturalHeight)
   * and adjust canvas size to match that
   * but with respect to aspect ratio of preview viewport size.
   */
  Imager.prototype.adjustCanvasSize = function () {
    var imageRealSize = this.getImageRealSize();
    var previewSize = this.getPreviewSize();

    var newCanvasWidth = 0;
    var newCanvasHeight = 0;

    var aspectRatio = 0;

    if (previewSize.width > previewSize.height) {
      newCanvasWidth = imageRealSize.width;

      aspectRatio = previewSize.height * 100 / previewSize.width;
      newCanvasHeight = aspectRatio * newCanvasWidth / 100;
    }
    else {
      newCanvasHeight = imageRealSize.height;

      aspectRatio = previewSize.width * 100 / previewSize.height;
      newCanvasWidth = aspectRatio * newCanvasHeight / 100;
    }

    this.canvas.width = newCanvasWidth * this.targetScale;
    this.canvas.height = newCanvasHeight * this.targetScale;

    // if canvas size limit is set - check canvas size
    this.canvasSizeLimit = 1 * 1024 * 1024;
    if (this.canvasSizeLimit) {
      if (this.canvas.width * this.canvas.height > this.canvasSizeLimit) {
        console.warn('adjustCanvasSize(): canvas size is too big : ', this.canvas.width, this.canvas.height);
        var ratio = 0.95 * this.canvasSizeLimit / (this.canvas.width * this.canvas.height);

        this.canvas.width = this.canvas.width * ratio;
        this.canvas.height = this.canvas.height * ratio;
        console.warn('adjustCanvasSize(): canvas was reduced to : ', this.canvas.width, this.canvas.height);
      }
    }

  };

  /**
   * Positions $editContained with absolute coordinates
   * to be on top of $imageElement.
   */
  Imager.prototype.adjustEditContainer = function () {
    var _this = this;

    var imageOffset = _this.$imageElement.offset();

    if (_this.$editContainer) {
      _this.$editContainer.css({
        left: imageOffset.left,
        top: imageOffset.top,
        width: _this.$imageElement.width(),
        height: _this.$imageElement.height()
      });
    }

    if (_this.$selectorContainer) {
      _this.$selectorContainer.css({
        left: imageOffset.left,
        top: imageOffset.top,
        width: this.$imageElement.width(),
        height: this.$imageElement.attr('src') ? this.$imageElement.height() : 'auto'
      });
    }
  };

  Imager.prototype.restoreOriginal = function () {
    this.$imageElement.replaceWith(this.$originalImage);
  };

  Imager.prototype.historyUndo = function () {
    if (this.history.length < 2) {
      return;
    }

    var _this = this;

    var lastEntry = this.history[this.history.length - 2];

    this.$imageElement.on('load', imageLoadHandler);
    this.$imageElement.attr('src', lastEntry.image);

    this.$imageElement.width(lastEntry.width);
    this.$imageElement.height(lastEntry.height);

    function imageLoadHandler() {
      _this.$imageElement.off('load', imageLoadHandler);

      _this.originalPreviewWidth = _this.$imageElement.width();
      _this.originalPreviewHeight = _this.$imageElement.height();

      _this.setPreviewSize(lastEntry.width, lastEntry.height);

      _this.render();
      _this.history.splice(_this.history.length - 1, 1);

      _this.trigger('historyChange');
    }
  };

  Imager.prototype.remove = function (removeImage) {
    this.trigger('remove');

    this.$imageElement.removeAttr('imager-attached');
    this.stopEditing();
    this.showOriginalImage();
    var index = imagerInstances.indexOf(this);
    imagerInstances.splice(index, 1);

    this.$originalImage = null;
    this.pluginsInstances = null;

    if (removeImage) {
      this.$imageElement.remove();
    }
  };

  /**
   * Returns current image data in bytes.
   *
   * @returns {number} Bytes number
   */
  Imager.prototype.getDataSize = function () {
    var head = 'data:' + 'image/' + this.options.format + ';base64,';
    var data = this.canvas.toDataURL('image/' + this.options.format, this.quality);

    var size = Math.round((data.length - head.length) * 3 / 4);

    return size;
  };

  /**
   * Tries to find Imager instance associated with provided img element.
   *
   * @param $img {HTMLImageElement|jQuery}
   * @returns {Imager|undefined}
   */
  Imager.getImagerFor = function ($img) {
    for (var i = 0; i < imagerInstances.length; i++) {
      var imager = imagerInstances[i];

      if (imager.id == $($img).attr('data-imager-id')) {
        return imager;
      }
    }

    return undefined;
  };

  Imager.isImagerAttached = function ($elem) {
    return $($elem).attr('imager-attached') !== undefined;
  };

  /**
   * @param {boolean} waiting Waiting status. TRUE for adding 'waiting' text,
   * false to remove.
   */
  Imager.prototype.setWaiting = function (waiting) {
    if (waiting) {
      if (this.$editContainer) {
        util.setWaiting(
          this.$editContainer, translations.t('Please wait...'),
          this.options.waitingCursor
        );
      }
    } else {
      util.stopWaiting(this.$editContainer);
    }
  };

  /**
   * Detects image format for either base64 encoded string or http:// url.
   * @param {string} imageSrc
   */
  Imager.prototype.getImageFormat = function (imageSrc) {
    if (!imageSrc) {
      return;
    }

    var extension;

    if (imageSrc.indexOf('http') === 0) {
      extension = imageSrc.split('.').pop();

      if (extension == 'jpeg') {
        extension = 'jpeg';
      } else if (extension == 'jpg') {
        extension = 'jpeg';
      } else if (extension == 'png') {
        extension = 'png';
      }
    } else if (imageSrc.indexOf('data:image') === 0) {
      if (imageSrc[11] == 'j') {
        extension = 'jpeg';
      } else if (imageSrc[11] == 'p') {
        extension = 'png';
      }
    }

    return extension;
  };

  /**
   * This method allows dynamical size adjustment of elements.
   * Elements which needs to be resized should have two attributes:
   *
   * data-sizeable="someNamespace",
   * where someNamespace is unique id for the group of elements tht will be
   * resized together.
   *
   * data-cssrules=width,height,font-size:($v / 2.5)
   * which provides a list of css rules on which a new size will be applied.
   * If resulting size needs to be modififed in some way, the one could
   * specify a function like in font-size.
   *
   * @private
   */
  Imager.prototype._adjustElementsSize = function (namespace, newSize) {
    var elementsToResize =
      $('[data-sizeable=' + namespace + ']');

    for (var i = 0; i < elementsToResize.length; i++) {
      var elem = elementsToResize[i];
      var attributesToChange = $(elem)
        .attr('data-cssrules')
        .split(',');

      for (var a = 0; a < attributesToChange.length; a++) {
        var attrName = attributesToChange[a];
        var attrVal = newSize;

        if (attrName[0] == '-') {
          attrName = attrName.substr(1);
          attrVal = '-' + newSize;
        }

        var matches = attrName.match(/:\((.+)\)/);
        if (matches) {
          attrName = attrName.replace(matches[0], '');
          var expression = matches[1];
          expression = expression.replace('$v', attrVal);
          var result = new Function("return " + expression)();
          attrVal = result;
        }

        $(elem).css(attrName, attrVal + 'px');
      }
    }
  };

  /**
   * Crude detection of device and platform.
   * Sets this.platform and this.touchDevice.
   * @todo this is BAD. Use more precise methods or some lib
   */
  Imager.prototype.detectPlatform = function () {
    // crude check of platform
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      this.platform = PLATFORM.ios;
    } else if (/Android|BlackBerry/i.test(navigator.userAgent)) {
      this.platform = PLATFORM.android;
    } else if (/IEMobile/i.test(navigator.userAgent)) {
      this.platform = PLATFORM.windowsMobile;
    }

    // check if options.detectTouch is function
    if (this.options.detectTouch && (this.options.detectTouch.constructor.name !== 'Function')) {
      console.error('detectTouch should be a function which will be ' +
        'called when Imager needs to determine whether it is working ' +
        'on touch device');
      this.options.detectTouch = null;
    }

    // crude check of touch
    if (this.options.detectTouch) {
      this.touchDevice = this.options.detectTouch(this);
    } else {
      this.touchDevice = /(iPhone|iPod|iPad|BlackBerry|Android)/i.test(navigator.userAgent);
    }

    // one more touch check
    var _this = this;
    $('body').on('touchstart.DrawerTouchCheck', function () {
      _this.touchDevice = true;
      $('body').off('touchstart.DrawerTouchCheck');
      _this.log('Found touch screen.');
    });
  };


  namespace.Imager = Imager;

})(jQuery, ImagerJs, ImagerJs.plugins, ImagerJs.util, ImagerJs.translations);

(function ($, namespace, translations) {
  /**
   *
   * @param accept
   *
   * @constructor
   * @memberof ImagerJs.util
   */
  var FileSelector = function (accept) {
    var _this = this;

    _this.acceptTypes = accept;

    _this.$element = $('<div class="file-selector">' +
    '<input type="file" />' +
    '<div class="drop-area">' +
        translations.t('Or drop files here') +
    '</div>' +
    '<div class="error-container bg-danger"></div>' +
    '</div>');

    if (_this.acceptTypes) {
      _this.$element.find('input').attr('accept', _this.acceptTypes);
    }

    _this.$element.find('input').on('change', function (e) {
      if (e.target.files.length < 1) {
        _this.showError(translations.t('No file selected.'));
      }

      for (var i = 0; i < e.target.files.length; i++) {
        if(e.target.files[i].type.indexOf('image') < 0) {
          _this.showError(translations.t('Incorret file type'));
          return;
        }
      }

      _this.parseFile(e.target.files[0]);
    });

    var $dropArea = _this.$element.find('.drop-area');
    $dropArea.on('dragover', function (e) {
      e.stopPropagation();
      e.preventDefault();
      $dropArea.addClass('hover');
    });
    $dropArea.on('dragleave', function (e) {
      e.stopPropagation();
      e.preventDefault();
      $dropArea.removeClass('hover');
    });
    $dropArea.on('drop', function (e) {
      e.stopPropagation();
      e.preventDefault();
      $dropArea.removeClass('hover');
      // fetch FileList object
      var files = e.originalEvent.dataTransfer.files;

      if (files.length < 1) {
        _this.showError(translations.t('No file selected.'));
        return;
      }

      for (var i = 0; i < files.length; i++) {
        if(files[i].type.indexOf('image') < 0) {
          _this.showError(translations.t('Incorret file type.'));
          return;
        }
      }

      _this.parseFile(files[0]);
    });
  };

  FileSelector.prototype.parseFile = function (file) {
    var _this = this;

    var fileReader = new FileReader();

    fileReader.onload = function (onloadEvent) {
      _this.$element.trigger(
        'fileSelected.fileSelector', {
          info: file,
          data: fileReader.result
        }
      );
    };

    fileReader.readAsDataURL(file);
  };

  FileSelector.prototype.onFileSelected = function (handler) {
    var _this = this;
    _this.$element.on('fileSelected.fileSelector', function (event, file) {
      handler(file);
    });
  };

  FileSelector.prototype.showError = function (error) {
    var _this = this;

    _this.$element.find('.error-container').html(error);
    _this.$element.find('.error-container').slideDown(200);

    setTimeout(function () {
      _this.$element.find('.error-container').slideUp(200);
    }, 2000);
  };

  FileSelector.prototype.getElement = function () {
    return this.$element;
  };

  FileSelector.prototype.hide = function () {
    this.$element.hide();
  };

  FileSelector.prototype.show = function () {
    this.$element.show();
  };

  namespace.FileSelector = FileSelector;

})(jQuery, ImagerJs.util, ImagerJs.translations);
(function ($, namespace) {
  namespace.uuid = function generateUUID() {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    return uuid;
  };
})(jQuery, ImagerJs.util);



(function ($, utilNamespace) {
  'use strict';

  /**
   * This function finds an url from which drawer file was loaded
   *
   * @function
   * @memberof DrawerJs.util
   * @returns {*}
   */
  utilNamespace.getDrawerFolderUrl = function () {
    // try to find a folder from which this script is included
    var scripts = document.getElementsByTagName("script");
    var drawerJsFilenamePattern = /dist\/(drawer.+\.js)+$/;

    for (var i = 0; i < scripts.length; i++) {
      var s = scripts.item(i);

      if (s.src) {
        var match = s.src.match(drawerJsFilenamePattern);
        if (match) {
          var pathToDrawerFolder = s.src.replace(match[1], '');
          return pathToDrawerFolder;
        }
      }
    }

    return null;
  };

  /**
   * Removes all click events with specified namespace bound to element.
   *
   * @param {jQuery} element
   * @param {String} namespace
   */
  utilNamespace.unbindClick = function (element, namespace) {
    var ns = namespace + 'drawerBindClick';

    $(element).off('click.' + ns);
    $(element).off('touchstart.' + ns);
    $(element).off('touchend.' + ns);
  };

  utilNamespace.bindClick = function (element, namespace, handler) {
    var ns = namespace + 'drawerBindClick';

    $(element).on('click.' + ns, function (event) {
      var elem = this;
      var result = null;

      if (elem.__lastClickTime) {
        var lastClickDiff = Date.now() - elem.__lastClickTime;
        if (lastClickDiff > 500) {
          result = handler.apply(elem, [event]);
          if (result === false) {
            event.stopPropagation();
            event.preventDefault();
            return false;
          }
        } else {
          // seems that we have already triggered this click on touchend event
        }
      } else {
        result = handler.apply(elem, [event]);
        if (result === false) {
          event.stopPropagation();
          event.preventDefault();
          return false;
        }
      }
    });
    $(element).on('touchstart.' + ns, function (event) {
      var elem = this;

      elem.__drawerTouchStartEvent = event;

      // disable click entirely since we do everything with touch events
      $(element).off('click.' + ns);
    });
    $(element).on('touchend.' + ns, function (event) {
      var elem = this;

      if (elem.__drawerTouchStartEvent) {
        var tsDiff = Math.abs(
          elem.__drawerTouchStartEvent.timeStamp - event.timeStamp
        );

        if (tsDiff < 300) {
          elem.__lastClickTime = Date.now();
          var result = handler.apply(elem, [event]);
          if (result === false) {
            event.stopPropagation();
            event.preventDefault();
            return false;
          }
        }
        delete elem.__drawerTouchStartEvent;
      }
    });
  };

  utilNamespace.bindDoubleTap = function (element, namespace,
                                          handler) {
    var timeWindow = 500;
    var positionWindow = 20;

    $(element).on('touchend.' + namespace, function (event) {
      var eventElem = this;
      if (eventElem.__touchEndTime) {
        var diff = Date.now() - eventElem.__touchEndTime;
        var xDiff = Math.abs(eventElem.__touchEndX - event.originalEvent.pageX);
        var yDiff = Math.abs(eventElem.__touchEndY - event.originalEvent.pageY);

        if (diff < timeWindow &&
          xDiff < positionWindow &&
          yDiff < positionWindow) {

          delete eventElem.__touchEndTime;
          delete eventElem.__touchEndX;
          delete eventElem.__touchEndY;
          var result = handler.apply(eventElem, [event]);
          if (result === false) {
            event.stopPropagation();
            event.preventDefault();
            return false;
          }
        } else {
          delete eventElem.__touchEndTime;
          delete eventElem.__touchEndX;
          delete eventElem.__touchEndY;
        }
      } else {
        eventElem.__touchEndTime = Date.now();
        eventElem.__touchEndX = event.originalEvent.pageX;
        eventElem.__touchEndY = event.originalEvent.pageY;
        setTimeout(function () {
          delete eventElem.__touchEndTime;
          delete eventElem.__touchEndX;
          delete eventElem.__touchEndY;
        }, timeWindow);
      }
    });
  };

  utilNamespace.bindLongPress = function (element, namespace,
                                          handler) {
    var logTag = 'drawerBindLongPress';
    var ns = namespace + logTag;

    $(element).on('touchstart.' + ns, function (event) {
      var elem = this;

      elem.__touchStartTime = Date.now();
      elem.__touchStartX = event.originalEvent.pageX;
      elem.__touchStartY = event.originalEvent.pageY;

      if (elem.__longPressCheckTimeout) {
        clearTimeout(elem.__longPressCheckTimeout);
      }

      var cleanHandlers = function () {

        delete elem.__touchStartTime;
        delete elem.__touchStartX;
        delete elem.__touchStartY;

        $(elem).off('touchmove.' + ns);
        $(elem).off('touchend.' + ns);
      };

      $(elem).on('touchmove.' + ns, function (moveEvent) {
        if (elem.__touchStartTime) {
          var xDiff = Math.abs(
            elem.__touchStartX - moveEvent.originalEvent.pageX
          );
          var yDiff = Math.abs(
            elem.__touchStartY - moveEvent.originalEvent.pageY
          );

          if (xDiff > 10 || yDiff > 10) {
            cleanHandlers();
          }
        }
      });

      $(elem).on('touchend.' + ns, function (endEvent) {
        cleanHandlers();
      });

      elem.__longPressCheckTimeout = setTimeout(function () {
        if (elem.__touchStartTime) {
          cleanHandlers();
          var result = handler.apply(elem, [event]);
        }
      }, 1000);

      return true;
    });
  };

  utilNamespace.unbindLongPress = function (element, namespace) {
    var logTag = 'drawerBindLongPress';
    var ns = namespace + logTag;

    $(element).off('touchstart.' + ns);
    $(element).off('touchmove.' + ns);
    $(element).off('touchend.' + ns);
  };

  utilNamespace.mouseDown = function (namespace) {
    return 'mousedown.' + namespace + ' touchstart.' + namespace;
  };

  utilNamespace.mouseMove = function (namespace) {
    return 'mousemove.' + namespace + ' touchmove.' + namespace;
  };

  utilNamespace.mouseUp = function (namespace) {
    return 'mouseup.' + namespace + ' touchend.' + namespace;
  };

  utilNamespace.getTransitionDuration = function (el, with_delay) {
    var style = window.getComputedStyle(el),
      duration = style.webkitTransitionDuration,
      delay = style.webkitTransitionDelay;

    // fix miliseconds vs seconds
    duration = (duration.indexOf("ms") > -1) ?
      parseFloat(duration) : parseFloat(duration) * 1000;
    delay = (delay.indexOf("ms") > -1) ?
      parseFloat(delay) : parseFloat(delay) * 1000;

    if (with_delay) return (duration + delay);

    else return duration;
  };

  utilNamespace.getEventPosition = function (event) {
    if (event.type.indexOf('touch') > -1) {
      event = event.originalEvent;

      if (
        (event.pageX === 0 && event.pageY === 0) ||
        (event.pageX === undefined && event.pageY === undefined) &&
        event.touches.length > 0
      ) {
        return {
          left: event.touches[0].pageX,
          top: event.touches[0].pageY
        };
      }
    }

    return {
      left: event.pageX,
      top: event.pageY
    };
  };

  utilNamespace.isShape = function (fabricObject) {
    var isShape = false;

    if (fabricObject.type &&
      (fabricObject.type == 'line' ||
      fabricObject.type == 'arrow')) {
      isShape = false;
    }
    else if (fabricObject.path) { // free drawing shape
      isShape = false;
    } else {
      isShape = true;
    }

    return isShape;
  };


  utilNamespace.__temporaryCanvas = null;
  utilNamespace.getTemporaryCanvas = function (originalCanvas) {
    if (!utilNamespace.__temporaryCanvas) {
      utilNamespace.__temporaryCanvas = document.createElement('canvas');
    }

    utilNamespace.__temporaryCanvas
      .setAttribute('width', originalCanvas.width);
    utilNamespace.__temporaryCanvas
      .setAttribute('height', originalCanvas.height);

    return utilNamespace.__temporaryCanvas;
  };

  utilNamespace.LastCoordsQueue = function () {
    this.coordsQueue = [];
    this.length = 10;

    this.pushCoords = function (x, y) {
      if (this.coordsQueue.length > this.length) {
        this.coordsQueue =
          this.coordsQueue.slice(this.coordsQueue.length - this.length);
      }

      this.coordsQueue.push({x: x, y: y});
    };

    this.getInterpolatedValues = function () {
      if (this.coordsQueue.length === 0) {
        return [];
      }

      if (this.coordsQueue.length === 1) {
        return [{x: this.coordsQueue[0].x, y: this.coordsQueue[0].y}];
      }

      var interpolatedCoords = [];

      var prevX = this.coordsQueue[this.coordsQueue.length - 2].x;
      var prevY = this.coordsQueue[this.coordsQueue.length - 2].y;

      var currX = this.coordsQueue[this.coordsQueue.length - 1].x;
      var currY = this.coordsQueue[this.coordsQueue.length - 1].y;

      var xDiff = currX - prevX;
      var yDiff = currY - prevY;

      var xDiffAbs = Math.abs(xDiff);
      var yDiffAbs = Math.abs(yDiff);

      var iterations = xDiffAbs > yDiffAbs ? xDiffAbs : yDiffAbs;

      for (var ii = 0; ii < iterations; ii++) {
        interpolatedCoords.push({
          x: prevX + ((xDiff / iterations) * ii),
          y: prevY + ((yDiff / iterations) * ii)
        });
      }

      return interpolatedCoords;
    };
  };

  utilNamespace.setWaiting = function (element, text, cursor) {
    if (!cursor) {
      cursor = 'wait';
    }

    utilNamespace.setOverlayMessage(element, text, cursor);
  };

  utilNamespace.stopWaiting = function (element) {
    utilNamespace.removeOverlayMessage(element);
  };

  /**
   * Adds overlay with a text message to container
   *
   * @param {HTMLElement} element
   * @param {string} text
   * @param {string} cursor
   * @param {string} [actionButtonText] If provided, a button will be shown
   * @param {Function} [actionButtonClickHandler]
   */
  utilNamespace.setOverlayMessage = function (element, text, cursor, actionButtonText,
                                              actionButtonClickHandler) {
    if (!cursor) {
      cursor = 'default';
    }

    var actionButton = actionButtonText ?
      '<div class="action-button">' + actionButtonText + '</div>' :
      '';

    $(element).append(
      '<div class="overlay-message-wrapper">' +
        '<div class="overlay-message">' +
          text +
          actionButton +
        '</div>' +
      '</div>');

    $(element).find('.overlay-message-wrapper').css('cursor', cursor);

    utilNamespace.bindClick(
      $(element).find('.action-button'),
      'overlay-message-click',
      actionButtonClickHandler
    );
  };

  utilNamespace.removeOverlayMessage = function (element) {
    $(element).find('.overlay-message-wrapper').remove();
  };

  /**
   * Performs image resize using Hermite filter.
   *
   * https://github.com/viliusle/Hermite-resize
   *
   * @param canvas
   * @param W width
   * @param H height
   * @param W2 resized width
   * @param H2 resized height
   */
  utilNamespace.resizeImage = function (canvas, W, H, W2, H2) {
    var time1 = Date.now();
    W2 = Math.round(W2);
    H2 = Math.round(H2);
    var img = canvas.getContext("2d").getImageData(0, 0, W, H);
    var img2 = canvas.getContext("2d").getImageData(0, 0, W2, H2);
    var data = img.data;
    var data2 = img2.data;
    var ratio_w = W / W2;
    var ratio_h = H / H2;
    var ratio_w_half = Math.ceil(ratio_w / 2);
    var ratio_h_half = Math.ceil(ratio_h / 2);

    for (var j = 0; j < H2; j++) {
      for (var i = 0; i < W2; i++) {
        var x2 = (i + j * W2) * 4;
        var weight = 0;
        var weights = 0;
        var weights_alpha = 0;
        
        var gx_r = 0, gx_g = 0, gx_b = 0, gx_a = 0;

        var center_y = (j + 0.5) * ratio_h;
        for (var yy = Math.floor(j * ratio_h); yy < (j + 1) * ratio_h; yy++) {
          var dy = Math.abs(center_y - (yy + 0.5)) / ratio_h_half;
          var center_x = (i + 0.5) * ratio_w;
          var w0 = dy * dy; //pre-calc part of w
          for (var xx = Math.floor(i * ratio_w); xx < (i + 1) * ratio_w; xx++) {
            var dx = Math.abs(center_x - (xx + 0.5)) / ratio_w_half;
            var w = Math.sqrt(w0 + dx * dx);
            if (w >= -1 && w <= 1) {
              //hermite filter
              weight = 2 * w * w * w - 3 * w * w + 1;
              if (weight > 0) {
                dx = 4 * (xx + yy * W);
                //alpha
                gx_a += weight * data[dx + 3];
                weights_alpha += weight;
                //colors
                if (data[dx + 3] < 255)
                  weight = weight * data[dx + 3] / 250;
                gx_r += weight * data[dx];
                gx_g += weight * data[dx + 1];
                gx_b += weight * data[dx + 2];
                weights += weight;
              }
            }
          }
        }
        data2[x2] = gx_r / weights;
        data2[x2 + 1] = gx_g / weights;
        data2[x2 + 2] = gx_b / weights;
        data2[x2 + 3] = gx_a / weights_alpha;
      }
    }
    //console.log("hermite = " + (Math.round(Date.now() - time1) / 1000) + " s");
    canvas.getContext("2d").clearRect(0, 0, Math.max(W, W2), Math.max(H, H2));
    canvas.width = W2;
    canvas.height = H2;
    canvas.getContext("2d").putImageData(img2, 0, 0);
  };

}(jQuery, ImagerJs.util));
(function ($, pluginsCatalog, util, translations) {
  var MOUSE_DOWN = util.mouseDown('imagerjsCrop');
  var MOUSE_UP = util.mouseUp('imagerjsCrop');
  var MOUSE_MOVE = util.mouseMove('imagerjsCrop');

  /**
   * Cropping plugin. Provides a button which allows to enter in
   * cropping mode and select image area to crop.
   *
   * @param imagerInstance
   *
   * @param options {Object} Cropping controls options.
   * @param options.controlsCss {Object} Css properties that will be applied to
   * cropping controls.
   *
   * @param options.controlsTouchCss {Object} Css properties that will
   * be applied to cropping controls when on touch device.
   *
   * @constructor
   * @memberof ImagerJs.plugins
   */
  var Crop = function CropPlugin(imagerInstance, options) {
    var _this = this;

    _this.weight = 0;

    _this.imager = imagerInstance;

    _this.defaultOptions = {
      controlsCss: {},
      controlsTouchCss: {}
    };

    options = options ? options : {};
    _this.options = $.extend(true, _this.defaultOptions, options);

    _this.originalWidth = null;
    _this.originalHeight = null;

    _this.croppedWidth = null;
    _this.croppedHeight = null;
    _this.croppedLeft = null;
    _this.croppedTop = null;
  };

  Crop.prototype.getButtons = function () {
    var _this = this;

    return [{
      classes: 'btn-crop',
      iconClasses: 'fa-scissors',
      tooltip: translations.t('Crop'),
      enabledHandler: function () {
        if (_this.sizeBeforeCrop) {
          _this.imager.setPreviewSize(
            _this.sizeBeforeCrop.width,
            _this.sizeBeforeCrop.height
          );
        }

        _this.enableRendering = false;

        _this.imager.render();

        _this.startCropping();
      },

      applyHandler: function () {
        _this.sizeBeforeCrop = _this.imager.getPreviewSize();

        _this.stopCropping();
        _this.enableRendering = true;

        _this.imager.setPreviewSize(_this.croppedWidth, _this.croppedHeight);

        _this.imager.setWaiting(true);

        setTimeout(function () {
          _this.imager.commitChanges('Crop');
          _this.reset();
          _this.imager.render();

          _this.imager.setWaiting(false);
        }, 50);
      },
      rejectHandler: function () {
        _this.stopCropping();

        _this.croppedWidth = null;
        _this.croppedHeight = null;
        _this.croppedLeft = null;
        _this.croppedTop = null;

        _this.imager.render();
      }
    }];
  };

  Crop.prototype.startCropping = function () {
    var _this = this;

    // show original image to user when cropping mode is on
    _this.renderCropped = false;
    _this.imager.render();

    $body = $('body');

    var previewSize = this.imager.getPreviewSize();
    _this.originalWidth = previewSize.width;
    _this.originalHeight = previewSize.height;

    _this.makePreview();

    _this.$cropControls = $(
      '<div class="imager-crop-container">' +
      '<div class="crop-corner crop-top-left"></div>' +
      '<div class="crop-corner crop-top-right"></div>' +
      '<div class="crop-corner crop-bottom-right"></div>' +
      '<div class="crop-corner crop-bottom-left"></div>' +

      '<div class="crop-border crop-border-top"></div>' +
      '<div class="crop-border crop-border-right"></div>' +
      '<div class="crop-border crop-border-bottom"></div>' +
      '<div class="crop-border crop-border-left"></div>' +
      '</div>').css({
      width: _this.croppedWidth ? _this.croppedWidth : _this.originalWidth,
      height: _this.croppedHeight ? _this.croppedHeight : _this.originalHeight,
      left: _this.croppedLeft ? _this.croppedLeft : 0,
      top: _this.croppedTop ? _this.croppedTop : 0
    });

    _this.imager.$editContainer.append(_this.$cropControls);

    var $corners = _this.$cropControls.find('.crop-corner');

    if (_this.imager.touchDevice) {
      $corners.css(_this.options.controlsTouchCss);
    } else {
      $corners.css(_this.options.controlsCss);
    }

    $corners.on(MOUSE_DOWN, function (clickEvent) {
      var controlItem = this;

      var startPos = util.getEventPosition(clickEvent);

      var startControlsLeft = _this.$cropControls.css('left').replace('px', '') | 0;
      var startControlsTop = _this.$cropControls.css('top').replace('px', '') | 0;

      var startControlsWidth = _this.$cropControls.css('width').replace('px', '') | 0;
      var startControlsHeight = _this.$cropControls.css('height').replace('px', '') | 0;

      $body.on(MOUSE_MOVE, function (moveEvent) {
        var movePos = util.getEventPosition(moveEvent);

        var diffLeft = movePos.left - startPos.left;
        var diffTop = movePos.top - startPos.top;

        if ($(controlItem).hasClass('crop-top-left')) {
          _this.croppedLeft = startControlsLeft + diffLeft;
          _this.croppedTop = startControlsTop + diffTop;

          _this.croppedWidth = startControlsWidth - diffLeft;
          _this.croppedHeight = startControlsHeight - diffTop;
        }

        if ($(controlItem).hasClass('crop-top-right')) {
          _this.croppedLeft = startControlsLeft;
          _this.croppedTop = startControlsTop + diffTop;

          _this.croppedWidth = startControlsWidth - (diffLeft * -1);
          _this.croppedHeight = startControlsHeight - diffTop;
        }

        if ($(controlItem).hasClass('crop-bottom-right')) {
          _this.croppedLeft = startControlsLeft;
          _this.croppedTop = startControlsTop;

          _this.croppedWidth = startControlsWidth - (diffLeft * -1);
          _this.croppedHeight = startControlsHeight + diffTop;
        }

        if ($(controlItem).hasClass('crop-bottom-left')) {
          _this.croppedLeft = startControlsLeft + diffLeft;
          _this.croppedTop = startControlsTop;

          _this.croppedWidth = startControlsWidth - diffLeft;
          _this.croppedHeight = startControlsHeight + diffTop;
        }

        // bounds validation
        if (_this.croppedLeft < 0) {
          _this.croppedLeft = 0;
        }

        if (_this.croppedTop < 0) {
          _this.croppedTop = 0;
        }

        if (_this.croppedLeft + _this.croppedWidth > _this.originalWidth) {
          _this.croppedWidth = _this.originalWidth - _this.croppedLeft;
        }

        if (_this.croppedTop + _this.croppedHeight > _this.originalHeight) {
          _this.croppedHeight = _this.originalHeight - _this.croppedTop;
        }

        _this.$cropControls.css({
          left: _this.croppedLeft,
          top: _this.croppedTop,
          width: _this.croppedWidth,
          height: _this.croppedHeight
        });

        _this.adjustPreview();

        //_this.imager.render();
        //_this.imager.render(_this.previewCanvas.getContext('2d'));

        moveEvent.preventDefault();
        moveEvent.stopPropagation();
        return false;
      });

      $body.on(MOUSE_UP, function () {
        $body.off(MOUSE_MOVE);
        $body.off(MOUSE_UP);
      });
    });
  };

  Crop.prototype.stopCropping = function () {
    var _this = this;

    this.$preview.remove();
    this.$preview = null;

    this.$cropControls.remove();
    this.$cropControls = null;

    this.renderCropped = true;
  };

  Crop.prototype.makePreview = function () {
    var _this = this;

    var originalPreviewSize = this.imager.getPreviewSize();

    _this.$preview = $('' +
      '<div class="imager-crop-preview-container">' +
      '<canvas class="imager-crop-preview"></canvas>' +
      '</div>').css('position', 'absolute').css('top', '50px').css({
      width: originalPreviewSize.width,
      height: originalPreviewSize.height,
      position: 'absolute',
      right: '50px',
      top: '50px'
    });

    _this.previewCanvas = _this.$preview.find('canvas.imager-crop-preview')[0];
    _this.previewCanvas.__previewCanvas = true;

    _this.previewCanvas.width = originalPreviewSize.width * 1.5;
    _this.previewCanvas.height = originalPreviewSize.height * 1.5;

    $(_this.previewCanvas).css({
      height: '400px'
    });

    _this.imager.$editContainer.after(this.$preview);
  };

  Crop.prototype.adjustPreview = function () {
    var _this = this;

    //_this.$preview.find('canvas').css({
    //  width: _this.croppedWidth,
    //  height: _this.croppedHeight//,
    //  //left: _this.croppedLeft,
    //  //top: _this.croppedTop
    //});
    //
    //_this.previewCanvas.width = _this.croppedWidth * 1.5;
    //_this.previewCanvas.height = _this.croppedHeight * 1.5;
  };

  Crop.prototype.render = function (ctx) {
    if (this.croppedWidth === null || !this.enableRendering) {
      return;
    }

    var previewSize = this.imager.getPreviewSize();

    var previewWidth = previewSize.width;
    var previewHeight = previewSize.height;

    if (this.sizeBeforeCrop) {
      previewWidth = this.sizeBeforeCrop.width;
      previewHeight = this.sizeBeforeCrop.height;
    }

    var tempCtx = this.imager.tempCanvas.getContext('2d');

    // firstly find selection size in global coordinate syztem and scale
    var scaledWidth = this.imager.convertScale(
      this.croppedWidth, previewWidth, ctx.canvas.width
    );
    var scaledHeight = this.imager.convertScale(
      this.croppedHeight, previewHeight, ctx.canvas.height
    );

    var left = this.imager.convertScale(
      this.croppedLeft, previewWidth, ctx.canvas.width
    );
    var top = this.imager.convertScale(
      this.croppedTop, previewHeight, ctx.canvas.height
    );

    left *= -1;
    top *= -1;

    // then calculate the difference to know how to translate temporary canvas
    var widthDiff = ctx.canvas.width - scaledWidth;
    var heightDiff = ctx.canvas.height - scaledHeight;

    tempCtx.canvas.width = scaledWidth;
    tempCtx.canvas.height = scaledHeight;

    tempCtx.clearRect(0, 0, tempCtx.canvas.width, tempCtx.canvas.height);

    tempCtx.drawImage(ctx.canvas,
      0, 0, ctx.canvas.width, ctx.canvas.height,
      left, top, tempCtx.canvas.width + widthDiff, tempCtx.canvas.height + heightDiff);

    ctx.canvas.width = scaledWidth;
    ctx.canvas.height = scaledHeight;

    this.imager.clearCanvas(ctx);
    ctx.drawImage(tempCtx.canvas,
      0, 0, tempCtx.canvas.width, tempCtx.canvas.height,
      0, 0, ctx.canvas.width, ctx.canvas.height);
  };

  Crop.prototype.onToolSelected = function (btn) {
    if (btn.plugin.constructor.name == 'RotatePlugin') {
      this.croppedLeft = null;
      this.croppedTop = null;
      this.croppedWidth = null;
      this.croppedHeight = null;

      this.sizeBeforeCrop = null;
    }
  };

  Crop.prototype.deserialize = function (savedState) {
    if (savedState) {
      this.croppedLeft = croppedLeft;
      this.croppedTop = croppedTop;
      this.croppedWidth = croppedWidth;
      this.croppedHeight = croppedHeight;
      this.sizeBeforeCrop = sizeBeforeCrop;
    }
  };

  Crop.prototype.serialize = function () {
    return {
      croppedLeft: this.croppedLeft,
      croppedTop: this.croppedTop,
      croppedWidth: this.croppedWidth,
      croppedHeight: this.croppedHeight,
      sizeBeforeCrop: this.sizeBeforeCrop
    };
  };

  Crop.prototype.reset = function () {
    this.croppedLeft = null;
    this.croppedTop = null;
    this.croppedWidth = null;
    this.croppedHeight = null;

    this.sizeBeforeCrop = null;
  };

  pluginsCatalog.Crop = Crop;

})(jQuery, ImagerJs.plugins, ImagerJs.util, ImagerJs.translations);
(function ($, pluginsCatalog, translations, util) {
  /**
   * This plugin provides a button that will remove image & editing controls
   * from it.
   *
   * @param {ImagerJs} imagerInstance
   * @param {Object} options
   * @param {boolean} [options.fullRemove=false] Whether to fully remove imager.
   * If true, everything will be removed from DOM.
   * If false, a selector for new image will be left
   *
   * @constructor
   *
   * @memberof ImagerJs.progins
   */
  var Delete = function DeletePlugin(imagerInstance, options) {
    var _this = this;

    /**
     *
     * @type {ImagerJs}
     */
    _this.imager = imagerInstance;

    _this.defaultOptions = {
      fullRemove: false
    };

    options = options ? options : {};
    _this.options = $.extend(true, _this.defaultOptions, options);

    _this.weight = 500;
  };

  Delete.prototype.getButtons = function () {
    var _this = this;

    return [{
      classes: 'btn-delete',
      iconClasses: 'fa-times',
      tooltip: translations.t('Delete image'),
      enabledHandler: function (toolbar) {
        var question =
          translations.t('Are you sure want to delete this image?');
        var response = confirm(question);
        if (response) {
          _this.imager.setWaiting(true);

          setTimeout(function () {
            if (_this.options.fullRemove) {
              _this.imager.remove(true);
            } else {
              _this.imager.stopEditing();
              _this.imager.$imageElement.attr('src', '');

              _this.imager.startSelector();
              _this.imager.adjustEditContainer();
            }
          }, 1);
        }
      }
    }];
  };

  pluginsCatalog.Delete = Delete;
})(jQuery, ImagerJs.plugins, ImagerJs.translations, ImagerJs.util);
(function ($, pluginsCatalog, util, translations, Modal) {
  'use strict';

  var MOUSE_DOWN = util.mouseDown('MovableFloatingMode');
  var MOUSE_MOVE = util.mouseMove('MovableFloatingMode');
  var MOUSE_UP = util.mouseUp('MovableFloatingMode');

  /**
   * Provides a button which shows modal window with image properties line
   * aligment and size.
   *
   * @param imagerInstance
   * @param options
   * @constructor
   */
  var Properties = function PropertiesPlugin(imagerInstance, options) {
    var _this = this;

    _this.imager = imagerInstance;

    _this.defaultOptions = {
      minWidth: 50,
      minHeight: 50
    };

    options = options ? options : {};
    _this.options = $.extend(true, _this.defaultOptions, options);

    _this.weight = 100;

    _this.imager.log('[PropertiesPlugin]', 'init');
  };

  Properties.prototype.getButtons = function () {
    var _this = this;

    return [{
      classes: 'btn-properties',
      iconClasses: 'fa-cog',
      tooltip: translations.t('Image properties'),
      enabledHandler: function (toolbar) {
        _this.showPropertiesModal();
      }
    }];
  };

  Properties.prototype.showPropertiesModal = function () {
    var _this = this;

    var modal = new Modal();
    modal.setTitle(translations.t('Image properties'));
    modal.addClass('canvas-properties imager-click-stop');

    var $template = $('<div class="image-properties">' +
    '<form class="image-size-form"><div class="form-group">' +
        '<label for="image-properties-width">' +
          translations.t('Size:') + ' ' +
        '</label>' +
        '<input type="text" class="form-control" ' +
               'id="image-properties-width" ' +
               'placeholder="' + translations.t('width in px') + '">' +
        '<span>x</span>' +
        '<input type="email" class="form-control" ' +
               'id="image-properties-height" ' +
               'placeholder="' + translations.t('height in px') + '">' +
    '</div></form>' +
    '<br>' +
    '<form class="aligment"><div class="form-group">' +
      '<label for="image-properties-layout">Aligment:</label>' +
      '<select id="image-properties-layout" ' +
              'class="form-control layout-selector">' +
      '<option value="left">' + translations.t('Left') + '</option>' +
      '<option value="right">' + translations.t('Right') + '</option>' +
      '<option value="center">' + translations.t('Center') + '</option>' +
      '<option value="inline">' + translations.t('Inline') + '</option>' +
      '<option value="floating">' + translations.t('Floating') + '</option>'+
      '</select>' +
    '</div></form>' +
    '<form class="background-transparency"><div class="form-group">' +
      '<input id="image-properties-transparent-background" ' +
             'type="checkbox" checked>' +
      '<label for="image-properties-transparent-background">' +
        translations.t('Transparent background') +
      '</label>' +
    '</div></form>' +
    '</div>');

    if(this.getAlign() == 'floating') {
      $template.find('.background-transparency').show();
    } else {
      $template.find('.background-transparency').hide();
    }

    var backgroundColor = _this.imager.$imageElement.css('background-color');

    if(backgroundColor == 'transparent' ||
      backgroundColor == 'rgba(0, 0, 0, 0)'){
      $template.find('#image-properties-transparent-background')
        .attr('checked', 'checked');
    } else {
      $template.find('#image-properties-transparent-background')
        .removeAttr('checked');
    }

    var size = this.imager.getPreviewSize();
    var ratioWidth = size.height / size.width;
    var ratioHeight = size.width / size.height;

    var currentAlign = this.getAlign();

    $template.find('#image-properties-width').val(size.width);
    $template.find('#image-properties-width').on('change keyup', function(){
      var newWidth = $template.find('#image-properties-width').val();
      var newHeight = Math.floor(newWidth * ratioWidth);
      $template.find('#image-properties-height').val(newHeight);
    });

    $template.find('#image-properties-height').val(size.height);
    $template.find('#image-properties-height').on('change keyup', function(){
      var newHeight = $template.find('#image-properties-height').val();
      var newWidth = Math.floor(newHeight * ratioHeight);
      $template.find('#image-properties-width').val(newWidth);
    });

    $template.find('#image-properties-layout').val(currentAlign);

    $template.find('#image-properties-layout').change(function () {
      if ($('#image-properties-layout').val() == 'floating') {
        $template.find('.background-transparency').show();
      } else {
        $template.find('.background-transparency').hide();
      }
    });

    modal.setTemplate($template);

    modal.addCancelButton(translations.t('Cancel'), function(){
      modal.remove();
    });

    modal.addActionButton(translations.t('Apply'), function(){
      var width = $('#image-properties-width').val();
      var height = $('#image-properties-height').val();
      var align = $('#image-properties-layout').val();
      var transparent = $('#image-properties-transparent-background')
        .attr('checked');

      if(transparent){
        _this.imager.$editContainer.css('background', 'transparent');
        _this.imager.$imageElement.css('background', 'transparent');
      } else {
        _this.imager.$editContainer.css('background', 'white');
        _this.imager.$imageElement.css('background', 'white');
      }

      _this.imager.render();

      if(align != _this.getAlign()){
        _this.setAlign(align);
      }

      _this.imager.setPreviewSize(width, height);

      modal.remove();
    });

    modal.show();
  };

  Properties.prototype.setAlign = function (align) {
    var aligmentCss = {};

    if (align == 'floating') {
      aligmentCss['position'] = 'absolute';
      aligmentCss['display'] = 'block';
      aligmentCss['float'] = 'none';
      aligmentCss['left'] = '0px';
      aligmentCss['top'] = '0px';
    }
    else if (align == 'center') {
      aligmentCss['float'] = 'none';
      aligmentCss['margin-left'] = 'auto';
      aligmentCss['margin-right'] = 'auto';
      aligmentCss['display'] = 'block';
      aligmentCss['position'] = 'static';
    } else if (align == 'inline') {
      aligmentCss['float'] = 'none';
      aligmentCss['display'] = 'inline-block';
      aligmentCss['position'] = 'static';
    } else {
      aligmentCss['display'] = 'block';
      aligmentCss['float'] = align;
      aligmentCss['position'] = 'static';
    }

    this.imager.$imageElement.css(aligmentCss);

    this.onEditStart();

    this.imager.adjustEditContainer();
  };

  Properties.prototype.getAlign = function () {
    var aligmentCss = this.imager.$imageElement.css(
      ['position', 'float', 'display', 'margin-left', 'margin-right']
    );

    var currentAlign = 'inline';

    if (aligmentCss['position'] == 'absolute') {
      currentAlign = 'floating';
    }
    else if (aligmentCss['float'] == 'left') {
      currentAlign = 'left';
    } else if (aligmentCss['float'] == 'right') {
      currentAlign = 'right';
    } else if (aligmentCss['display'] == 'block' &&
      aligmentCss['margin-left'] == 'auto') {
      currentAlign = 'center';
    }

    return currentAlign;
  };

  Properties.prototype.onEditStart = function () {
    var align = this.getAlign();

    if(align == 'floating') {
      this.makeMoveButton();
    } else if(this.$moveButton){
      this.$moveButton.remove();
      this.$moveButton = null;
    }
  };

  Properties.prototype.makeMoveButton = function () {
    var _this = this;
    var toolbar = _this.imager.getPluginInstance('Toolbar').toolbar;

    var $body = $('body');

    this.$moveButton = toolbar.addButton('btn-move', 'fa-arrows',
      translations.t('Move image'), function () {
      });

    this.$moveButton.on(MOUSE_DOWN, function (event) {
      if (event.type.indexOf('touch') > -1) {
        event = event.originalEvent;
      }

      $('.tooltip-btn-move').css('display', 'none');

      var startLeft = _this.imager.$imageElement
          .css('left').replace('px', '') | 0;
      var startTop = _this.imager.$imageElement
          .css('top').replace('px', '') | 0;

      var mouseStartLeft = event.pageX;
      var mouseStartTop = event.pageY;

      $body.on(MOUSE_MOVE, function (moveEvent) {
        if (moveEvent.type.indexOf('touch') > -1) {
          moveEvent = moveEvent.originalEvent;
        }

        var diffLeft = moveEvent.pageX - mouseStartLeft;
        var diffTop = moveEvent.pageY - mouseStartTop;

        var newLeft = startLeft + diffLeft;
        var newTop = startTop + diffTop;

        if (newLeft < 0) {
          newLeft = 0;
        }
        if (newTop < 0) {
          newTop = 0;
        }

        _this.imager.$imageElement.css({
          left: newLeft,
          top: newTop
        });

        _this.imager.adjustEditContainer();

        moveEvent.preventDefault();
        moveEvent.stopPropagation();
        return false;
      });

      $body.on(MOUSE_UP, function () {
        $('.tooltip-btn-move').css('display', 'block');
        $body.off(MOUSE_MOVE);
        $body.off(MOUSE_UP);
      });
    });
  };

  pluginsCatalog.Properties = Properties;
})(jQuery, ImagerJs.plugins, ImagerJs.util, ImagerJs.translations,
  window.Modal);
(function ($, pluginsCatalog, util) {
  var MOUSE_DOWN = util.mouseDown('imagerjsResize');
  var MOUSE_UP = util.mouseUp('imagerjsResize');
  var MOUSE_MOVE = util.mouseMove('imagerjsResize');

  /**
   * Resize plugin. Provides a control which allows to to resize an image.
   *
   * @param imagerInstance
   *
   * @param options {Object} Resize square control options.
   * @param options.controlsCss {Object} Css properties that will be applied to
   * resizing controls.
   *
   * @param options.controlsTouchCss {Object} Css properties that will
   * be applied to resizing controls when on touch device.
   *
   * @param options.doubleDiff {Boolean} Doubles mouse pointer distance.
   * This is needed when image is centered while resizing to make
   * resize corner be always under mouse cursor.
   *
   * @constructor
   * @memberof ImagerJs.plugins
   */
  var Resize = function ResizePlugin(imagerInstance, options) {
    var _this = this;

    _this.imager = imagerInstance;

    _this.defaultOptions = {
      minWidth: 50,
      minHeight: 50,
      controlsCss: {},
      controlsTouchCss: {},
      doubleDiff: false
    };

    options = options ? options : {};
    _this.options = $.extend(true, _this.defaultOptions, options);

    _this.weight = 99999;
  };

  Resize.prototype.onToolSelected = function () {
    if (this.$resizeSquare) {
      this.$resizeSquare.addClass('hidden');
    }
  };

  Resize.prototype.onToolApply = function () {
    if (this.$resizeSquare) {
      this.$resizeSquare.removeClass('hidden');
    }
  };

  Resize.prototype.onToolReject = function () {
    if (this.$resizeSquare) {
      this.$resizeSquare.removeClass('hidden');
    }
  };

  Resize.prototype.onEditStart = function () {
    var _this = this;

    var $resizeSquare = $('<div class="resize-square"></div>');

    if(_this.imager.touchDevice){
      $resizeSquare.css(_this.options.controlsTouchCss);
    } else {
      $resizeSquare.css(_this.options.controlsCss);
    }

    _this.imager.$editContainer.append($resizeSquare);

    var $body = $('body');

    $resizeSquare.on(MOUSE_DOWN, function (downEvent) {
      var startPos = util.getEventPosition(downEvent);

      var startDimensions = _this.imager.getPreviewSize();

      var ratioWidth = startDimensions.height / startDimensions.width;
      var ratioHeight = startDimensions.width / startDimensions.height;

      $body.on(MOUSE_MOVE, function (moveEvent) {
        var movePos = util.getEventPosition(moveEvent);

        var leftDiff = movePos.left - startPos.left;
        var topDiff = movePos.top - startPos.top;

        if(_this.options.doubleDiff){
          leftDiff *= 2;
          topDiff *= 2;
        }


        var newWidth = startDimensions.width + leftDiff;
        var newHeight = startDimensions.height + topDiff;

        var fitSize = _this.calcAspectRatio(
          startDimensions.width, startDimensions.height, newWidth, newHeight
        );

        newWidth = fitSize.width;
        newHeight = fitSize.height;

        if (newWidth < _this.options.minWidth) {
          newWidth = _this.options.minWidth;
        }

        if (newHeight < _this.options.minHeight) {
          newHeight = _this.options.minHeight;
        }

        _this.imager.setPreviewSize(newWidth, newHeight);

        moveEvent.stopPropagation();
        moveEvent.preventDefault();
        return false;
      });

      $body.on(MOUSE_UP, function (upEvent) {
        $body.off(MOUSE_UP);
        $body.off(MOUSE_MOVE);
      });

      downEvent.stopPropagation();
      downEvent.preventDefault();
      return false;
    });

    this.$resizeSquare = $resizeSquare;
  };

  /**
   * Conserve aspect ratio of the orignal region.
   * Useful when shrinking/enlarging
   * images to fit into a certain area.
   *
   * @param {Number} srcWidth Source area width
   * @param {Number} srcHeight Source area height
   * @param {Number} maxWidth Fittable area maximum available width
   * @param {Number} maxHeight Fittable area maximum available height
   * @return {Object} { width, heigth }
   */
  Resize.prototype.calcAspectRatio = function calculateAspectRatioFit(
    srcWidth, srcHeight, maxWidth, maxHeight) {

    var ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);

    return { width: srcWidth*ratio, height: srcHeight*ratio };
  };

  pluginsCatalog.Resize = Resize;
})(jQuery, ImagerJs.plugins, ImagerJs.util);
(function ($, pluginsCatalog, util, translations) {
  var MOUSE_DOWN = util.mouseDown('imagerjsRotate');
  var MOUSE_UP = util.mouseUp('imagerjsRotate');
  var MOUSE_MOVE = util.mouseMove('imagerjsRotate');

  /**
   * Rotate plugins. Allows image rotation.
   *
   * @param imagerInstance
   *
   * @param options {Object} Rotating controls options.
   * @param options.controlsCss {Object} Css properties that will be applied to
   * rotating controls.
   *
   * @param options.controlsTouchCss {Object} Css properties that will
   * be applied to rotating controls when on touch device.
   *
   * @constructor
   * @memberof ImagerJs.plugins
   */
  var Rotate = function RotatePlugin(imagerInstance, options) {
    var _this = this;

    _this.imager = imagerInstance;

    _this.defaultOptions = {
      controlsCss: {},
      controlsTouchCss: {}
    };

    options = options ? options : {};
    _this.options = $.extend(true, _this.defaultOptions, options);

    _this.weight = -100;

    _this.angle = 0;

    var previewSize = this.imager.getPreviewSize();

    _this.controlsStartWidth = previewSize.width;
    _this.controlsStartHeight = previewSize.height;

    _this.widthDiff = 0;
    _this.heightDiff = 0;
  };

  Rotate.prototype.getButtons = function () {
    var _this = this;

    var group = {
      name: 'Rotate',
      tooltip: translations.t('Rotate')
    };

    return [{
      classes: 'btn-rotate',
      iconClasses: 'fa-repeat',
      tooltip: translations.t('Rotate manually'),
      group: group,
      enabledHandler: function (toolbar) {
        _this.startRotate();
        _this.imager.render();
      },
      applyHandler: function () {
        _this.imager.setWaiting(true);

        setTimeout(function () {
          _this.applyHandler();
          _this.imager.commitChanges('Rotate');
          _this.reset();

          _this.imager.setWaiting(false);
        }, 50);
      },
      rejectHandler: function () {
        _this.setAngle(0);
        _this.stopRotate();
      }
    }, {
      group: group,
      classes: 'btn-rotate btn-rotate-90',
      iconClasses: 'fa-undo',
      tooltip: translations.t('Rotate 90 left'),
      enabledHandler: function (toolbar) {
        _this.imager.setWaiting(true);

        setTimeout(function () {
          _this.rotateByAngle(-90 * Math.PI / 180);
          _this.imager.setWaiting(false);
        }, 50);
      }
    }, {
      group: group,
      classes: 'btn-rotate',
      iconClasses: 'fa-repeat',
      tooltip: translations.t('Rotate 90 right'),
      enabledHandler: function (toolbar) {
        _this.imager.setWaiting(true);

        setTimeout(function () {
          _this.rotateByAngle(90 * Math.PI / 180);
          _this.imager.setWaiting(false);
        }, 50);
      }
    }];
  };

  Rotate.prototype.applyHandler = function () {
    this.stopRotate();
  };

  Rotate.prototype.rotateByAngle = function (angle) {
    var prevQuality = this.imager.quality;
    var prevTargetScale = this.imager.targetScale;

    this.imager.quality = 1;
    this.imager.targetScale = 1;

    this.startRotate();
    this.imager.render();
    this.setAngle(angle);
    this.imager.render();
    this.stopRotate();
    this.imager.commitChanges(translations.t('Rotate'));
    this.reset();
    this.imager.render();

    this.imager.quality = prevQuality;
    this.imager.targetScale = prevTargetScale;
  };

  Rotate.prototype.startRotate = function () {
    var _this = this;

    var previewDimensions = this.imager.getPreviewSize();

    _this.controlsStartWidth = _this.imager.originalPreviewWidth;
    _this.controlsStartHeight = _this.imager.originalPreviewHeight;

    var $rotateControls = $(
      '<div class="imager-rotate-container">' +
      '<div class="rotate-corner rotate-top-left"></div>' +
      '<div class="rotate-corner rotate-top-right"></div>' +
      '<div class="rotate-corner rotate-bottom-right"></div>' +
      '<div class="rotate-corner rotate-bottom-left"></div>' +

      '<div class="rotate-border rotate-border-top"></div>' +
      '<div class="rotate-border rotate-border-right"></div>' +
      '<div class="rotate-border rotate-border-bottom"></div>' +
      '<div class="rotate-border rotate-border-left"></div>' +
      '</div>').css({
      width: _this.controlsStartWidth,
      height: _this.controlsStartHeight
    });

    this.$rotateControls = $rotateControls;
    this.imager.$editContainer.append($rotateControls);

    var $corners = $rotateControls.find('.rotate-corner');

    if (_this.imager.touchDevice) {
      $corners.css(_this.options.controlsTouchCss);
    } else {
      $corners.css(_this.options.controlsCss);
    }

    var $body = $('body');

    var imageOffset = $(this.imager.canvas).offset();

    _this.centerX = imageOffset.left + (this.controlsStartWidth / 2);
    _this.centerY = imageOffset.top + (this.controlsStartHeight / 2);

    _this.setAngle(_this.angle);

    $corners.on(MOUSE_DOWN, function (startEvent) {
      _this.prevAngle = _this.angle * -1;

      var startPos = util.getEventPosition(startEvent);

      var startAngle = _this.getAngle(
        _this.centerX, _this.centerY, startPos.left, startPos.top
      );

      $body.on(MOUSE_MOVE, function (moveEvent) {
        var movePos = util.getEventPosition(moveEvent);

        var currentAngle = _this.getAngle(_this.centerX, _this.centerY,
          movePos.left, movePos.top);

        var newAngle = startAngle - currentAngle;
        _this.angle = _this.prevAngle + newAngle;
        _this.angle *= -1;

        _this.setAngle(_this.angle);

        moveEvent.preventDefault();
        moveEvent.stopPropagation();
        return false;
      });

      $body.on(MOUSE_UP, function (endEvent) {
        $body.off(MOUSE_UP);
        $body.off(MOUSE_MOVE);

        _this.lastAngle = _this.angle;
      });

      startEvent.preventDefault();
      startEvent.stopPropagation();
      return false;
    });
  };

  Rotate.prototype.stopRotate = function () {
    this.$rotateControls.remove();
    this.$rotateControls = null;
  };

  Rotate.prototype.setAngle = function (angle) {
    this.angle = angle;
    this.$rotateControls.css('-webkit-transform', 'rotate(' + angle + 'rad)');

    var rotatedDimensions = this.getRotatedDimensions(
      this.controlsStartWidth, this.controlsStartHeight, angle
    );

    this.widthDiff = rotatedDimensions.width - this.controlsStartWidth;
    this.heightDiff = rotatedDimensions.height - this.controlsStartHeight;

    this.$rotateControls.css({
      top: this.heightDiff / 2,
      left: this.widthDiff / 2
    });

    this.imager.setPreviewSize(
      rotatedDimensions.width, rotatedDimensions.height
    );

    this.imager.render();
  };

  Rotate.prototype.render = function (ctx) {
    // create temp canvas
    var tempCtx = this.imager.tempCanvas.getContext('2d');
    tempCtx.clearRect(0, 0, tempCtx.canvas.width, tempCtx.canvas.height);

    // convert local coordinates from preview to
    // global coordinates of image original size
    var scaledWidthDiff = this.imager.convertScale(
      this.widthDiff, this.controlsStartWidth, ctx.canvas.width
    );
    var scaledHeightDiff = this.imager.convertScale(
      this.heightDiff, this.controlsStartHeight, ctx.canvas.height
    );

    // temporary canvas should be bigger because rotated image takes
    // more space
    tempCtx.canvas.width = ctx.canvas.width + scaledWidthDiff;
    tempCtx.canvas.height = ctx.canvas.height + scaledHeightDiff;

    // rotate temp context
    this.rotateCanvas(tempCtx, this.angle);
    tempCtx.translate(scaledWidthDiff / 2, scaledHeightDiff / 2);

    // draw main canvas into temp canvas
    tempCtx.drawImage(ctx.canvas,
      0, 0, ctx.canvas.width, ctx.canvas.height,
      0, 0, ctx.canvas.width, ctx.canvas.height);

    // then restore rotation and offset of temp context
    tempCtx.translate(-scaledWidthDiff / 2, -scaledHeightDiff / 2);
    this.restoreCanvasRotation(tempCtx, this.angle);

    // now it's time to make original canvas bigger so rotated image will fit
    ctx.canvas.width += scaledWidthDiff;
    ctx.canvas.height += scaledHeightDiff;

    // clear main canvas
    this.imager.clearCanvas(ctx);

    var paddingWidth = 0;
    var paddingHeight = 0;
    if (this.$rotateControls) {
      paddingWidth = this.imager.convertScale(
        10, this.controlsStartWidth, ctx.canvas.width
      );
      paddingHeight = this.imager.convertScale(
        10, this.controlsStartHeight, ctx.canvas.height
      );
    }

    // draw temp canvas into main canvas
    ctx.drawImage(tempCtx.canvas,
      0,                        // srcX
      0,                        // srcY
      tempCtx.canvas.width,     // srcWidth
      tempCtx.canvas.height,    // srcHeight
      paddingWidth,             // destX
      paddingHeight,            // destY
      ctx.canvas.width - (paddingWidth * 2),  // destWidth
      ctx.canvas.height - (paddingHeight * 2) // destHeight
    );

  };

  Rotate.prototype.rotateCanvas = function (context, angle) {
    context.translate(context.canvas.width / 2, context.canvas.height / 2);
    context.rotate(angle);
    context.translate(-context.canvas.width / 2, -context.canvas.height / 2);
  };

  Rotate.prototype.restoreCanvasRotation = function (context, angle) {
    context.translate(context.canvas.width / 2, context.canvas.height / 2);
    context.rotate(angle * -1);
    context.translate(-context.canvas.width / 2, -context.canvas.height / 2);
  };

  Rotate.prototype.getRotatedDimensions = function (width, height, angle) {
    if (angle < 0) {
      angle *= -1;
    }

    if (angle > Math.PI * 2) {
      angle = angle - (Math.PI * 2);
      angle = (Math.PI * 2) - angle;
    }

    if (angle > Math.PI) {
      angle = angle - Math.PI;
      angle = Math.PI - angle;
    }

    if (angle > Math.PI / 2) {
      angle = angle - Math.PI / 2;
      angle = (Math.PI / 2) - angle;
    }

    var a = width * Math.cos(angle);
    var b = height * Math.sin(angle);
    var c = a + b;

    var p = width * Math.sin(angle);
    var q = height * Math.cos(angle);
    var r = p + q;

    return {
      width: c,
      height: r
    };
  };

  Rotate.prototype.getAngle = function (x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
  };

  Rotate.prototype.deserialize = function (savedState) {
    if (savedState && savedState.angle) {
      this.angle = savedState.angle;
    }
  };

  Rotate.prototype.serialize = function () {
    return {
      angle: this.angle
    };
  };

  /**
   * Reset all rotation related variables, so on the next rotation start
   * it will start from zeroed rotation.
   */
  Rotate.prototype.reset = function () {
    this.widthDiff = 0;
    this.heightDiff = 0;
    this.angle = 0;
  };

  pluginsCatalog.Rotate = Rotate;

})(jQuery, ImagerJs.plugins, ImagerJs.util, ImagerJs.translations);
(function ($, pluginsCatalog, util, translations) {

  /**
   * Allows saving of the image.
   *
   * @param imagerInstance
   *
   * @constructor
   * @memberof ImagerJs.plugins
   */
  var Save = function SavePlugin(imagerInstance, options) {
    var _this = this;

    _this.imager = imagerInstance;

    _this.defaultOptions = {
      upload: false,
      uploadFunction: null
    };

    options = options ? options : {};
    _this.options = $.extend(true, _this.defaultOptions, options);
  };

  Save.prototype.getButtons = function () {
    var _this = this;

    return [{
      classes: 'btn-save',
      iconClasses: 'fa-save',
      tooltip: translations.t('Save'),
      enabledHandler: function (toolbar) {
        var contentConfig = _this.imager.options.contentConfig;
        var saveFunc = contentConfig ? contentConfig.saveImageData : null;

        if (_this.options.upload) {
          saveFunc = _this.options.uploadFunction;
        }

        if (!saveFunc) {
          console.error('No uploadFunction function provided in ' +
            'imager.options.contentConfig.saveImageData.');
        } else {
          saveFunc.call(
            _this.imager,
            _this.imager.$imageElement.attr('data-imager-id'),
            _this.imager.$imageElement.attr('src'),
            function (savedImageUrl) {
              _this.imager.stopEditing();
              // for uploaded images - change src to url returned from the server
              _this.imager.$imageElement.attr('src', savedImageUrl);
            }
          );
        }
      }
    }];
  };

  pluginsCatalog.Save = Save;

})(jQuery, ImagerJs.plugins, ImagerJs.util, ImagerJs.translations);

(function ($, pluginsCatalog, translations, Toolbar) {
  var ImagerToolbar = function ToolbarPlugin(imagerInstance, options) {
    var _this = this;
    _this.imager = imagerInstance;

    options = options || {};

    var defaultOptions = {
      tooltipEnabled: true,
      tooltipCss: null
    };

    if (_this.imager.touchDevice) {
      defaultOptions.tooltipEnabled = false;
    }

    _this.options = $.extend(defaultOptions, options);

    _this.activeButton = null;

    _this.weight = -100;
  };

  /**
   * This method will be invoked by Imager when edit mode is enabled.
   */
  ImagerToolbar.prototype.onEditStart = function () {
    var _this = this;

    _this.toolbar = new Toolbar(_this.options);
    _this.toolbar.getElement()
      .attr('data-sizeable', 'toolbar-button')
      .attr('data-cssrules', 'top:($v * -1)');

    var getButtonsResults = _this.imager.invokePluginsMethod('getButtons');

    for (var i = 0; i < getButtonsResults.length; i++) {
      var plugin = getButtonsResults[i].instance;
      var buttons = getButtonsResults[i].result;

      for (var b = 0; b < buttons.length; b++) {
        var btn = buttons[b];

        btn.plugin = plugin;

        var $button = null;
        if(btn.group === undefined) {
          $button = _this.toolbar.addButton(
            btn.classes, btn.iconClasses, btn.tooltip, _this.createHandler(btn)
          );
        } else {
          $button = _this.toolbar.addButtonToGroup(
            btn.classes, btn.iconClasses, btn.tooltip, btn.group, _this.createHandler(btn)
          );
        }

        if (btn.buttonCreatedHandler) {
          btn.buttonCreatedHandler($button);
        }
      }
    }

    _this.imager.$editContainer.append(_this.toolbar.getElement());
  };

  ImagerToolbar.prototype.onRemove = function () {
    if (this.toolbar) {
      this.toolbar.remove();
    }
  };

  ImagerToolbar.prototype.onEditStop = function () {
    if (this.toolbar) {
      this.toolbar.remove();
    }
  };

  ImagerToolbar.prototype.createHandler = function (btn) {
    var _this = this;

    return function () {
      if (_this.activeButton) {
        if (_this.activeButton.disabledHandler) {
          _this.activeButton.disabledHandler();
        }
      }

      _this.toolbar.clearActiveButton();

      btn.enabledHandler();

      if (btn.applyHandler && btn.rejectHandler) {
        _this.activeButton = btn;

        _this.imager.trigger('toolSelected', btn);

        _this.toolbar.setActiveButton(btn.classes);

        _this.toolbar.getElement().addClass('hidden');

        _this.createOperationToolbar(btn);
      }

      return false;
    };
  };

  ImagerToolbar.prototype.createOperationToolbar = function (btn) {
    var _this = this;

    _this.operationToolbar = new Toolbar(_this.options);

    _this.operationToolbar.addButton('btn-accept', 'fa-check',
      translations.t('Apply'),
      function applyOperationHandler() {
        btn.applyHandler();
        _this.operationButtonHandler();
        _this.imager.trigger('toolApply');
        return false;
      });

    _this.operationToolbar.addButton('btn-reject', 'fa-times',
      translations.t('Reject'),
      function rejectOperationHandler() {
        btn.rejectHandler();
        _this.operationButtonHandler();
        _this.imager.trigger('toolReject');
        return false;
      });

    _this.imager.$editContainer.append(_this.operationToolbar.getElement());
  };

  ImagerToolbar.prototype.operationButtonHandler = function () {
    this.activeButton = null;
    this.removeOperationToolbar();
    this.toolbar.getElement().removeClass('hidden');
    this.toolbar.clearActiveButton();
  };

  ImagerToolbar.prototype.removeOperationToolbar = function () {
    this.operationToolbar.remove();
    this.operationToolbar = null;
  };

  ImagerToolbar.prototype.getActiveButton = function () {
    return this.activeButton;
  };

  pluginsCatalog.Toolbar = ImagerToolbar;

})(jQuery, ImagerJs.plugins, ImagerJs.translations, window.Toolbar);
(function ($, pluginsCatalog, util, translations) {

  /**
   * Allows undoing actions on the image.
   *
   * @param imagerInstance
   *
   * @constructor
   * @memberof ImagerJs.plugins
   */
  var Undo = function UndoPlugin(imagerInstance, options) {
    var _this = this;

    _this.imager = imagerInstance;
    _this.$toolbarButton = null;

    options = options ? options : {};
    _this.options = $.extend(true, _this.defaultOptions, options);
  };

  Undo.prototype.getButtons = function () {
    var _this = this;

    return [{
      classes: 'btn-undo',
      iconClasses: 'fa-undo',
      tooltip: translations.t('Undo'),
      buttonCreatedHandler: function ($btn) {
        _this.$toolbarButton = $btn;
      },
      enabledHandler: function (toolbar) {
        _this.toolbar = toolbar;

        _this.imager.setWaiting(true);

        setTimeout(function () {
          _this.imager.historyUndo();
          _this.imager.setWaiting(false);
        }, 50);
      }
    }];
  };

  Undo.prototype.onHistoryChange = function () {
    if (this.imager.history.length > 1) {
      this.$toolbarButton.css({
        'pointer-events': 'all'
      });

      this.$toolbarButton.find('a').css('color', '#333');
    } else {
      this.$toolbarButton.css({
        'pointer-events': 'none'
      });

      this.$toolbarButton.find('a').css('color', '#C3C3C3');
    }
  };

  pluginsCatalog.Undo = Undo;

})(jQuery, ImagerJs.plugins, ImagerJs.util, ImagerJs.translations);

if (!RedactorPlugins) var RedactorPlugins = {};

(function ($, ImagerJs, QualitySelector, util, translations, Modal) {
  /**
   * Redactor plugin wrapper for ImagerJs that allows to use all ImagerJs
   * functionality inside redactor's editor.
   *
   * @constructor
   *
   * @memberof RedactorPlugins
   *
   * @param options {Object} ImagerJs Redactor options.
   * <br>
   * Options are splitted into two objects:
   * '<strong>preview</strong>' and '<strong>redactor</strong>'.
   * <br>
   * Those options are passed directly intp ImagerJs instance when its created.
   * <br>
   * '<strong>preview</strong>'
   * options will be passed only to ImagerJs on modal
   * window when selecting image.
   * <br>
   * '<strong>redactor</strong>' options will be
   * passed to ImagerJs when image is inside redactor editor.
   * <br>
   * Example options:
   * <br>
   * <code><pre>
   *  {
   *    preview: {
   *      quality: 0.9,
   *      targetScale: 0.5,
   *      plugins: ['Resize', 'Crop', 'Rotate', 'Toolbar']
   *    },
   *    redactor: {
   *      plugins: ['Resize', 'Crop', 'Rotate', 'Toolbar', 'Properties']
   *    }
   * }
   * </pre></code>
   *
   * @param options.hideFileSelection
   * If true, file selector will be hidden once file is selected.
   *
   * @returns {{init: Function, show: Function, insert: Function}}
   *
   */
  RedactorPlugins.ImagerJs = function (options) {
    var imagerInstance = null;

    var optionsInRedactor = {
      plugins: ['Toolbar'],
      pluginsConfig: {
        Resize: {
          doubleDiff: false
        },
        Delete: {
          fullRemove: true
        }
      }
    };

    var optionsPreview = {
      quality: 0.9,
      targetScale: 0.5,
      plugins: ['Toolbar'],
      pluginsConfig: {
        Resize: {
          doubleDiff: true
        }
      }
    };

    var updateImagersInRedactor = function (redactorInstance) {
      var $body = $('body');
      var $images = redactorInstance.$editor.find('.imager-preview-image');

      $images.each(function (k, img) {
        var imager = ImagerJs.Imager.getImagerFor(img);
        if (!imager) {
          imager = new ImagerJs.Imager(img, $.extend(optionsInRedactor, {}));
          imager.redactor = redactorInstance;

          imager.on('remove', function () {
            imager = null;
            redactorInstance.$editor.attr('contentEditable', 'true');
          });

          // observe historyChange event to know when something was changed in the image
          // and call redactor's sync function to persist those changes
          imager.on('historyChange', function () {
            redactorInstance.code.startSync();
          });

          var imagerId = imager.id;

          $(img).off('dragstart');

          $(img).off('click'); // disable redactor's default image handler
          $(img).off('click.imager' + imagerId);
          $(img).on('click.imager' + imagerId, function () {
            var imager = ImagerJs.Imager.getImagerFor(img);

            if (!imager) {
              return;
            }

            imager.startEditing();
            redactorInstance.$editor.attr('contentEditable', 'false');

            imager.$editContainer.on('keydown.imager', function (event) {
              if (event.which == 46 || event.which == 8) {
                event.preventDefault();
                event.stopPropagation();

                $body.off('mousedown.imager' + imagerId);

                imager.setWaiting(true);

                setTimeout(function () {
                  imager.remove(true);
                  imager = null;
                });

                redactorInstance.$editor.attr('contentEditable', 'true');

                return false;
              }
            });
          });

          $body.off('mousedown.imager' + imagerId);
          $body.on('mousedown.imager' + imagerId, function (event) {
            if (!imager) {
              // seems that imager was destroyed, destroy all event
              // handlers too
              $body.off('mousedown.imager' + imagerId);
              return;
            }

            if (!imager.isInEditMode()) {
              return;
            }

            if (img == event.target) {
              return;
            }

            if (!$(event.target).hasClass('imager-edit-container') &&
              $(event.target).parents('.imager-edit-container').length < 1 && !$(event.target).hasClass('.imager-click-stop') &&
              $(event.target).parents('.imager-click-stop').length < 1
            ) {

              var toolbarPlugin = imager.getPluginInstance('Toolbar');

              // do not cancel editing, user will be angry
              if (toolbarPlugin.getActiveButton() === null) {
                imager.$editContainer.off('keydown.imager');
                imager.stopEditing();
                redactorInstance.$editor.attr('contentEditable', 'true');
              }
            }
          });
        }

        // after drag&drop image is copied and replaced, we do not want that
        // new image, we want to restore original one
        if (!jQuery.contains(document.documentElement,
            imager.$imageElement[0])) {
          $(img).replaceWith(imager.$imageElement);
        }
      });
    };

    return {
      init: function () {
        var defaultOpts = {
          contentConfig: {}
        };

        this.opts.ImagerJs = $.extend(true, {}, defaultOpts, this.opts.ImagerJs);

        var _this = this;

        if (this.opts.ImagerJs && this.opts.ImagerJs.preview) {
          optionsPreview =
            $.extend(true, {}, optionsPreview, this.opts.ImagerJs.preview);
        }

        if (this.opts.ImagerJs && this.opts.ImagerJs.redactor) {
          optionsInRedactor =
            $.extend(true, {}, optionsInRedactor, this.opts.ImagerJs.redactor);
        }

        var button = this.button.addAfter('image', 'image-manager-pro',
          translations.t('Add image'));

        this.button.setAwesome('image-manager-pro', 'fa-picture-o');
        this.button.addCallback(button, this.ImagerJs.show);

        this.opts.syncBeforeCallback = function (html) {
          // clean image data from redactor's html here
          // this is needed because image data-urls are very long
          // and redactor fails to process it fast.
          // So on before sync callback we remove all images data from redactor,
          // and on aftersync we add it back. This is reasonably fast,
          // but can be slow for large images.
          var idAttr = 'data-imager-id="';
          var srcAttr = 'src="';

          var found = true;

          var iterationStartIndex = 0;

          var imgTagStartIndex = 0;
          var imgTagEndIndex = 0;

          var idStart = 0;
          var idEnd = 0;

          var dataAttrStartIndex = 0;
          var dataAttrEndIndex = 0;

          var imageString = '';
          var imageId = '';
          var imageData = '';

          var imageReplacement = '';
          var lastOffset = 0;

          var newHtmlWithoutDataUrls = '';

          while (found) {
            found = false;
            imageReplacement = '';

            imgTagStartIndex = html.indexOf('<img', lastOffset);

            if (imgTagStartIndex > -1) {
              imgTagEndIndex = html.indexOf('>', imgTagStartIndex);
              lastOffset = imgTagEndIndex;
              imageString = html.substr(imgTagStartIndex, (imgTagEndIndex - imgTagStartIndex) + 1);

              idStart = imageString.indexOf(idAttr);

              if (idStart > -1) {
                idStart += idAttr.length;
                idEnd = imageString.indexOf('"', idStart);
                imageId = imageString.substr(idStart, (idEnd - idStart));

                dataAttrStartIndex = imageString.indexOf(srcAttr);

                if (dataAttrStartIndex > -1) {
                  dataAttrStartIndex += srcAttr.length;
                  dataAttrEndIndex = imageString.indexOf('"', dataAttrStartIndex);

                  imageData = imageString.substr(dataAttrStartIndex, (dataAttrEndIndex - dataAttrStartIndex));

                  if (imageData.length > 0 &&
                    _this.opts.ImagerJs.contentConfig.saveImageData) {
                    var saveFunc =
                      _this.opts.ImagerJs.contentConfig.saveImageData;
                    if (saveFunc instanceof Function) {
                      saveFunc(imageId, imageData, function () {
                      });
                    } else {
                      console.log(
                        'contentConfig.saveImageData should be a Function'
                      );
                    }
                  }

                  imageReplacement = imageString.substr(0, dataAttrStartIndex) + imageString.substr(dataAttrEndIndex);
                }
                found = true;
              }

              imageId = '';
              imageData = '';

              // now add content between last iteration and image found in this iteration
              // and then add this iteration image after.
              newHtmlWithoutDataUrls += html
                  .substr(iterationStartIndex + 1, imgTagStartIndex - iterationStartIndex - 1)
                + imageReplacement;

              iterationStartIndex = lastOffset;
              //html = html.substr(0, imgTagStartIndex) + imageReplacement + html.substr(imgTagEndIndex + 1);
            } else {
              // if no image found - add all content beyond last index
              newHtmlWithoutDataUrls += html.substr(lastOffset + 1);
            }
          }

          return newHtmlWithoutDataUrls;
        };

        this.opts.syncCallback = function (html) {
          var $images = _this.$editor.find('.imager-preview-image');

          var imageData = '';

          for (var i = 0; i < $images.length; i++) {
            var imageId = $($images[i]).attr('data-imager-id');

            if (_this.opts.ImagerJs.contentConfig.loadImageData) {
              var loadFunc = _this.opts.ImagerJs.contentConfig.loadImageData;
              if (loadFunc instanceof Function) {
                imageData = loadFunc(imageId);
                $($images[i]).attr('src', imageData);
              } else {
                console.log('contentConfig.loadImageData should be a Function');
              }
            }
          }

          setTimeout(function () {
            updateImagersInRedactor(_this);
          }, 1);

          return html;
        };

        // setup drop handler
        this.$editor.on('drop.ImagerJs', function (e) {
          var files = e.originalEvent.dataTransfer.files;

          if (files.length < 1) {
            return;
          }

          var fileReader = new FileReader();

          fileReader.onload = function (onloadEvent) {
            _this.ImagerJs.show('image-manager-pro', fileReader.result);
          };

          fileReader.readAsDataURL(files[0]);
        });
      },
      show: function (name, imageData) {
        var _this = this;

        var modal = new Modal();
        var $modalView = $('<section id="imager-open"></section>');

        var fileSelectedHandler = function (file) {
          if (imagerInstance) {
            imagerInstance.restoreOriginal();
            imagerInstance.remove();
            imagerInstance = null;
          }

          var handleImageLoaded = function () {
            $preview.find('.imager-preview-image').off('load.Imager');

            qualitySelector.show();

            imagerInstance = new ImagerJs.Imager($preview.find('img'),
              optionsPreview);
            imagerInstance.redactor = _this;

            imagerInstance.on('ready', function () {
              imagerInstance.startEditing();
              imagerInstance.setZindex(2006);

              qualitySelector.imager = imagerInstance;

              qualitySelector.val(null);
              qualitySelector.update();

              util.stopWaiting($preview);
              modal.fixPosition();
            });
          };

          $preview.find('.imager-preview-image').on('load.Imager', handleImageLoaded);

          util.setWaiting($preview, translations.t('Please wait...'),
            _this.opts.ImagerJs.preview.waitingCursor);

          setTimeout(function () {
            if (_this.opts.ImagerJs.hideFileSelection) {
              fileSelector.hide();
            }

            $preview.find('.imager-preview-image')
              .attr('src', file.data)
              .css({
                'width': '400px',
                'height': 'auto',
                'left': '0',
                'top': '0'
              });
          }, 1);
        };

        // ---- File selector ----

        var fileSelector = new ImagerJs.util.FileSelector('image/*');
        $modalView.append(fileSelector.getElement());
        fileSelector.onFileSelected(fileSelectedHandler);
        // ---- /File selector ----

        // ---- Image preview ----
        var $preview = $('<div class="imager-preview">' +
          '<img class="imager-preview-image">' +
          '</div>');

        $modalView.append($preview);
        // ---- /Image preview ----

        var qualitySelector = new QualitySelector(imagerInstance, this.opts.ImagerJs.quality);
        $modalView.append(qualitySelector.getElement());

        modal.addClass('under-edit-box');
        modal.setTemplate($modalView);
        modal.setTitle(translations.t('Add image'));

        modal.addCancelButton(translations.t('Cancel'), function () {
          if (imagerInstance) {
            imagerInstance.remove();
            imagerInstance = undefined;
          }
        });

        modal.addActionButton(translations.t('Insert'), function () {
          if (!imagerInstance) {
            return false;
          }

          util.setWaiting(modal.$modal, translations.t('Please wait...'),
            _this.opts.ImagerJs.preview.waitingCursor);

          imagerInstance.setWaiting(true);

          setTimeout(function () {
            imagerInstance.remove();
            imagerInstance = undefined;

            var $img = $modalView.find('img.imager-preview-image').clone();

            $modalView.remove();
            $modalView = undefined;

            _this.ImagerJs.insert($img);

            modal.hide();
            setTimeout(function () {
              modal.remove();
              modal = null;
            }, 100);
          }, 0);

          return false;
        });

        modal.show();

        this.selection.save();

        if (imageData) {
          fileSelectedHandler({data: imageData});
        }
      },
      insert: function ($image) {

        var _this = this;

        _this.selection.restore();
        _this.insert.node($image[0]);

        // after image is inserted into
        _this.code.startSync();
      }
    };
  };
})(jQuery, ImagerJs, window.ImagerQualitySelector, ImagerJs.util, ImagerJs.translations, Modal);
