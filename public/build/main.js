(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // live-reload.js
  var init_live_reload = __esm({
    "live-reload.js"() {
      try {
        if (!window.live_reload_enabled) {
          window.live_reload_enabled = true;
          const url = `http://localhost:8989/esbuild`;
          new EventSource(url).addEventListener("change", () => {
            document.body.innerHTML = "<h1>RELOADING<h1>";
            location.reload();
          });
          console.log("live reload enabled: ", url);
        }
      } catch (error) {
        console.error("live reload failed", error);
      }
    }
  });

  // node_modules/piexifjs/piexif.js
  var require_piexif = __commonJS({
    "node_modules/piexifjs/piexif.js"(exports, module) {
      init_live_reload();
      (function() {
        "use strict";
        var that = {};
        that.version = "1.0.4";
        that.remove = function(jpeg) {
          var b64 = false;
          if (jpeg.slice(0, 2) == "\xFF\xD8") {
          } else if (jpeg.slice(0, 23) == "data:image/jpeg;base64," || jpeg.slice(0, 22) == "data:image/jpg;base64,") {
            jpeg = atob(jpeg.split(",")[1]);
            b64 = true;
          } else {
            throw new Error("Given data is not jpeg.");
          }
          var segments = splitIntoSegments(jpeg);
          var newSegments = segments.filter(function(seg) {
            return !(seg.slice(0, 2) == "\xFF\xE1" && seg.slice(4, 10) == "Exif\0\0");
          });
          var new_data = newSegments.join("");
          if (b64) {
            new_data = "data:image/jpeg;base64," + btoa(new_data);
          }
          return new_data;
        };
        that.insert = function(exif, jpeg) {
          var b64 = false;
          if (exif.slice(0, 6) != "Exif\0\0") {
            throw new Error("Given data is not exif.");
          }
          if (jpeg.slice(0, 2) == "\xFF\xD8") {
          } else if (jpeg.slice(0, 23) == "data:image/jpeg;base64," || jpeg.slice(0, 22) == "data:image/jpg;base64,") {
            jpeg = atob(jpeg.split(",")[1]);
            b64 = true;
          } else {
            throw new Error("Given data is not jpeg.");
          }
          var exifStr = "\xFF\xE1" + pack(">H", [exif.length + 2]) + exif;
          var segments = splitIntoSegments(jpeg);
          var new_data = mergeSegments(segments, exifStr);
          if (b64) {
            new_data = "data:image/jpeg;base64," + btoa(new_data);
          }
          return new_data;
        };
        that.load = function(data) {
          var input_data;
          if (typeof data == "string") {
            if (data.slice(0, 2) == "\xFF\xD8") {
              input_data = data;
            } else if (data.slice(0, 23) == "data:image/jpeg;base64," || data.slice(0, 22) == "data:image/jpg;base64,") {
              input_data = atob(data.split(",")[1]);
            } else if (data.slice(0, 4) == "Exif") {
              input_data = data.slice(6);
            } else {
              throw new Error("'load' gots invalid file data.");
            }
          } else {
            throw new Error("'load' gots invalid type argument.");
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
          if (exifReader.tiftag.slice(0, 2) == "II") {
            exifReader.endian_mark = "<";
          } else {
            exifReader.endian_mark = ">";
          }
          var pointer = unpack(
            exifReader.endian_mark + "L",
            exifReader.tiftag.slice(4, 8)
          )[0];
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
          if (first_ifd_pointer != "\0\0\0\0") {
            pointer = unpack(
              exifReader.endian_mark + "L",
              first_ifd_pointer
            )[0];
            exif_dict["1st"] = exifReader.get_ifd(pointer, "1st");
            if (513 in exif_dict["1st"] && 514 in exif_dict["1st"]) {
              var end = exif_dict["1st"][513] + exif_dict["1st"][514];
              var thumb = exifReader.tiftag.slice(exif_dict["1st"][513], end);
              exif_dict["thumbnail"] = thumb;
            }
          }
          return exif_dict;
        };
        that.dump = function(exif_dict_original) {
          var TIFF_HEADER_LENGTH = 8;
          var exif_dict = copy(exif_dict_original);
          var header = "Exif\0\0MM\0*\0\0\0\b";
          var exif_is = false;
          var gps_is = false;
          var interop_is = false;
          var first_is = false;
          var zeroth_ifd, exif_ifd, interop_ifd, gps_ifd, first_ifd;
          if ("0th" in exif_dict) {
            zeroth_ifd = exif_dict["0th"];
          } else {
            zeroth_ifd = {};
          }
          if ("Exif" in exif_dict && Object.keys(exif_dict["Exif"]).length || "Interop" in exif_dict && Object.keys(exif_dict["Interop"]).length) {
            zeroth_ifd[34665] = 1;
            exif_is = true;
            exif_ifd = exif_dict["Exif"];
            if ("Interop" in exif_dict && Object.keys(exif_dict["Interop"]).length) {
              exif_ifd[40965] = 1;
              interop_is = true;
              interop_ifd = exif_dict["Interop"];
            } else if (Object.keys(exif_ifd).indexOf(that.ExifIFD.InteroperabilityTag.toString()) > -1) {
              delete exif_ifd[40965];
            }
          } else if (Object.keys(zeroth_ifd).indexOf(that.ImageIFD.ExifTag.toString()) > -1) {
            delete zeroth_ifd[34665];
          }
          if ("GPS" in exif_dict && Object.keys(exif_dict["GPS"]).length) {
            zeroth_ifd[that.ImageIFD.GPSTag] = 1;
            gps_is = true;
            gps_ifd = exif_dict["GPS"];
          } else if (Object.keys(zeroth_ifd).indexOf(that.ImageIFD.GPSTag.toString()) > -1) {
            delete zeroth_ifd[that.ImageIFD.GPSTag];
          }
          if ("1st" in exif_dict && "thumbnail" in exif_dict && exif_dict["thumbnail"] != null) {
            first_is = true;
            exif_dict["1st"][513] = 1;
            exif_dict["1st"][514] = 1;
            first_ifd = exif_dict["1st"];
          }
          var zeroth_set = _dict_to_bytes(zeroth_ifd, "0th", 0);
          var zeroth_length = zeroth_set[0].length + exif_is * 12 + gps_is * 12 + 4 + zeroth_set[1].length;
          var exif_set, exif_bytes = "", exif_length = 0, gps_set, gps_bytes = "", gps_length = 0, interop_set, interop_bytes = "", interop_length = 0, first_set, first_bytes = "", thumbnail;
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
            if (thumbnail.length > 64e3) {
              throw new Error("Given thumbnail is too large. max 64kB");
            }
          }
          var exif_pointer = "", gps_pointer = "", interop_pointer = "", first_ifd_pointer = "\0\0\0\0";
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
            var pointer_value = TIFF_HEADER_LENGTH + zeroth_length + exif_length + gps_length;
            var pointer_str = pack(">L", [pointer_value]);
            var key = 40965;
            var key_str = pack(">H", [key]);
            var type_str = pack(">H", [TYPES["Long"]]);
            var length_str = pack(">L", [1]);
            interop_pointer = key_str + type_str + length_str + pointer_str;
          }
          if (first_is) {
            var pointer_value = TIFF_HEADER_LENGTH + zeroth_length + exif_length + gps_length + interop_length;
            first_ifd_pointer = pack(">L", [pointer_value]);
            var thumbnail_pointer = pointer_value + first_set[0].length + 24 + 4 + first_set[1].length;
            var thumbnail_p_bytes = "\0\0\0\0" + pack(">L", [thumbnail_pointer]);
            var thumbnail_length_bytes = "\0\0\0\0" + pack(">L", [thumbnail.length]);
            first_bytes = first_set[0] + thumbnail_p_bytes + thumbnail_length_bytes + "\0\0\0\0" + first_set[1] + thumbnail;
          }
          var zeroth_bytes = zeroth_set[0] + exif_pointer + gps_pointer + first_ifd_pointer + zeroth_set[1];
          if (exif_is) {
            exif_bytes = exif_set[0] + interop_pointer + exif_set[1];
          }
          return header + zeroth_bytes + exif_bytes + gps_bytes + interop_bytes + first_bytes;
        };
        function copy(obj) {
          return JSON.parse(JSON.stringify(obj));
        }
        function _get_thumbnail(jpeg) {
          var segments = splitIntoSegments(jpeg);
          while ("\xFF\xE0" <= segments[1].slice(0, 2) && segments[1].slice(0, 2) <= "\xFF\xEF") {
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
          var length, new_value, num, den;
          if (value_type == "Byte") {
            length = raw_value.length;
            if (length <= 4) {
              value_str = _pack_byte(raw_value) + nStr("\0", 4 - length);
            } else {
              value_str = pack(">L", [offset]);
              four_bytes_over = _pack_byte(raw_value);
            }
          } else if (value_type == "Short") {
            length = raw_value.length;
            if (length <= 2) {
              value_str = _pack_short(raw_value) + nStr("\0\0", 2 - length);
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
            new_value = raw_value + "\0";
            length = new_value.length;
            if (length > 4) {
              value_str = pack(">L", [offset]);
              four_bytes_over = new_value;
            } else {
              value_str = new_value + nStr("\0", 4 - length);
            }
          } else if (value_type == "Rational") {
            if (typeof raw_value[0] == "number") {
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
                new_value += pack(">L", [num]) + pack(">L", [den]);
              }
            }
            value_str = pack(">L", [offset]);
            four_bytes_over = new_value;
          } else if (value_type == "SRational") {
            if (typeof raw_value[0] == "number") {
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
                new_value += pack(">l", [num]) + pack(">l", [den]);
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
              value_str = raw_value + nStr("\0", 4 - length);
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
            if (typeof key == "string") {
              key = parseInt(key);
            }
            if (ifd == "0th" && [34665, 34853].indexOf(key) > -1) {
              continue;
            } else if (ifd == "Exif" && key == 40965) {
              continue;
            } else if (ifd == "1st" && [513, 514].indexOf(key) > -1) {
              continue;
            }
            var raw_value = ifd_dict[key];
            var key_str = pack(">H", [key]);
            var value_type = TAGS[ifd][key]["type"];
            var type_str = pack(">H", [TYPES[value_type]]);
            if (typeof raw_value == "number") {
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
          var segments, app1;
          if (data.slice(0, 2) == "\xFF\xD8") {
            segments = splitIntoSegments(data);
            app1 = getExifSeg(segments);
            if (app1) {
              this.tiftag = app1.slice(10);
            } else {
              this.tiftag = null;
            }
          } else if (["II", "MM"].indexOf(data.slice(0, 2)) > -1) {
            this.tiftag = data;
          } else if (data.slice(0, 4) == "Exif") {
            this.tiftag = data.slice(6);
          } else {
            throw new Error("Given file is neither JPEG nor TIFF.");
          }
        }
        ExifReader.prototype = {
          get_ifd: function(pointer, ifd_name) {
            var ifd_dict = {};
            var tag_count = unpack(
              this.endian_mark + "H",
              this.tiftag.slice(pointer, pointer + 2)
            )[0];
            var offset = pointer + 2;
            var t;
            if (["0th", "1st"].indexOf(ifd_name) > -1) {
              t = "Image";
            } else {
              t = ifd_name;
            }
            for (var x = 0; x < tag_count; x++) {
              pointer = offset + 12 * x;
              var tag = unpack(
                this.endian_mark + "H",
                this.tiftag.slice(pointer, pointer + 2)
              )[0];
              var value_type = unpack(
                this.endian_mark + "H",
                this.tiftag.slice(pointer + 2, pointer + 4)
              )[0];
              var value_num = unpack(
                this.endian_mark + "L",
                this.tiftag.slice(pointer + 4, pointer + 8)
              )[0];
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
          convert_value: function(val) {
            var data = null;
            var t = val[0];
            var length = val[1];
            var value = val[2];
            var pointer;
            if (t == 1) {
              if (length > 4) {
                pointer = unpack(this.endian_mark + "L", value)[0];
                data = unpack(
                  this.endian_mark + nStr("B", length),
                  this.tiftag.slice(pointer, pointer + length)
                );
              } else {
                data = unpack(this.endian_mark + nStr("B", length), value.slice(0, length));
              }
            } else if (t == 2) {
              if (length > 4) {
                pointer = unpack(this.endian_mark + "L", value)[0];
                data = this.tiftag.slice(pointer, pointer + length - 1);
              } else {
                data = value.slice(0, length - 1);
              }
            } else if (t == 3) {
              if (length > 2) {
                pointer = unpack(this.endian_mark + "L", value)[0];
                data = unpack(
                  this.endian_mark + nStr("H", length),
                  this.tiftag.slice(pointer, pointer + length * 2)
                );
              } else {
                data = unpack(
                  this.endian_mark + nStr("H", length),
                  value.slice(0, length * 2)
                );
              }
            } else if (t == 4) {
              if (length > 1) {
                pointer = unpack(this.endian_mark + "L", value)[0];
                data = unpack(
                  this.endian_mark + nStr("L", length),
                  this.tiftag.slice(pointer, pointer + length * 4)
                );
              } else {
                data = unpack(
                  this.endian_mark + nStr("L", length),
                  value
                );
              }
            } else if (t == 5) {
              pointer = unpack(this.endian_mark + "L", value)[0];
              if (length > 1) {
                data = [];
                for (var x = 0; x < length; x++) {
                  data.push([
                    unpack(
                      this.endian_mark + "L",
                      this.tiftag.slice(pointer + x * 8, pointer + 4 + x * 8)
                    )[0],
                    unpack(
                      this.endian_mark + "L",
                      this.tiftag.slice(pointer + 4 + x * 8, pointer + 8 + x * 8)
                    )[0]
                  ]);
                }
              } else {
                data = [
                  unpack(
                    this.endian_mark + "L",
                    this.tiftag.slice(pointer, pointer + 4)
                  )[0],
                  unpack(
                    this.endian_mark + "L",
                    this.tiftag.slice(pointer + 4, pointer + 8)
                  )[0]
                ];
              }
            } else if (t == 7) {
              if (length > 4) {
                pointer = unpack(this.endian_mark + "L", value)[0];
                data = this.tiftag.slice(pointer, pointer + length);
              } else {
                data = value.slice(0, length);
              }
            } else if (t == 9) {
              if (length > 1) {
                pointer = unpack(this.endian_mark + "L", value)[0];
                data = unpack(
                  this.endian_mark + nStr("l", length),
                  this.tiftag.slice(pointer, pointer + length * 4)
                );
              } else {
                data = unpack(
                  this.endian_mark + nStr("l", length),
                  value
                );
              }
            } else if (t == 10) {
              pointer = unpack(this.endian_mark + "L", value)[0];
              if (length > 1) {
                data = [];
                for (var x = 0; x < length; x++) {
                  data.push([
                    unpack(
                      this.endian_mark + "l",
                      this.tiftag.slice(pointer + x * 8, pointer + 4 + x * 8)
                    )[0],
                    unpack(
                      this.endian_mark + "l",
                      this.tiftag.slice(pointer + 4 + x * 8, pointer + 8 + x * 8)
                    )[0]
                  ]);
                }
              } else {
                data = [
                  unpack(
                    this.endian_mark + "l",
                    this.tiftag.slice(pointer, pointer + 4)
                  )[0],
                  unpack(
                    this.endian_mark + "l",
                    this.tiftag.slice(pointer + 4, pointer + 8)
                  )[0]
                ];
              }
            } else {
              throw new Error("Exif might be wrong. Got incorrect value type to decode. type:" + t);
            }
            if (data instanceof Array && data.length == 1) {
              return data[0];
            } else {
              return data;
            }
          }
        };
        if (typeof window !== "undefined" && typeof window.btoa === "function") {
          var btoa = window.btoa;
        }
        if (typeof btoa === "undefined") {
          var btoa = function(input) {
            var output = "";
            var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
            var i = 0;
            var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
            while (i < input.length) {
              chr1 = input.charCodeAt(i++);
              chr2 = input.charCodeAt(i++);
              chr3 = input.charCodeAt(i++);
              enc1 = chr1 >> 2;
              enc2 = (chr1 & 3) << 4 | chr2 >> 4;
              enc3 = (chr2 & 15) << 2 | chr3 >> 6;
              enc4 = chr3 & 63;
              if (isNaN(chr2)) {
                enc3 = enc4 = 64;
              } else if (isNaN(chr3)) {
                enc4 = 64;
              }
              output = output + keyStr.charAt(enc1) + keyStr.charAt(enc2) + keyStr.charAt(enc3) + keyStr.charAt(enc4);
            }
            return output;
          };
        }
        if (typeof window !== "undefined" && typeof window.atob === "function") {
          var atob = window.atob;
        }
        if (typeof atob === "undefined") {
          var atob = function(input) {
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
              chr1 = enc1 << 2 | enc2 >> 4;
              chr2 = (enc2 & 15) << 4 | enc3 >> 2;
              chr3 = (enc3 & 3) << 6 | enc4;
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
          var seg, width, height, SOF = [192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207];
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
            throw new Error("'pack' error. Got invalid type argument.");
          }
          if (mark.length - 1 != array.length) {
            throw new Error("'pack' error. " + (mark.length - 1) + " marks, " + array.length + " elements.");
          }
          var littleEndian;
          if (mark[0] == "<") {
            littleEndian = true;
          } else if (mark[0] == ">") {
            littleEndian = false;
          } else {
            throw new Error("");
          }
          var packed = "";
          var p = 1;
          var val = null;
          var c = null;
          var valStr = null;
          while (c = mark[p]) {
            if (c.toLowerCase() == "b") {
              val = array[p - 1];
              if (c == "b" && val < 0) {
                val += 256;
              }
              if (val > 255 || val < 0) {
                throw new Error("'pack' error.");
              } else {
                valStr = String.fromCharCode(val);
              }
            } else if (c == "H") {
              val = array[p - 1];
              if (val > 65535 || val < 0) {
                throw new Error("'pack' error.");
              } else {
                valStr = String.fromCharCode(Math.floor(val % 65536 / 256)) + String.fromCharCode(val % 256);
                if (littleEndian) {
                  valStr = valStr.split("").reverse().join("");
                }
              }
            } else if (c.toLowerCase() == "l") {
              val = array[p - 1];
              if (c == "l" && val < 0) {
                val += 4294967296;
              }
              if (val > 4294967295 || val < 0) {
                throw new Error("'pack' error.");
              } else {
                valStr = String.fromCharCode(Math.floor(val / 16777216)) + String.fromCharCode(Math.floor(val % 16777216 / 65536)) + String.fromCharCode(Math.floor(val % 65536 / 256)) + String.fromCharCode(val % 256);
                if (littleEndian) {
                  valStr = valStr.split("").reverse().join("");
                }
              }
            } else {
              throw new Error("'pack' error.");
            }
            packed += valStr;
            p += 1;
          }
          return packed;
        }
        function unpack(mark, str) {
          if (typeof str != "string") {
            throw new Error("'unpack' error. Got invalid type argument.");
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
              throw new Error("'unpack' error. Got invalid mark.");
            }
          }
          if (l != str.length) {
            throw new Error("'unpack' error. Mismatch between symbol and string length. " + l + ":" + str.length);
          }
          var littleEndian;
          if (mark[0] == "<") {
            littleEndian = true;
          } else if (mark[0] == ">") {
            littleEndian = false;
          } else {
            throw new Error("'unpack' error.");
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
              if (c == "b" && val >= 128) {
                val -= 256;
              }
            } else if (c == "H") {
              length = 2;
              sliced = str.slice(strPointer, strPointer + length);
              if (littleEndian) {
                sliced = sliced.split("").reverse().join("");
              }
              val = sliced.charCodeAt(0) * 256 + sliced.charCodeAt(1);
            } else if (c.toLowerCase() == "l") {
              length = 4;
              sliced = str.slice(strPointer, strPointer + length);
              if (littleEndian) {
                sliced = sliced.split("").reverse().join("");
              }
              val = sliced.charCodeAt(0) * 16777216 + sliced.charCodeAt(1) * 65536 + sliced.charCodeAt(2) * 256 + sliced.charCodeAt(3);
              if (c == "l" && val >= 2147483648) {
                val -= 4294967296;
              }
            } else {
              throw new Error("'unpack' error. " + c);
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
          if (data.slice(0, 2) != "\xFF\xD8") {
            throw new Error("Given data isn't JPEG.");
          }
          var head = 2;
          var segments = ["\xFF\xD8"];
          while (true) {
            if (data.slice(head, head + 2) == "\xFF\xDA") {
              segments.push(data.slice(head));
              break;
            } else {
              var length = unpack(">H", data.slice(head + 2, head + 4))[0];
              var endPoint = head + length + 2;
              segments.push(data.slice(head, endPoint));
              head = endPoint;
            }
            if (head >= data.length) {
              throw new Error("Wrong JPEG data.");
            }
          }
          return segments;
        }
        function getExifSeg(segments) {
          var seg;
          for (var i = 0; i < segments.length; i++) {
            seg = segments[i];
            if (seg.slice(0, 2) == "\xFF\xE1" && seg.slice(4, 10) == "Exif\0\0") {
              return seg;
            }
          }
          return null;
        }
        function mergeSegments(segments, exif) {
          var hasExifSegment = false;
          var additionalAPP1ExifSegments = [];
          segments.forEach(function(segment, i) {
            if (segment.slice(0, 2) == "\xFF\xE1" && segment.slice(4, 10) == "Exif\0\0") {
              if (!hasExifSegment) {
                segments[i] = exif;
                hasExifSegment = true;
              } else {
                additionalAPP1ExifSegments.unshift(i);
              }
            }
          });
          additionalAPP1ExifSegments.forEach(function(segmentIndex) {
            segments.splice(segmentIndex, 1);
          });
          if (!hasExifSegment && exif) {
            segments = [segments[0], exif].concat(segments.slice(1));
          }
          return segments.join("");
        }
        function toHex(str) {
          var hexStr = "";
          for (var i = 0; i < str.length; i++) {
            var h = str.charCodeAt(i);
            var hex = (h < 10 ? "0" : "") + h.toString(16);
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
          "Image": {
            11: {
              "name": "ProcessingSoftware",
              "type": "Ascii"
            },
            254: {
              "name": "NewSubfileType",
              "type": "Long"
            },
            255: {
              "name": "SubfileType",
              "type": "Short"
            },
            256: {
              "name": "ImageWidth",
              "type": "Long"
            },
            257: {
              "name": "ImageLength",
              "type": "Long"
            },
            258: {
              "name": "BitsPerSample",
              "type": "Short"
            },
            259: {
              "name": "Compression",
              "type": "Short"
            },
            262: {
              "name": "PhotometricInterpretation",
              "type": "Short"
            },
            263: {
              "name": "Threshholding",
              "type": "Short"
            },
            264: {
              "name": "CellWidth",
              "type": "Short"
            },
            265: {
              "name": "CellLength",
              "type": "Short"
            },
            266: {
              "name": "FillOrder",
              "type": "Short"
            },
            269: {
              "name": "DocumentName",
              "type": "Ascii"
            },
            270: {
              "name": "ImageDescription",
              "type": "Ascii"
            },
            271: {
              "name": "Make",
              "type": "Ascii"
            },
            272: {
              "name": "Model",
              "type": "Ascii"
            },
            273: {
              "name": "StripOffsets",
              "type": "Long"
            },
            274: {
              "name": "Orientation",
              "type": "Short"
            },
            277: {
              "name": "SamplesPerPixel",
              "type": "Short"
            },
            278: {
              "name": "RowsPerStrip",
              "type": "Long"
            },
            279: {
              "name": "StripByteCounts",
              "type": "Long"
            },
            282: {
              "name": "XResolution",
              "type": "Rational"
            },
            283: {
              "name": "YResolution",
              "type": "Rational"
            },
            284: {
              "name": "PlanarConfiguration",
              "type": "Short"
            },
            290: {
              "name": "GrayResponseUnit",
              "type": "Short"
            },
            291: {
              "name": "GrayResponseCurve",
              "type": "Short"
            },
            292: {
              "name": "T4Options",
              "type": "Long"
            },
            293: {
              "name": "T6Options",
              "type": "Long"
            },
            296: {
              "name": "ResolutionUnit",
              "type": "Short"
            },
            301: {
              "name": "TransferFunction",
              "type": "Short"
            },
            305: {
              "name": "Software",
              "type": "Ascii"
            },
            306: {
              "name": "DateTime",
              "type": "Ascii"
            },
            315: {
              "name": "Artist",
              "type": "Ascii"
            },
            316: {
              "name": "HostComputer",
              "type": "Ascii"
            },
            317: {
              "name": "Predictor",
              "type": "Short"
            },
            318: {
              "name": "WhitePoint",
              "type": "Rational"
            },
            319: {
              "name": "PrimaryChromaticities",
              "type": "Rational"
            },
            320: {
              "name": "ColorMap",
              "type": "Short"
            },
            321: {
              "name": "HalftoneHints",
              "type": "Short"
            },
            322: {
              "name": "TileWidth",
              "type": "Short"
            },
            323: {
              "name": "TileLength",
              "type": "Short"
            },
            324: {
              "name": "TileOffsets",
              "type": "Short"
            },
            325: {
              "name": "TileByteCounts",
              "type": "Short"
            },
            330: {
              "name": "SubIFDs",
              "type": "Long"
            },
            332: {
              "name": "InkSet",
              "type": "Short"
            },
            333: {
              "name": "InkNames",
              "type": "Ascii"
            },
            334: {
              "name": "NumberOfInks",
              "type": "Short"
            },
            336: {
              "name": "DotRange",
              "type": "Byte"
            },
            337: {
              "name": "TargetPrinter",
              "type": "Ascii"
            },
            338: {
              "name": "ExtraSamples",
              "type": "Short"
            },
            339: {
              "name": "SampleFormat",
              "type": "Short"
            },
            340: {
              "name": "SMinSampleValue",
              "type": "Short"
            },
            341: {
              "name": "SMaxSampleValue",
              "type": "Short"
            },
            342: {
              "name": "TransferRange",
              "type": "Short"
            },
            343: {
              "name": "ClipPath",
              "type": "Byte"
            },
            344: {
              "name": "XClipPathUnits",
              "type": "Long"
            },
            345: {
              "name": "YClipPathUnits",
              "type": "Long"
            },
            346: {
              "name": "Indexed",
              "type": "Short"
            },
            347: {
              "name": "JPEGTables",
              "type": "Undefined"
            },
            351: {
              "name": "OPIProxy",
              "type": "Short"
            },
            512: {
              "name": "JPEGProc",
              "type": "Long"
            },
            513: {
              "name": "JPEGInterchangeFormat",
              "type": "Long"
            },
            514: {
              "name": "JPEGInterchangeFormatLength",
              "type": "Long"
            },
            515: {
              "name": "JPEGRestartInterval",
              "type": "Short"
            },
            517: {
              "name": "JPEGLosslessPredictors",
              "type": "Short"
            },
            518: {
              "name": "JPEGPointTransforms",
              "type": "Short"
            },
            519: {
              "name": "JPEGQTables",
              "type": "Long"
            },
            520: {
              "name": "JPEGDCTables",
              "type": "Long"
            },
            521: {
              "name": "JPEGACTables",
              "type": "Long"
            },
            529: {
              "name": "YCbCrCoefficients",
              "type": "Rational"
            },
            530: {
              "name": "YCbCrSubSampling",
              "type": "Short"
            },
            531: {
              "name": "YCbCrPositioning",
              "type": "Short"
            },
            532: {
              "name": "ReferenceBlackWhite",
              "type": "Rational"
            },
            700: {
              "name": "XMLPacket",
              "type": "Byte"
            },
            18246: {
              "name": "Rating",
              "type": "Short"
            },
            18249: {
              "name": "RatingPercent",
              "type": "Short"
            },
            32781: {
              "name": "ImageID",
              "type": "Ascii"
            },
            33421: {
              "name": "CFARepeatPatternDim",
              "type": "Short"
            },
            33422: {
              "name": "CFAPattern",
              "type": "Byte"
            },
            33423: {
              "name": "BatteryLevel",
              "type": "Rational"
            },
            33432: {
              "name": "Copyright",
              "type": "Ascii"
            },
            33434: {
              "name": "ExposureTime",
              "type": "Rational"
            },
            34377: {
              "name": "ImageResources",
              "type": "Byte"
            },
            34665: {
              "name": "ExifTag",
              "type": "Long"
            },
            34675: {
              "name": "InterColorProfile",
              "type": "Undefined"
            },
            34853: {
              "name": "GPSTag",
              "type": "Long"
            },
            34857: {
              "name": "Interlace",
              "type": "Short"
            },
            34858: {
              "name": "TimeZoneOffset",
              "type": "Long"
            },
            34859: {
              "name": "SelfTimerMode",
              "type": "Short"
            },
            37387: {
              "name": "FlashEnergy",
              "type": "Rational"
            },
            37388: {
              "name": "SpatialFrequencyResponse",
              "type": "Undefined"
            },
            37389: {
              "name": "Noise",
              "type": "Undefined"
            },
            37390: {
              "name": "FocalPlaneXResolution",
              "type": "Rational"
            },
            37391: {
              "name": "FocalPlaneYResolution",
              "type": "Rational"
            },
            37392: {
              "name": "FocalPlaneResolutionUnit",
              "type": "Short"
            },
            37393: {
              "name": "ImageNumber",
              "type": "Long"
            },
            37394: {
              "name": "SecurityClassification",
              "type": "Ascii"
            },
            37395: {
              "name": "ImageHistory",
              "type": "Ascii"
            },
            37397: {
              "name": "ExposureIndex",
              "type": "Rational"
            },
            37398: {
              "name": "TIFFEPStandardID",
              "type": "Byte"
            },
            37399: {
              "name": "SensingMethod",
              "type": "Short"
            },
            40091: {
              "name": "XPTitle",
              "type": "Byte"
            },
            40092: {
              "name": "XPComment",
              "type": "Byte"
            },
            40093: {
              "name": "XPAuthor",
              "type": "Byte"
            },
            40094: {
              "name": "XPKeywords",
              "type": "Byte"
            },
            40095: {
              "name": "XPSubject",
              "type": "Byte"
            },
            50341: {
              "name": "PrintImageMatching",
              "type": "Undefined"
            },
            50706: {
              "name": "DNGVersion",
              "type": "Byte"
            },
            50707: {
              "name": "DNGBackwardVersion",
              "type": "Byte"
            },
            50708: {
              "name": "UniqueCameraModel",
              "type": "Ascii"
            },
            50709: {
              "name": "LocalizedCameraModel",
              "type": "Byte"
            },
            50710: {
              "name": "CFAPlaneColor",
              "type": "Byte"
            },
            50711: {
              "name": "CFALayout",
              "type": "Short"
            },
            50712: {
              "name": "LinearizationTable",
              "type": "Short"
            },
            50713: {
              "name": "BlackLevelRepeatDim",
              "type": "Short"
            },
            50714: {
              "name": "BlackLevel",
              "type": "Rational"
            },
            50715: {
              "name": "BlackLevelDeltaH",
              "type": "SRational"
            },
            50716: {
              "name": "BlackLevelDeltaV",
              "type": "SRational"
            },
            50717: {
              "name": "WhiteLevel",
              "type": "Short"
            },
            50718: {
              "name": "DefaultScale",
              "type": "Rational"
            },
            50719: {
              "name": "DefaultCropOrigin",
              "type": "Short"
            },
            50720: {
              "name": "DefaultCropSize",
              "type": "Short"
            },
            50721: {
              "name": "ColorMatrix1",
              "type": "SRational"
            },
            50722: {
              "name": "ColorMatrix2",
              "type": "SRational"
            },
            50723: {
              "name": "CameraCalibration1",
              "type": "SRational"
            },
            50724: {
              "name": "CameraCalibration2",
              "type": "SRational"
            },
            50725: {
              "name": "ReductionMatrix1",
              "type": "SRational"
            },
            50726: {
              "name": "ReductionMatrix2",
              "type": "SRational"
            },
            50727: {
              "name": "AnalogBalance",
              "type": "Rational"
            },
            50728: {
              "name": "AsShotNeutral",
              "type": "Short"
            },
            50729: {
              "name": "AsShotWhiteXY",
              "type": "Rational"
            },
            50730: {
              "name": "BaselineExposure",
              "type": "SRational"
            },
            50731: {
              "name": "BaselineNoise",
              "type": "Rational"
            },
            50732: {
              "name": "BaselineSharpness",
              "type": "Rational"
            },
            50733: {
              "name": "BayerGreenSplit",
              "type": "Long"
            },
            50734: {
              "name": "LinearResponseLimit",
              "type": "Rational"
            },
            50735: {
              "name": "CameraSerialNumber",
              "type": "Ascii"
            },
            50736: {
              "name": "LensInfo",
              "type": "Rational"
            },
            50737: {
              "name": "ChromaBlurRadius",
              "type": "Rational"
            },
            50738: {
              "name": "AntiAliasStrength",
              "type": "Rational"
            },
            50739: {
              "name": "ShadowScale",
              "type": "SRational"
            },
            50740: {
              "name": "DNGPrivateData",
              "type": "Byte"
            },
            50741: {
              "name": "MakerNoteSafety",
              "type": "Short"
            },
            50778: {
              "name": "CalibrationIlluminant1",
              "type": "Short"
            },
            50779: {
              "name": "CalibrationIlluminant2",
              "type": "Short"
            },
            50780: {
              "name": "BestQualityScale",
              "type": "Rational"
            },
            50781: {
              "name": "RawDataUniqueID",
              "type": "Byte"
            },
            50827: {
              "name": "OriginalRawFileName",
              "type": "Byte"
            },
            50828: {
              "name": "OriginalRawFileData",
              "type": "Undefined"
            },
            50829: {
              "name": "ActiveArea",
              "type": "Short"
            },
            50830: {
              "name": "MaskedAreas",
              "type": "Short"
            },
            50831: {
              "name": "AsShotICCProfile",
              "type": "Undefined"
            },
            50832: {
              "name": "AsShotPreProfileMatrix",
              "type": "SRational"
            },
            50833: {
              "name": "CurrentICCProfile",
              "type": "Undefined"
            },
            50834: {
              "name": "CurrentPreProfileMatrix",
              "type": "SRational"
            },
            50879: {
              "name": "ColorimetricReference",
              "type": "Short"
            },
            50931: {
              "name": "CameraCalibrationSignature",
              "type": "Byte"
            },
            50932: {
              "name": "ProfileCalibrationSignature",
              "type": "Byte"
            },
            50934: {
              "name": "AsShotProfileName",
              "type": "Byte"
            },
            50935: {
              "name": "NoiseReductionApplied",
              "type": "Rational"
            },
            50936: {
              "name": "ProfileName",
              "type": "Byte"
            },
            50937: {
              "name": "ProfileHueSatMapDims",
              "type": "Long"
            },
            50938: {
              "name": "ProfileHueSatMapData1",
              "type": "Float"
            },
            50939: {
              "name": "ProfileHueSatMapData2",
              "type": "Float"
            },
            50940: {
              "name": "ProfileToneCurve",
              "type": "Float"
            },
            50941: {
              "name": "ProfileEmbedPolicy",
              "type": "Long"
            },
            50942: {
              "name": "ProfileCopyright",
              "type": "Byte"
            },
            50964: {
              "name": "ForwardMatrix1",
              "type": "SRational"
            },
            50965: {
              "name": "ForwardMatrix2",
              "type": "SRational"
            },
            50966: {
              "name": "PreviewApplicationName",
              "type": "Byte"
            },
            50967: {
              "name": "PreviewApplicationVersion",
              "type": "Byte"
            },
            50968: {
              "name": "PreviewSettingsName",
              "type": "Byte"
            },
            50969: {
              "name": "PreviewSettingsDigest",
              "type": "Byte"
            },
            50970: {
              "name": "PreviewColorSpace",
              "type": "Long"
            },
            50971: {
              "name": "PreviewDateTime",
              "type": "Ascii"
            },
            50972: {
              "name": "RawImageDigest",
              "type": "Undefined"
            },
            50973: {
              "name": "OriginalRawFileDigest",
              "type": "Undefined"
            },
            50974: {
              "name": "SubTileBlockSize",
              "type": "Long"
            },
            50975: {
              "name": "RowInterleaveFactor",
              "type": "Long"
            },
            50981: {
              "name": "ProfileLookTableDims",
              "type": "Long"
            },
            50982: {
              "name": "ProfileLookTableData",
              "type": "Float"
            },
            51008: {
              "name": "OpcodeList1",
              "type": "Undefined"
            },
            51009: {
              "name": "OpcodeList2",
              "type": "Undefined"
            },
            51022: {
              "name": "OpcodeList3",
              "type": "Undefined"
            }
          },
          "Exif": {
            33434: {
              "name": "ExposureTime",
              "type": "Rational"
            },
            33437: {
              "name": "FNumber",
              "type": "Rational"
            },
            34850: {
              "name": "ExposureProgram",
              "type": "Short"
            },
            34852: {
              "name": "SpectralSensitivity",
              "type": "Ascii"
            },
            34855: {
              "name": "ISOSpeedRatings",
              "type": "Short"
            },
            34856: {
              "name": "OECF",
              "type": "Undefined"
            },
            34864: {
              "name": "SensitivityType",
              "type": "Short"
            },
            34865: {
              "name": "StandardOutputSensitivity",
              "type": "Long"
            },
            34866: {
              "name": "RecommendedExposureIndex",
              "type": "Long"
            },
            34867: {
              "name": "ISOSpeed",
              "type": "Long"
            },
            34868: {
              "name": "ISOSpeedLatitudeyyy",
              "type": "Long"
            },
            34869: {
              "name": "ISOSpeedLatitudezzz",
              "type": "Long"
            },
            36864: {
              "name": "ExifVersion",
              "type": "Undefined"
            },
            36867: {
              "name": "DateTimeOriginal",
              "type": "Ascii"
            },
            36868: {
              "name": "DateTimeDigitized",
              "type": "Ascii"
            },
            37121: {
              "name": "ComponentsConfiguration",
              "type": "Undefined"
            },
            37122: {
              "name": "CompressedBitsPerPixel",
              "type": "Rational"
            },
            37377: {
              "name": "ShutterSpeedValue",
              "type": "SRational"
            },
            37378: {
              "name": "ApertureValue",
              "type": "Rational"
            },
            37379: {
              "name": "BrightnessValue",
              "type": "SRational"
            },
            37380: {
              "name": "ExposureBiasValue",
              "type": "SRational"
            },
            37381: {
              "name": "MaxApertureValue",
              "type": "Rational"
            },
            37382: {
              "name": "SubjectDistance",
              "type": "Rational"
            },
            37383: {
              "name": "MeteringMode",
              "type": "Short"
            },
            37384: {
              "name": "LightSource",
              "type": "Short"
            },
            37385: {
              "name": "Flash",
              "type": "Short"
            },
            37386: {
              "name": "FocalLength",
              "type": "Rational"
            },
            37396: {
              "name": "SubjectArea",
              "type": "Short"
            },
            37500: {
              "name": "MakerNote",
              "type": "Undefined"
            },
            37510: {
              "name": "UserComment",
              "type": "Ascii"
            },
            37520: {
              "name": "SubSecTime",
              "type": "Ascii"
            },
            37521: {
              "name": "SubSecTimeOriginal",
              "type": "Ascii"
            },
            37522: {
              "name": "SubSecTimeDigitized",
              "type": "Ascii"
            },
            40960: {
              "name": "FlashpixVersion",
              "type": "Undefined"
            },
            40961: {
              "name": "ColorSpace",
              "type": "Short"
            },
            40962: {
              "name": "PixelXDimension",
              "type": "Long"
            },
            40963: {
              "name": "PixelYDimension",
              "type": "Long"
            },
            40964: {
              "name": "RelatedSoundFile",
              "type": "Ascii"
            },
            40965: {
              "name": "InteroperabilityTag",
              "type": "Long"
            },
            41483: {
              "name": "FlashEnergy",
              "type": "Rational"
            },
            41484: {
              "name": "SpatialFrequencyResponse",
              "type": "Undefined"
            },
            41486: {
              "name": "FocalPlaneXResolution",
              "type": "Rational"
            },
            41487: {
              "name": "FocalPlaneYResolution",
              "type": "Rational"
            },
            41488: {
              "name": "FocalPlaneResolutionUnit",
              "type": "Short"
            },
            41492: {
              "name": "SubjectLocation",
              "type": "Short"
            },
            41493: {
              "name": "ExposureIndex",
              "type": "Rational"
            },
            41495: {
              "name": "SensingMethod",
              "type": "Short"
            },
            41728: {
              "name": "FileSource",
              "type": "Undefined"
            },
            41729: {
              "name": "SceneType",
              "type": "Undefined"
            },
            41730: {
              "name": "CFAPattern",
              "type": "Undefined"
            },
            41985: {
              "name": "CustomRendered",
              "type": "Short"
            },
            41986: {
              "name": "ExposureMode",
              "type": "Short"
            },
            41987: {
              "name": "WhiteBalance",
              "type": "Short"
            },
            41988: {
              "name": "DigitalZoomRatio",
              "type": "Rational"
            },
            41989: {
              "name": "FocalLengthIn35mmFilm",
              "type": "Short"
            },
            41990: {
              "name": "SceneCaptureType",
              "type": "Short"
            },
            41991: {
              "name": "GainControl",
              "type": "Short"
            },
            41992: {
              "name": "Contrast",
              "type": "Short"
            },
            41993: {
              "name": "Saturation",
              "type": "Short"
            },
            41994: {
              "name": "Sharpness",
              "type": "Short"
            },
            41995: {
              "name": "DeviceSettingDescription",
              "type": "Undefined"
            },
            41996: {
              "name": "SubjectDistanceRange",
              "type": "Short"
            },
            42016: {
              "name": "ImageUniqueID",
              "type": "Ascii"
            },
            42032: {
              "name": "CameraOwnerName",
              "type": "Ascii"
            },
            42033: {
              "name": "BodySerialNumber",
              "type": "Ascii"
            },
            42034: {
              "name": "LensSpecification",
              "type": "Rational"
            },
            42035: {
              "name": "LensMake",
              "type": "Ascii"
            },
            42036: {
              "name": "LensModel",
              "type": "Ascii"
            },
            42037: {
              "name": "LensSerialNumber",
              "type": "Ascii"
            },
            42240: {
              "name": "Gamma",
              "type": "Rational"
            }
          },
          "GPS": {
            0: {
              "name": "GPSVersionID",
              "type": "Byte"
            },
            1: {
              "name": "GPSLatitudeRef",
              "type": "Ascii"
            },
            2: {
              "name": "GPSLatitude",
              "type": "Rational"
            },
            3: {
              "name": "GPSLongitudeRef",
              "type": "Ascii"
            },
            4: {
              "name": "GPSLongitude",
              "type": "Rational"
            },
            5: {
              "name": "GPSAltitudeRef",
              "type": "Byte"
            },
            6: {
              "name": "GPSAltitude",
              "type": "Rational"
            },
            7: {
              "name": "GPSTimeStamp",
              "type": "Rational"
            },
            8: {
              "name": "GPSSatellites",
              "type": "Ascii"
            },
            9: {
              "name": "GPSStatus",
              "type": "Ascii"
            },
            10: {
              "name": "GPSMeasureMode",
              "type": "Ascii"
            },
            11: {
              "name": "GPSDOP",
              "type": "Rational"
            },
            12: {
              "name": "GPSSpeedRef",
              "type": "Ascii"
            },
            13: {
              "name": "GPSSpeed",
              "type": "Rational"
            },
            14: {
              "name": "GPSTrackRef",
              "type": "Ascii"
            },
            15: {
              "name": "GPSTrack",
              "type": "Rational"
            },
            16: {
              "name": "GPSImgDirectionRef",
              "type": "Ascii"
            },
            17: {
              "name": "GPSImgDirection",
              "type": "Rational"
            },
            18: {
              "name": "GPSMapDatum",
              "type": "Ascii"
            },
            19: {
              "name": "GPSDestLatitudeRef",
              "type": "Ascii"
            },
            20: {
              "name": "GPSDestLatitude",
              "type": "Rational"
            },
            21: {
              "name": "GPSDestLongitudeRef",
              "type": "Ascii"
            },
            22: {
              "name": "GPSDestLongitude",
              "type": "Rational"
            },
            23: {
              "name": "GPSDestBearingRef",
              "type": "Ascii"
            },
            24: {
              "name": "GPSDestBearing",
              "type": "Rational"
            },
            25: {
              "name": "GPSDestDistanceRef",
              "type": "Ascii"
            },
            26: {
              "name": "GPSDestDistance",
              "type": "Rational"
            },
            27: {
              "name": "GPSProcessingMethod",
              "type": "Undefined"
            },
            28: {
              "name": "GPSAreaInformation",
              "type": "Undefined"
            },
            29: {
              "name": "GPSDateStamp",
              "type": "Ascii"
            },
            30: {
              "name": "GPSDifferential",
              "type": "Short"
            },
            31: {
              "name": "GPSHPositioningError",
              "type": "Rational"
            }
          },
          "Interop": {
            1: {
              "name": "InteroperabilityIndex",
              "type": "Ascii"
            }
          }
        };
        TAGS["0th"] = TAGS["Image"];
        TAGS["1st"] = TAGS["Image"];
        that.TAGS = TAGS;
        that.ImageIFD = {
          ProcessingSoftware: 11,
          NewSubfileType: 254,
          SubfileType: 255,
          ImageWidth: 256,
          ImageLength: 257,
          BitsPerSample: 258,
          Compression: 259,
          PhotometricInterpretation: 262,
          Threshholding: 263,
          CellWidth: 264,
          CellLength: 265,
          FillOrder: 266,
          DocumentName: 269,
          ImageDescription: 270,
          Make: 271,
          Model: 272,
          StripOffsets: 273,
          Orientation: 274,
          SamplesPerPixel: 277,
          RowsPerStrip: 278,
          StripByteCounts: 279,
          XResolution: 282,
          YResolution: 283,
          PlanarConfiguration: 284,
          GrayResponseUnit: 290,
          GrayResponseCurve: 291,
          T4Options: 292,
          T6Options: 293,
          ResolutionUnit: 296,
          TransferFunction: 301,
          Software: 305,
          DateTime: 306,
          Artist: 315,
          HostComputer: 316,
          Predictor: 317,
          WhitePoint: 318,
          PrimaryChromaticities: 319,
          ColorMap: 320,
          HalftoneHints: 321,
          TileWidth: 322,
          TileLength: 323,
          TileOffsets: 324,
          TileByteCounts: 325,
          SubIFDs: 330,
          InkSet: 332,
          InkNames: 333,
          NumberOfInks: 334,
          DotRange: 336,
          TargetPrinter: 337,
          ExtraSamples: 338,
          SampleFormat: 339,
          SMinSampleValue: 340,
          SMaxSampleValue: 341,
          TransferRange: 342,
          ClipPath: 343,
          XClipPathUnits: 344,
          YClipPathUnits: 345,
          Indexed: 346,
          JPEGTables: 347,
          OPIProxy: 351,
          JPEGProc: 512,
          JPEGInterchangeFormat: 513,
          JPEGInterchangeFormatLength: 514,
          JPEGRestartInterval: 515,
          JPEGLosslessPredictors: 517,
          JPEGPointTransforms: 518,
          JPEGQTables: 519,
          JPEGDCTables: 520,
          JPEGACTables: 521,
          YCbCrCoefficients: 529,
          YCbCrSubSampling: 530,
          YCbCrPositioning: 531,
          ReferenceBlackWhite: 532,
          XMLPacket: 700,
          Rating: 18246,
          RatingPercent: 18249,
          ImageID: 32781,
          CFARepeatPatternDim: 33421,
          CFAPattern: 33422,
          BatteryLevel: 33423,
          Copyright: 33432,
          ExposureTime: 33434,
          ImageResources: 34377,
          ExifTag: 34665,
          InterColorProfile: 34675,
          GPSTag: 34853,
          Interlace: 34857,
          TimeZoneOffset: 34858,
          SelfTimerMode: 34859,
          FlashEnergy: 37387,
          SpatialFrequencyResponse: 37388,
          Noise: 37389,
          FocalPlaneXResolution: 37390,
          FocalPlaneYResolution: 37391,
          FocalPlaneResolutionUnit: 37392,
          ImageNumber: 37393,
          SecurityClassification: 37394,
          ImageHistory: 37395,
          ExposureIndex: 37397,
          TIFFEPStandardID: 37398,
          SensingMethod: 37399,
          XPTitle: 40091,
          XPComment: 40092,
          XPAuthor: 40093,
          XPKeywords: 40094,
          XPSubject: 40095,
          PrintImageMatching: 50341,
          DNGVersion: 50706,
          DNGBackwardVersion: 50707,
          UniqueCameraModel: 50708,
          LocalizedCameraModel: 50709,
          CFAPlaneColor: 50710,
          CFALayout: 50711,
          LinearizationTable: 50712,
          BlackLevelRepeatDim: 50713,
          BlackLevel: 50714,
          BlackLevelDeltaH: 50715,
          BlackLevelDeltaV: 50716,
          WhiteLevel: 50717,
          DefaultScale: 50718,
          DefaultCropOrigin: 50719,
          DefaultCropSize: 50720,
          ColorMatrix1: 50721,
          ColorMatrix2: 50722,
          CameraCalibration1: 50723,
          CameraCalibration2: 50724,
          ReductionMatrix1: 50725,
          ReductionMatrix2: 50726,
          AnalogBalance: 50727,
          AsShotNeutral: 50728,
          AsShotWhiteXY: 50729,
          BaselineExposure: 50730,
          BaselineNoise: 50731,
          BaselineSharpness: 50732,
          BayerGreenSplit: 50733,
          LinearResponseLimit: 50734,
          CameraSerialNumber: 50735,
          LensInfo: 50736,
          ChromaBlurRadius: 50737,
          AntiAliasStrength: 50738,
          ShadowScale: 50739,
          DNGPrivateData: 50740,
          MakerNoteSafety: 50741,
          CalibrationIlluminant1: 50778,
          CalibrationIlluminant2: 50779,
          BestQualityScale: 50780,
          RawDataUniqueID: 50781,
          OriginalRawFileName: 50827,
          OriginalRawFileData: 50828,
          ActiveArea: 50829,
          MaskedAreas: 50830,
          AsShotICCProfile: 50831,
          AsShotPreProfileMatrix: 50832,
          CurrentICCProfile: 50833,
          CurrentPreProfileMatrix: 50834,
          ColorimetricReference: 50879,
          CameraCalibrationSignature: 50931,
          ProfileCalibrationSignature: 50932,
          AsShotProfileName: 50934,
          NoiseReductionApplied: 50935,
          ProfileName: 50936,
          ProfileHueSatMapDims: 50937,
          ProfileHueSatMapData1: 50938,
          ProfileHueSatMapData2: 50939,
          ProfileToneCurve: 50940,
          ProfileEmbedPolicy: 50941,
          ProfileCopyright: 50942,
          ForwardMatrix1: 50964,
          ForwardMatrix2: 50965,
          PreviewApplicationName: 50966,
          PreviewApplicationVersion: 50967,
          PreviewSettingsName: 50968,
          PreviewSettingsDigest: 50969,
          PreviewColorSpace: 50970,
          PreviewDateTime: 50971,
          RawImageDigest: 50972,
          OriginalRawFileDigest: 50973,
          SubTileBlockSize: 50974,
          RowInterleaveFactor: 50975,
          ProfileLookTableDims: 50981,
          ProfileLookTableData: 50982,
          OpcodeList1: 51008,
          OpcodeList2: 51009,
          OpcodeList3: 51022,
          NoiseProfile: 51041
        };
        that.ExifIFD = {
          ExposureTime: 33434,
          FNumber: 33437,
          ExposureProgram: 34850,
          SpectralSensitivity: 34852,
          ISOSpeedRatings: 34855,
          OECF: 34856,
          SensitivityType: 34864,
          StandardOutputSensitivity: 34865,
          RecommendedExposureIndex: 34866,
          ISOSpeed: 34867,
          ISOSpeedLatitudeyyy: 34868,
          ISOSpeedLatitudezzz: 34869,
          ExifVersion: 36864,
          DateTimeOriginal: 36867,
          DateTimeDigitized: 36868,
          ComponentsConfiguration: 37121,
          CompressedBitsPerPixel: 37122,
          ShutterSpeedValue: 37377,
          ApertureValue: 37378,
          BrightnessValue: 37379,
          ExposureBiasValue: 37380,
          MaxApertureValue: 37381,
          SubjectDistance: 37382,
          MeteringMode: 37383,
          LightSource: 37384,
          Flash: 37385,
          FocalLength: 37386,
          SubjectArea: 37396,
          MakerNote: 37500,
          UserComment: 37510,
          SubSecTime: 37520,
          SubSecTimeOriginal: 37521,
          SubSecTimeDigitized: 37522,
          FlashpixVersion: 40960,
          ColorSpace: 40961,
          PixelXDimension: 40962,
          PixelYDimension: 40963,
          RelatedSoundFile: 40964,
          InteroperabilityTag: 40965,
          FlashEnergy: 41483,
          SpatialFrequencyResponse: 41484,
          FocalPlaneXResolution: 41486,
          FocalPlaneYResolution: 41487,
          FocalPlaneResolutionUnit: 41488,
          SubjectLocation: 41492,
          ExposureIndex: 41493,
          SensingMethod: 41495,
          FileSource: 41728,
          SceneType: 41729,
          CFAPattern: 41730,
          CustomRendered: 41985,
          ExposureMode: 41986,
          WhiteBalance: 41987,
          DigitalZoomRatio: 41988,
          FocalLengthIn35mmFilm: 41989,
          SceneCaptureType: 41990,
          GainControl: 41991,
          Contrast: 41992,
          Saturation: 41993,
          Sharpness: 41994,
          DeviceSettingDescription: 41995,
          SubjectDistanceRange: 41996,
          ImageUniqueID: 42016,
          CameraOwnerName: 42032,
          BodySerialNumber: 42033,
          LensSpecification: 42034,
          LensMake: 42035,
          LensModel: 42036,
          LensSerialNumber: 42037,
          Gamma: 42240
        };
        that.GPSIFD = {
          GPSVersionID: 0,
          GPSLatitudeRef: 1,
          GPSLatitude: 2,
          GPSLongitudeRef: 3,
          GPSLongitude: 4,
          GPSAltitudeRef: 5,
          GPSAltitude: 6,
          GPSTimeStamp: 7,
          GPSSatellites: 8,
          GPSStatus: 9,
          GPSMeasureMode: 10,
          GPSDOP: 11,
          GPSSpeedRef: 12,
          GPSSpeed: 13,
          GPSTrackRef: 14,
          GPSTrack: 15,
          GPSImgDirectionRef: 16,
          GPSImgDirection: 17,
          GPSMapDatum: 18,
          GPSDestLatitudeRef: 19,
          GPSDestLatitude: 20,
          GPSDestLongitudeRef: 21,
          GPSDestLongitude: 22,
          GPSDestBearingRef: 23,
          GPSDestBearing: 24,
          GPSDestDistanceRef: 25,
          GPSDestDistance: 26,
          GPSProcessingMethod: 27,
          GPSAreaInformation: 28,
          GPSDateStamp: 29,
          GPSDifferential: 30,
          GPSHPositioningError: 31
        };
        that.InteropIFD = {
          InteroperabilityIndex: 1
        };
        that.GPSHelper = {
          degToDmsRational: function(degFloat) {
            var degAbs = Math.abs(degFloat);
            var minFloat = degAbs % 1 * 60;
            var secFloat = minFloat % 1 * 60;
            var deg = Math.floor(degAbs);
            var min = Math.floor(minFloat);
            var sec = Math.round(secFloat * 100);
            return [[deg, 1], [min, 1], [sec, 100]];
          },
          dmsRationalToDeg: function(dmsArray, ref) {
            var sign = ref === "S" || ref === "W" ? -1 : 1;
            var deg = dmsArray[0][0] / dmsArray[0][1] + dmsArray[1][0] / dmsArray[1][1] / 60 + dmsArray[2][0] / dmsArray[2][1] / 3600;
            return deg * sign;
          }
        };
        if (typeof exports !== "undefined") {
          if (typeof module !== "undefined" && module.exports) {
            exports = module.exports = that;
          }
          exports.piexif = that;
        } else {
          window.piexif = that;
        }
      })();
    }
  });

  // src/main.js
  init_live_reload();

  // src/ImagerJs.js
  init_live_reload();

  // node_modules/nanoid/index.browser.js
  init_live_reload();

  // node_modules/nanoid/url-alphabet/index.js
  init_live_reload();
  var urlAlphabet = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";

  // node_modules/nanoid/index.browser.js
  var nanoid = (size = 21) => {
    let id = "";
    let bytes = crypto.getRandomValues(new Uint8Array(size));
    while (size--) {
      id += urlAlphabet[bytes[size] & 63];
    }
    return id;
  };

  // src/ImagerJs.js
  var import_piexifjs = __toESM(require_piexif());

  // src/Modal.js
  init_live_reload();
  var $body = null;
  var $overlay = $(
    '<div class="modaljs-overlay hidden hidden-add-end noselect"></div>'
  );
  var $wrapper = $(
    '<div class="modaljs-wrapper hidden noselect"><div class="modaljs-wrapper2 modaljs-modals-container noselect"></div></div>'
  );
  $(document).ready(() => {
    $body = $("body");
    $body.append($overlay);
    $body.append($wrapper);
  });
  var Modal2 = class {
    constructor() {
      var $modal = $(
        '<div class="modaljs hidden noselect"><header></header><div class="modaljs-template-container noselect"></div><footer></footer>'
      );
      $wrapper.find(".modaljs-modals-container").append($modal);
      $wrapper.find(".modaljs").scroll(() => {
        $(window).trigger("resize");
      });
      this.$modal = $modal;
      this.classname = "";
      this.cancelHandler = null;
      $(window).resize(() => {
        this.fixPosition();
      });
      $("body").on("imagerResize", () => {
        this.fixPosition();
      });
    }
    setTitle(title) {
      this.$modal.find("header").html(title);
    }
    setTemplate(template) {
      this.$modal.find(".modaljs-template-container").append($(template));
    }
    fixPosition() {
      if ($wrapper.find(".modaljs").length < 1) {
        return;
      }
      var headerHeight = $wrapper.find(".modaljs > header")[0].getBoundingClientRect().height;
      var bodyHeight = $wrapper.find(".modaljs > .modaljs-template-container")[0].getBoundingClientRect().height;
      var footerHeight = $wrapper.find(".modaljs > footer")[0].getBoundingClientRect().height;
      var fullContentHeight = headerHeight + bodyHeight + footerHeight;
      if ($(window).height() <= fullContentHeight) {
        $wrapper.addClass("fullheight");
      } else {
        $wrapper.removeClass("fullheight");
      }
    }
    addCancelButton(buttonText, handler) {
      this.cancelHandler = handler;
      var $button = $("<button></button>").text(buttonText);
      $button.on("click", () => {
        this.hide();
        if (this.cancelHandler) {
          this.cancelHandler();
        }
      });
      this.$modal.find("footer").append($button);
      this._fixButtonsSize();
    }
    addClass(classname) {
      this.classname += " " + classname;
      this.$modal.addClass(classname);
    }
    addActionButton(buttonText, handler) {
      var $button = $("<button></button>").addClass("modaljs-action-button").text(buttonText);
      $button.on("click", () => {
        var handlerResponse = handler();
        if (handlerResponse === void 0 && handlerResponse !== false) {
          this.hide();
        }
      });
      this.$modal.find("footer").append($button);
      this._fixButtonsSize();
    }
    _fixButtonsSize() {
      var $buttons = this.$modal.find("footer button");
      $buttons.css("width", 100 / $buttons.length + "%");
    }
    show() {
      $overlay.addClass(this.classname);
      $overlay.removeClass("hidden-add-end");
      $overlay.removeClass("hidden");
      $overlay.css("height", $("body").height());
      $overlay.on("click", () => {
        this.hide();
        if (this.cancelHandler) {
          this.cancelHandler();
        }
      });
      $wrapper.removeClass("hidden");
      this.$modal.removeClass("hidden");
      var bodyWidthBefore = $body.width();
      this.overflowBefore = $body.css("overflow");
      $body.css("overflow", "hidden");
      this.widthDiff = $body.width() - bodyWidthBefore;
      this.paddingBefore = $body.css("padding-right");
      $body.css("padding-right", this.widthDiff + "px");
    }
    hide() {
      $overlay.removeClass(this.classname);
      $overlay.addClass("hidden");
      setTimeout(() => {
        $overlay.addClass("hidden-add-end");
      }, 400);
      $overlay.off("click");
      $wrapper.addClass("hidden");
      this.$modal.addClass("hidden");
      $body.css("overflow", this.overflowBefore);
      $body.css("padding-right", this.paddingBefore);
    }
    remove() {
      this.$modal.remove();
      this.cancelHandler = false;
    }
  };

  // src/Toolbar.js
  init_live_reload();

  // src/Translations.js
  init_live_reload();
  var translations = {
    "Incorrect file type": "Incorrect file type",
    Insert: "Insert",
    Cancel: "Cancel",
    "Add image": "Add image",
    Quality: "Quality",
    Rotate: "Rotate",
    Crop: "Crop",
    Original: "Original",
    KB: "KB",
    Large: "Large",
    Medium: "Medium",
    Small: "Small",
    "Custom quality percent": "Custom quality percent",
    Custom: "Custom",
    "Image properties": "Image properties",
    "Size:": "Size:",
    "width in px": "width in px",
    "height in px": "height in px",
    Left: "Left",
    Right: "Right",
    Center: "Center",
    Inline: "Inline",
    Floating: "Floating",
    "Transparent background": "Transparent background",
    Apply: "Apply",
    Reject: "Reject",
    "Delete image": "Delete image",
    "Move image": "Move image",
    "Are you sure want to delete this image?": "Are you sure want to delete this image?",
    "Or drop files here": "Or drop files here",
    "No file selected.": "No file selected.",
    "Please wait...": "Please wait...",
    Save: "Save",
    Undo: "Undo",
    "Rotate manually": "Rotate manually",
    "Rotate 90 left": "Rotate 90\xB0 left",
    "Rotate 90 right": "Rotate 90\xB0 left",
    "Image is too big and could cause very poor performance.": "Image is too big and could cause very poor performance."
  };
  function translate(textString) {
    if (translations[textString]) {
      return translations[textString];
    } else {
      console.warn("String not found in texts:" + textString);
      return textString;
    }
  }

  // src/util/Util.js
  init_live_reload();
  function bindClick(element, namespace, handler) {
    var ns = namespace + "drawerBindClick";
    $(element).on("click." + ns, (event) => {
      var elem = getTarget(event);
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
    $(element).on("touchstart." + ns, (event) => {
      var elem = getTarget(event);
      elem.__drawerTouchStartEvent = event;
      $(element).off("click." + ns);
    });
    $(element).on("touchend." + ns, (event) => {
      var elem = getTarget(event);
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
  }
  function mouseDown(namespace) {
    return "mousedown." + namespace + " touchstart." + namespace;
  }
  function mouseMove(namespace) {
    return "mousemove." + namespace + " touchmove." + namespace;
  }
  function mouseUp(namespace) {
    return "mouseup." + namespace + " touchend." + namespace;
  }
  function getEventPosition(event) {
    if (event.type.indexOf("touch") > -1) {
      event = event.originalEvent;
      if (event.pageX === 0 && event.pageY === 0 || event.pageX === void 0 && event.pageY === void 0 && event.touches.length > 0) {
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
  }
  function setWaiting(element, text, cursor) {
    if (!cursor) {
      cursor = "wait";
    }
    setOverlayMessage(element, text, cursor);
  }
  function stopWaiting(element) {
    removeOverlayMessage(element);
  }
  function setOverlayMessage(element, text, cursor, actionButtonText, actionButtonClickHandler) {
    if (!cursor) {
      cursor = "default";
    }
    var actionButton = actionButtonText ? '<div class="action-button">' + actionButtonText + "</div>" : "";
    $(element).append(
      '<div class="overlay-message-wrapper"><div class="overlay-message">' + text + actionButton + "</div></div>"
    );
    $(element).find(".overlay-message-wrapper").css("cursor", cursor);
    bindClick(
      $(element).find(".action-button"),
      "overlay-message-click",
      actionButtonClickHandler
    );
  }
  function removeOverlayMessage(element) {
    $(element).find(".overlay-message-wrapper").remove();
  }
  function resizeImage(canvas, W, H, W2, H2) {
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
          var w0 = dy * dy;
          for (var xx = Math.floor(i * ratio_w); xx < (i + 1) * ratio_w; xx++) {
            var dx = Math.abs(center_x - (xx + 0.5)) / ratio_w_half;
            var w = Math.sqrt(w0 + dx * dx);
            if (w >= -1 && w <= 1) {
              weight = 2 * w * w * w - 3 * w * w + 1;
              if (weight > 0) {
                dx = 4 * (xx + yy * W);
                gx_a += weight * data[dx + 3];
                weights_alpha += weight;
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
    canvas.getContext("2d").clearRect(0, 0, Math.max(W, W2), Math.max(H, H2));
    canvas.width = W2;
    canvas.height = H2;
    canvas.getContext("2d").putImageData(img2, 0, 0);
  }
  function getTarget(event) {
    if (!event.target) {
      console.log(event);
      throw new Error("event.target not found");
    }
    return event.target;
  }

  // src/Toolbar.js
  var Toolbar = class {
    constructor(options) {
      options = options || {};
      var defaultOptions = {
        tooltipEnabled: true,
        tooltipCss: null
      };
      this.options = $.extend(defaultOptions, options);
      this.$toolbar = $('<ul class="toolbar"></ul>').attr("contenteditable", "false").addClass("noselect").addClass("toolbar-topLeft");
      this.tooltips = [];
      this.buttonsGroups = {};
    }
    getElement() {
      return this.$toolbar;
    }
    addButton(className, iconClass, tooltipText, clickHandler) {
      var $button = this.createButton(className, iconClass, clickHandler);
      this.$toolbar.append($button);
      this.createTooltip($button.find("a"), className, tooltipText, "bottom");
      return $button;
    }
    createButton(className, iconClass, clickHandler) {
      var $button = $(
        '<li data-sizeable="toolbar-button" data-cssrules="width,height"><a href="#" data-sizeable="toolbar-button" data-cssrules="line-height,font-size:($v / 2.5)" tabindex="-1"><i class="fa ' + iconClass + '"></i></a></li>'
      ).addClass(className);
      bindClick($button.find("a"), "imager-button", () => clickHandler(this));
      return $button;
    }
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
    addButtonToGroup(className, iconClass, tooltipText, group, clickHandler) {
      var $groupContainer = null;
      if (!this.buttonsGroups[group.name]) {
        $groupContainer = $(
          '<li class="btn-group" data-editable-canvas-sizeable="toolbar-button" data-editable-canvas-cssrules="width,height"><a href="#" data-editable-canvas-sizeable="toolbar-button" data-editable-canvas-cssrules="line-height,font-size:($v / 2.5)" tabindex="-1"><i class="fa ' + iconClass + '"></i></a><ul class="group-items-container hidden"></ul></li>'
        );
        this.buttonsGroups[group.name] = $groupContainer;
        this.$toolbar.append($groupContainer);
        bindClick(
          $groupContainer.children("a"),
          "drawer-toolbar-group-button",
          () => {
            $groupContainer.find("ul.group-items-container").toggleClass("hidden");
          }
        );
        this.createTooltip(
          $groupContainer.children("a"),
          group.name,
          group.tooltip,
          "bottom"
        );
      }
      $groupContainer = this.buttonsGroups[group.name];
      var $button = this.createButton(className, iconClass, (clickEvent) => {
        $groupContainer.find("ul.group-items-container").toggleClass("hidden");
        clickHandler(clickEvent);
        $groupContainer.attr("class", $button.attr("class")).addClass("btn-group");
        $groupContainer.children("a").attr("class", $button.children("a").attr("class"));
        $groupContainer.children("a").html($button.children("a").html());
      });
      $groupContainer.find(".group-items-container").append($button);
      this.createTooltip(
        $button.find("a"),
        className + " group-item",
        tooltipText,
        "right"
      );
      return $button;
    }
    createTooltip($button, className, title, align) {
      if (!this.options.tooltipEnabled) {
        return;
      }
      var $tooltip = $("<span>").addClass("toolbar-tooltip tooltip-" + className).html(title);
      $tooltip.appendTo("body");
      this.tooltips.push($tooltip);
      if (this.options.tooltipCss) {
        $tooltip.css(this.options.tooltipCss);
      }
      $button.on("mouseenter", (e) => {
        if ($(getTarget(e)).hasClass("disabled"))
          return;
        var btnPos = $button.offset();
        var btnHeight = $button.innerHeight();
        var btnWidth = $button.innerWidth();
        $tooltip.addClass("active");
        var top = 0;
        var left = 0;
        switch (align) {
          case "right":
            top = btnPos.top + ($button.height() - $tooltip.outerHeight()) / 2;
            left = btnPos.left + btnWidth;
            break;
          default:
            top = btnPos.top + btnHeight;
            left = btnPos.left + btnWidth / 2 - $tooltip.innerWidth() / 2;
            break;
        }
        $tooltip.css({
          top: top + "px",
          left: left + "px"
        });
      });
      $button.on("mouseout", () => $tooltip.removeClass("active"));
    }
    setActiveButton(buttonClassName) {
      this.$toolbar.find("li." + buttonClassName).children("a").addClass("active");
    }
    clearActiveButton() {
      this.$toolbar.find("li").children("a").removeClass("active");
    }
    remove() {
      if (this.$toolbar) {
        this.$toolbar.remove();
        this.$toolbar = null;
      }
      if (this.tooltips) {
        this.tooltips.map(($tooltip) => {
          $tooltip.remove();
          $tooltip = null;
          return null;
        });
        this.tooltips = null;
      }
    }
  };

  // src/plugins/crop/Crop.js
  init_live_reload();
  var MOUSE_DOWN = mouseDown("imagerjsCrop");
  var MOUSE_UP = mouseUp("imagerjsCrop");
  var MOUSE_MOVE = mouseMove("imagerjsCrop");
  var CropPlugin = class {
    constructor(imagerInstance, options) {
      this.weight = 0;
      this.imager = imagerInstance;
      this.defaultOptions = {
        controlsCss: {},
        controlsTouchCss: {}
      };
      options = options ? options : {};
      this.options = $.extend(true, this.defaultOptions, options);
      this.originalWidth = null;
      this.originalHeight = null;
      this.croppedWidth = null;
      this.croppedHeight = null;
      this.croppedLeft = null;
      this.croppedTop = null;
    }
    getButtons() {
      return [
        {
          classes: "btn-crop",
          iconClasses: "fa-scissors",
          tooltip: translate("Crop"),
          enabledHandler: () => {
            if (this.sizeBeforeCrop) {
              this.imager.setPreviewSize(
                this.sizeBeforeCrop.width,
                this.sizeBeforeCrop.height
              );
            }
            this.enableRendering = false;
            this.imager.render();
            this.startCropping();
          },
          applyHandler: () => {
            this.sizeBeforeCrop = this.imager.getPreviewSize();
            this.stopCropping();
            this.enableRendering = true;
            this.imager.setPreviewSize(this.croppedWidth, this.croppedHeight);
            this.imager.setWaiting(true);
            setTimeout(() => {
              this.imager.commitChanges("Crop");
              this.reset();
              this.imager.render();
              this.imager.setWaiting(false);
            }, 50);
          },
          rejectHandler: () => {
            this.stopCropping();
            this.croppedWidth = null;
            this.croppedHeight = null;
            this.croppedLeft = null;
            this.croppedTop = null;
            this.imager.render();
          }
        }
      ];
    }
    startCropping() {
      this.renderCropped = false;
      this.imager.render();
      const $body2 = $("body");
      var previewSize = this.imager.getPreviewSize();
      this.originalWidth = previewSize.width;
      this.originalHeight = previewSize.height;
      this.makePreview();
      this.$cropControls = $(
        '<div class="imager-crop-container"><div class="crop-corner crop-top-left"></div><div class="crop-corner crop-top-right"></div><div class="crop-corner crop-bottom-right"></div><div class="crop-corner crop-bottom-left"></div><div class="crop-border crop-border-top"></div><div class="crop-border crop-border-right"></div><div class="crop-border crop-border-bottom"></div><div class="crop-border crop-border-left"></div></div>'
      ).css({
        width: this.croppedWidth ? this.croppedWidth : this.originalWidth,
        height: this.croppedHeight ? this.croppedHeight : this.originalHeight,
        left: this.croppedLeft ? this.croppedLeft : 0,
        top: this.croppedTop ? this.croppedTop : 0
      });
      this.imager.$editContainer.append(this.$cropControls);
      var $selection = this.$cropControls;
      var $corners = $selection.find(".crop-corner");
      if (this.imager.touchDevice) {
        $corners.css(this.options.controlsTouchCss);
      } else {
        $corners.css(this.options.controlsCss);
      }
      const handleCropSelectionChanges = () => {
        this.$cropControls.css({
          left: this.croppedLeft,
          top: this.croppedTop,
          width: this.croppedWidth,
          height: this.croppedHeight
        });
        this.adjustPreview();
      };
      $corners.on(MOUSE_DOWN, (clickEvent) => {
        clickEvent.stopPropagation();
        var controlItem = getTarget(clickEvent);
        var startPos = getEventPosition(clickEvent);
        var startControlsLeft = this.$cropControls.css("left").replace("px", "") | 0;
        var startControlsTop = this.$cropControls.css("top").replace("px", "") | 0;
        var startControlsWidth = this.$cropControls.css("width").replace("px", "") | 0;
        var startControlsHeight = this.$cropControls.css("height").replace("px", "") | 0;
        $body2.on(MOUSE_MOVE, (moveEvent) => {
          var movePos = getEventPosition(moveEvent);
          var diffLeft = movePos.left - startPos.left;
          var diffTop = movePos.top - startPos.top;
          const validateBounds = () => {
            if (this.croppedLeft < 0) {
              this.croppedLeft = 0;
            }
            if (this.croppedTop < 0) {
              this.croppedTop = 0;
            }
            if (this.croppedLeft + this.croppedWidth > this.originalWidth) {
              this.croppedWidth = this.originalWidth - this.croppedLeft;
            }
            if (this.croppedTop + this.croppedHeight > this.originalHeight) {
              this.croppedHeight = this.originalHeight - this.croppedTop;
            }
          };
          if ($(controlItem).hasClass("crop-top-left")) {
            this.croppedLeft = startControlsLeft + diffLeft;
            this.croppedTop = startControlsTop + diffTop;
            this.croppedWidth = startControlsWidth - diffLeft;
            this.croppedHeight = startControlsHeight - diffTop;
            if (moveEvent.shiftKey) {
              validateBounds();
              if (this.croppedHeight < this.croppedWidth) {
                this.croppedWidth = this.croppedHeight;
                this.croppedLeft = startControlsWidth - this.croppedHeight + startControlsLeft;
              } else {
                this.croppedHeight = this.croppedWidth;
                this.croppedTop = startControlsHeight - this.croppedWidth + startControlsTop;
              }
            }
          }
          if ($(controlItem).hasClass("crop-top-right")) {
            this.croppedLeft = startControlsLeft;
            this.croppedTop = startControlsTop + diffTop;
            this.croppedWidth = startControlsWidth - diffLeft * -1;
            this.croppedHeight = startControlsHeight - diffTop;
            if (moveEvent.shiftKey) {
              validateBounds();
              if (this.croppedHeight < this.croppedWidth) {
                this.croppedWidth = this.croppedHeight;
              } else {
                this.croppedHeight = this.croppedWidth;
                this.croppedTop = startControlsHeight - this.croppedHeight + startControlsTop;
              }
            }
          }
          if ($(controlItem).hasClass("crop-bottom-right")) {
            this.croppedLeft = startControlsLeft;
            this.croppedTop = startControlsTop;
            this.croppedWidth = startControlsWidth - diffLeft * -1;
            this.croppedHeight = startControlsHeight + diffTop;
            if (moveEvent.shiftKey) {
              validateBounds();
              if (this.croppedHeight < this.croppedWidth) {
                this.croppedWidth = this.croppedHeight;
              } else {
                this.croppedHeight = this.croppedWidth;
              }
            }
          }
          if ($(controlItem).hasClass("crop-bottom-left")) {
            this.croppedLeft = startControlsLeft + diffLeft;
            this.croppedTop = startControlsTop;
            this.croppedWidth = startControlsWidth - diffLeft;
            this.croppedHeight = startControlsHeight + diffTop;
            if (moveEvent.shiftKey) {
              validateBounds();
              if (this.croppedHeight < this.croppedWidth) {
                this.croppedWidth = this.croppedHeight;
                this.croppedLeft = startControlsLeft + (startControlsWidth - this.croppedWidth);
              } else {
                this.croppedHeight = this.croppedWidth;
              }
            }
          }
          validateBounds();
          handleCropSelectionChanges();
          moveEvent.preventDefault();
          moveEvent.stopPropagation();
          return false;
        });
        $body2.on(MOUSE_UP, () => {
          $body2.off(MOUSE_MOVE);
          $body2.off(MOUSE_UP);
        });
      });
      $selection.on(MOUSE_DOWN, (clickEvent) => {
        var startPos = getEventPosition(clickEvent);
        var startControlsLeft = this.$cropControls.css("left").replace("px", "") | 0;
        var startControlsTop = this.$cropControls.css("top").replace("px", "") | 0;
        $body2.on(MOUSE_MOVE, (moveEvent) => {
          var movePos = getEventPosition(moveEvent);
          var diffLeft = movePos.left - startPos.left;
          var diffTop = movePos.top - startPos.top;
          this.croppedLeft = startControlsLeft + diffLeft;
          this.croppedTop = startControlsTop + diffTop;
          if (this.croppedLeft < 0) {
            this.croppedLeft = 0;
          }
          if (this.croppedTop < 0) {
            this.croppedTop = 0;
          }
          if (this.croppedLeft + this.croppedWidth > this.originalWidth) {
            this.croppedLeft = this.originalWidth - this.croppedWidth;
          }
          if (this.croppedTop + this.croppedHeight > this.originalHeight) {
            this.croppedTop = this.originalHeight - this.croppedHeight;
          }
          handleCropSelectionChanges();
          moveEvent.preventDefault();
          moveEvent.stopPropagation();
          return false;
        });
        $body2.on(MOUSE_UP, () => {
          $body2.off(MOUSE_MOVE);
          $body2.off(MOUSE_UP);
        });
      });
    }
    stopCropping() {
      this.$preview.remove();
      this.$preview = null;
      this.$cropControls.remove();
      this.$cropControls = null;
      this.renderCropped = true;
    }
    makePreview() {
      var originalPreviewSize = this.imager.getPreviewSize();
      this.$preview = $(
        '<div class="imager-crop-preview-container"><canvas class="imager-crop-preview"></canvas></div>'
      ).css("position", "absolute").css("top", "50px").css({
        width: originalPreviewSize.width,
        height: originalPreviewSize.height,
        position: "absolute",
        right: "50px",
        top: "50px"
      });
      this.previewCanvas = this.$preview.find("canvas.imager-crop-preview")[0];
      this.previewCanvas.__previewCanvas = true;
      this.previewCanvas.width = originalPreviewSize.width * 1.5;
      this.previewCanvas.height = originalPreviewSize.height * 1.5;
      $(this.previewCanvas).css({
        height: "400px"
      });
      this.imager.$editContainer.after(this.$preview);
    }
    adjustPreview() {
    }
    render(ctx) {
      if (this.croppedWidth === null || !this.enableRendering) {
        return;
      }
      let previewSize = this.imager.getPreviewSize();
      let previewWidth = previewSize.width;
      let previewHeight = previewSize.height;
      if (this.sizeBeforeCrop) {
        previewWidth = this.sizeBeforeCrop.width;
        previewHeight = this.sizeBeforeCrop.height;
      }
      var tempCtx = this.imager.tempCanvas.getContext("2d");
      var scaledWidth = this.imager.convertScale(
        this.croppedWidth,
        previewWidth,
        ctx.canvas.width
      );
      var scaledHeight = this.imager.convertScale(
        this.croppedHeight,
        previewHeight,
        ctx.canvas.height
      );
      var left = this.imager.convertScale(
        this.croppedLeft,
        previewWidth,
        ctx.canvas.width
      );
      var top = this.imager.convertScale(
        this.croppedTop,
        previewHeight,
        ctx.canvas.height
      );
      left *= -1;
      top *= -1;
      var widthDiff = ctx.canvas.width - scaledWidth;
      var heightDiff = ctx.canvas.height - scaledHeight;
      tempCtx.canvas.width = scaledWidth;
      tempCtx.canvas.height = scaledHeight;
      tempCtx.clearRect(0, 0, tempCtx.canvas.width, tempCtx.canvas.height);
      tempCtx.drawImage(
        ctx.canvas,
        0,
        0,
        ctx.canvas.width,
        ctx.canvas.height,
        left,
        top,
        tempCtx.canvas.width + widthDiff,
        tempCtx.canvas.height + heightDiff
      );
      ctx.canvas.width = scaledWidth;
      ctx.canvas.height = scaledHeight;
      this.imager.clearCanvas(ctx);
      ctx.drawImage(
        tempCtx.canvas,
        0,
        0,
        tempCtx.canvas.width,
        tempCtx.canvas.height,
        0,
        0,
        ctx.canvas.width,
        ctx.canvas.height
      );
    }
    onToolSelected(btn) {
      if (btn.plugin.constructor.name == "RotatePlugin") {
        this.croppedLeft = null;
        this.croppedTop = null;
        this.croppedWidth = null;
        this.croppedHeight = null;
        this.sizeBeforeCrop = null;
      }
    }
    deserialize(savedState) {
      if (savedState) {
        this.croppedLeft = croppedLeft;
        this.croppedTop = croppedTop;
        this.croppedWidth = croppedWidth;
        this.croppedHeight = croppedHeight;
        this.sizeBeforeCrop = sizeBeforeCrop;
      }
    }
    serialize() {
      return {
        croppedLeft: this.croppedLeft,
        croppedTop: this.croppedTop,
        croppedWidth: this.croppedWidth,
        croppedHeight: this.croppedHeight,
        sizeBeforeCrop: this.sizeBeforeCrop
      };
    }
    reset() {
      this.croppedLeft = null;
      this.croppedTop = null;
      this.croppedWidth = null;
      this.croppedHeight = null;
      this.sizeBeforeCrop = null;
    }
  };

  // src/plugins/delete/Delete.js
  init_live_reload();
  var DeletePlugin = class {
    constructor(imagerInstance, options) {
      this.imager = imagerInstance;
      this.defaultOptions = {
        fullRemove: false
      };
      options = options ? options : {};
      this.options = $.extend(true, this.defaultOptions, options);
      this.weight = 500;
    }
    getButtons() {
      return [
        {
          classes: "btn-delete",
          iconClasses: "fa-times",
          tooltip: translate("Delete image"),
          enabledHandler: (toolbar) => {
            var question = translate("Are you sure want to delete this image?");
            var response = confirm(question);
            if (response) {
              this.imager.setWaiting(true);
              setTimeout(() => {
                if (this.options.fullRemove) {
                  this.imager.remove(true);
                } else {
                  this.imager.stopEditing();
                  this.imager.$imageElement.attr("src", "");
                  this.imager.startSelector();
                  this.imager.adjustEditContainer();
                }
              }, 1);
            }
          }
        }
      ];
    }
  };

  // src/plugins/properties/properties.js
  init_live_reload();
  var MOUSE_DOWN2 = mouseDown("MovableFloatingMode");
  var MOUSE_MOVE2 = mouseMove("MovableFloatingMode");
  var MOUSE_UP2 = mouseUp("MovableFloatingMode");
  var PropertiesPlugin = class {
    constructor(imagerInstance, options) {
      this.imager = imagerInstance;
      this.defaultOptions = {
        minWidth: 50,
        minHeight: 50
      };
      options = options ? options : {};
      this.options = $.extend(true, this.defaultOptions, options);
      this.weight = 100;
      this.imager.log("[PropertiesPlugin]", "init");
    }
    getButtons() {
      return [
        {
          classes: "btn-properties",
          iconClasses: "fa-cog",
          tooltip: translate("Image properties"),
          enabledHandler: () => this.showPropertiesModal()
        }
      ];
    }
    showPropertiesModal() {
      var modal = new Modal();
      modal.setTitle(translate("Image properties"));
      modal.addClass("canvas-properties imager-click-stop");
      var $template = $(
        '<div class="image-properties"><form class="image-size-form"><div class="form-group"><label for="image-properties-width">' + translate("Size:") + ' </label><input type="text" class="form-control" id="image-properties-width" placeholder="' + translate("width in px") + '"><span>x</span><input type="email" class="form-control" id="image-properties-height" placeholder="' + translate("height in px") + '"></div></form><br><form class="aligment"><div class="form-group"><label for="image-properties-layout">Aligment:</label><select id="image-properties-layout" class="form-control layout-selector"><option value="left">' + translate("Left") + '</option><option value="right">' + translate("Right") + '</option><option value="center">' + translate("Center") + '</option><option value="inline">' + translate("Inline") + '</option><option value="floating">' + translate("Floating") + '</option></select></div></form><form class="background-transparency"><div class="form-group"><input id="image-properties-transparent-background" type="checkbox" checked><label for="image-properties-transparent-background">' + translate("Transparent background") + "</label></div></form></div>"
      );
      if (this.getAlign() == "floating") {
        $template.find(".background-transparency").show();
      } else {
        $template.find(".background-transparency").hide();
      }
      var backgroundColor = this.imager.$imageElement.css("background-color");
      if (backgroundColor == "transparent" || backgroundColor == "rgba(0, 0, 0, 0)") {
        $template.find("#image-properties-transparent-background").attr("checked", "checked");
      } else {
        $template.find("#image-properties-transparent-background").removeAttr("checked");
      }
      var size = this.imager.getPreviewSize();
      var ratioWidth = size.height / size.width;
      var ratioHeight = size.width / size.height;
      var currentAlign = this.getAlign();
      $template.find("#image-properties-width").val(size.width);
      $template.find("#image-properties-width").on("change keyup", () => {
        var newWidth = $template.find("#image-properties-width").val();
        var newHeight = Math.floor(newWidth * ratioWidth);
        $template.find("#image-properties-height").val(newHeight);
      });
      $template.find("#image-properties-height").val(size.height);
      $template.find("#image-properties-height").on("change keyup", () => {
        var newHeight = $template.find("#image-properties-height").val();
        var newWidth = Math.floor(newHeight * ratioHeight);
        $template.find("#image-properties-width").val(newWidth);
      });
      $template.find("#image-properties-layout").val(currentAlign);
      $template.find("#image-properties-layout").change(() => {
        if ($("#image-properties-layout").val() == "floating") {
          $template.find(".background-transparency").show();
        } else {
          $template.find(".background-transparency").hide();
        }
      });
      modal.setTemplate($template);
      modal.addCancelButton(translate("Cancel"), () => {
        modal.remove();
      });
      modal.addActionButton(translate("Apply"), () => {
        var width = $("#image-properties-width").val();
        var height = $("#image-properties-height").val();
        var align = $("#image-properties-layout").val();
        var transparent = $("#image-properties-transparent-background").attr(
          "checked"
        );
        if (transparent) {
          this.imager.$editContainer.css("background", "transparent");
          this.imager.$imageElement.css("background", "transparent");
        } else {
          this.imager.$editContainer.css("background", "white");
          this.imager.$imageElement.css("background", "white");
        }
        this.imager.render();
        if (align != this.getAlign()) {
          this.setAlign(align);
        }
        this.imager.setPreviewSize(width, height);
        modal.remove();
      });
      modal.show();
    }
    setAlign(align) {
      var aligmentCss = {};
      if (align == "floating") {
        aligmentCss["position"] = "absolute";
        aligmentCss["display"] = "block";
        aligmentCss["float"] = "none";
        aligmentCss["left"] = "0px";
        aligmentCss["top"] = "0px";
      } else if (align == "center") {
        aligmentCss["float"] = "none";
        aligmentCss["margin-left"] = "auto";
        aligmentCss["margin-right"] = "auto";
        aligmentCss["display"] = "block";
        aligmentCss["position"] = "static";
      } else if (align == "inline") {
        aligmentCss["float"] = "none";
        aligmentCss["display"] = "inline-block";
        aligmentCss["position"] = "static";
      } else {
        aligmentCss["display"] = "block";
        aligmentCss["float"] = align;
        aligmentCss["position"] = "static";
      }
      this.imager.$imageElement.css(aligmentCss);
      this.onEditStart();
      this.imager.adjustEditContainer();
    }
    getAlign() {
      var aligmentCss = this.imager.$imageElement.css([
        "position",
        "float",
        "display",
        "margin-left",
        "margin-right"
      ]);
      var currentAlign = "inline";
      if (aligmentCss["position"] == "absolute") {
        currentAlign = "floating";
      } else if (aligmentCss["float"] == "left") {
        currentAlign = "left";
      } else if (aligmentCss["float"] == "right") {
        currentAlign = "right";
      } else if (aligmentCss["display"] == "block" && aligmentCss["margin-left"] == "auto") {
        currentAlign = "center";
      }
      return currentAlign;
    }
    onEditStart() {
      var align = this.getAlign();
      if (align == "floating") {
        this.makeMoveButton();
      } else if (this.$moveButton) {
        this.$moveButton.remove();
        this.$moveButton = null;
      }
    }
    makeMoveButton() {
      var toolbar = this.imager.getPluginInstance("Toolbar").toolbar;
      var $body2 = $("body");
      this.$moveButton = toolbar.addButton(
        "btn-move",
        "fa-arrows",
        translate("Move image"),
        () => {
        }
      );
      this.$moveButton.on(MOUSE_DOWN2, (event) => {
        if (event.type.indexOf("touch") > -1) {
          event = event.originalEvent;
        }
        $(".tooltip-btn-move").css("display", "none");
        var startLeft = this.imager.$imageElement.css("left").replace("px", "") | 0;
        var startTop = this.imager.$imageElement.css("top").replace("px", "") | 0;
        var mouseStartLeft = event.pageX;
        var mouseStartTop = event.pageY;
        $body2.on(MOUSE_MOVE2, (moveEvent) => {
          if (moveEvent.type.indexOf("touch") > -1) {
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
          this.imager.$imageElement.css({
            left: newLeft,
            top: newTop
          });
          this.imager.adjustEditContainer();
          moveEvent.preventDefault();
          moveEvent.stopPropagation();
          return false;
        });
        $body2.on(MOUSE_UP2, () => {
          $(".tooltip-btn-move").css("display", "block");
          $body2.off(MOUSE_MOVE2);
          $body2.off(MOUSE_UP2);
        });
      });
    }
  };

  // src/plugins/resize/Resize.js
  init_live_reload();
  var MOUSE_DOWN3 = mouseDown("imagerjsResize");
  var MOUSE_UP3 = mouseUp("imagerjsResize");
  var MOUSE_MOVE3 = mouseMove("imagerjsResize");
  var ResizePlugin = class {
    constructor(imagerInstance, options) {
      this.imager = imagerInstance;
      this.defaultOptions = {
        minWidth: 50,
        minHeight: 50,
        controlsCss: {},
        controlsTouchCss: {},
        doubleDiff: false
      };
      options = options ? options : {};
      this.options = $.extend(true, this.defaultOptions, options);
      this.weight = 99999;
    }
    onToolSelected() {
      if (this.$resizeSquare) {
        this.$resizeSquare.addClass("hidden");
      }
    }
    onToolApply() {
      if (this.$resizeSquare) {
        this.$resizeSquare.removeClass("hidden");
      }
    }
    onToolReject() {
      if (this.$resizeSquare) {
        this.$resizeSquare.removeClass("hidden");
      }
    }
    onEditStart() {
      var $resizeSquare = $('<div class="resize-square"></div>');
      if (this.imager.touchDevice) {
        $resizeSquare.css(this.options.controlsTouchCss);
      } else {
        $resizeSquare.css(this.options.controlsCss);
      }
      this.imager.$editContainer.append($resizeSquare);
      var $body2 = $("body");
      $resizeSquare.on(MOUSE_DOWN3, (downEvent) => {
        var startPos = getEventPosition(downEvent);
        var startDimensions = this.imager.getPreviewSize();
        const ratioWidth = startDimensions.height / startDimensions.width;
        const ratioHeight = startDimensions.width / startDimensions.height;
        $body2.on(MOUSE_MOVE3, (moveEvent) => {
          var movePos = getEventPosition(moveEvent);
          var leftDiff = movePos.left - startPos.left;
          var topDiff = movePos.top - startPos.top;
          if (this.options.doubleDiff) {
            leftDiff *= 2;
            topDiff *= 2;
          }
          var newWidth = startDimensions.width + leftDiff;
          var newHeight = startDimensions.height + topDiff;
          var fitSize = this.calcAspectRatio(
            startDimensions.width,
            startDimensions.height,
            newWidth,
            newHeight
          );
          newWidth = fitSize.width;
          newHeight = fitSize.height;
          if (newWidth < this.options.minWidth) {
            newWidth = this.options.minWidth;
          }
          if (newHeight < this.options.minHeight) {
            newHeight = this.options.minHeight;
          }
          this.imager.setPreviewSize(newWidth, newHeight);
          moveEvent.stopPropagation();
          moveEvent.preventDefault();
          return false;
        });
        $body2.on(MOUSE_UP3, (upEvent) => {
          $body2.off(MOUSE_UP3);
          $body2.off(MOUSE_MOVE3);
        });
        downEvent.stopPropagation();
        downEvent.preventDefault();
        return false;
      });
      this.$resizeSquare = $resizeSquare;
    }
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
    calcAspectRatio(srcWidth, srcHeight, maxWidth, maxHeight) {
      var ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
      return { width: srcWidth * ratio, height: srcHeight * ratio };
    }
  };

  // src/plugins/rotate/Rotate.js
  init_live_reload();
  var MOUSE_DOWN4 = mouseDown("imagerjsRotate");
  var MOUSE_UP4 = mouseUp("imagerjsRotate");
  var MOUSE_MOVE4 = mouseMove("imagerjsRotate");
  var RotatePlugin = class {
    constructor(imagerInstance, options) {
      this.imager = imagerInstance;
      this.defaultOptions = {
        controlsCss: {},
        controlsTouchCss: {}
      };
      options = options ? options : {};
      this.options = $.extend(true, this.defaultOptions, options);
      this.weight = -100;
      this.angle = 0;
      var previewSize = this.imager.getPreviewSize();
      this.controlsStartWidth = previewSize.width;
      this.controlsStartHeight = previewSize.height;
      this.widthDiff = 0;
      this.heightDiff = 0;
    }
    getButtons() {
      var group = {
        name: "Rotate",
        tooltip: translate("Rotate")
      };
      return [
        {
          classes: "btn-rotate",
          iconClasses: "fa-repeat",
          tooltip: translate("Rotate manually"),
          group,
          enabledHandler: (toolbar) => {
            this.startRotate();
            this.imager.render();
          },
          applyHandler: () => {
            this.imager.setWaiting(true);
            setTimeout(() => {
              this.applyHandler();
              this.imager.commitChanges("Rotate");
              this.reset();
              this.imager.setWaiting(false);
            }, 50);
          },
          rejectHandler: () => {
            this.setAngle(0);
            this.stopRotate();
          }
        },
        {
          group,
          classes: "btn-rotate btn-rotate-90",
          iconClasses: "fa-undo",
          tooltip: translate("Rotate 90 left"),
          enabledHandler: (toolbar) => {
            this.imager.setWaiting(true);
            setTimeout(() => {
              this.rotateByAngle(-90 * Math.PI / 180);
              this.imager.setWaiting(false);
            }, 50);
          }
        },
        {
          group,
          classes: "btn-rotate",
          iconClasses: "fa-repeat",
          tooltip: translate("Rotate 90 right"),
          enabledHandler: (toolbar) => {
            this.imager.setWaiting(true);
            setTimeout(() => {
              this.rotateByAngle(90 * Math.PI / 180);
              this.imager.setWaiting(false);
            }, 50);
          }
        }
      ];
    }
    applyHandler() {
      this.stopRotate();
    }
    rotateByAngle(angle) {
      var prevQuality = this.imager.quality;
      var prevTargetScale = this.imager.targetScale;
      this.imager.quality = 1;
      this.imager.targetScale = 1;
      this.startRotate();
      this.imager.render();
      this.setAngle(angle);
      this.imager.render();
      this.stopRotate();
      this.imager.commitChanges(translate("Rotate"));
      this.reset();
      this.imager.render();
      this.imager.quality = prevQuality;
      this.imager.targetScale = prevTargetScale;
    }
    startRotate() {
      var previewDimensions = this.imager.getPreviewSize();
      this.controlsStartWidth = this.imager.originalPreviewWidth;
      this.controlsStartHeight = this.imager.originalPreviewHeight;
      var $rotateControls = $(
        '<div class="imager-rotate-container"><div class="rotate-corner rotate-top-left"></div><div class="rotate-corner rotate-top-right"></div><div class="rotate-corner rotate-bottom-right"></div><div class="rotate-corner rotate-bottom-left"></div><div class="rotate-border rotate-border-top"></div><div class="rotate-border rotate-border-right"></div><div class="rotate-border rotate-border-bottom"></div><div class="rotate-border rotate-border-left"></div></div>'
      ).css({
        width: this.controlsStartWidth,
        height: this.controlsStartHeight
      });
      this.$rotateControls = $rotateControls;
      this.imager.$editContainer.append($rotateControls);
      var $corners = $rotateControls.find(".rotate-corner");
      if (this.imager.touchDevice) {
        $corners.css(this.options.controlsTouchCss);
      } else {
        $corners.css(this.options.controlsCss);
      }
      var $body2 = $("body");
      var imageOffset = $(this.imager.canvas).offset();
      this.centerX = imageOffset.left + this.controlsStartWidth / 2;
      this.centerY = imageOffset.top + this.controlsStartHeight / 2;
      this.setAngle(this.angle);
      $corners.on(MOUSE_DOWN4, (startEvent) => {
        this.prevAngle = this.angle * -1;
        var startPos = getEventPosition(startEvent);
        var startAngle = this.getAngle(
          this.centerX,
          this.centerY,
          startPos.left,
          startPos.top
        );
        $body2.on(MOUSE_MOVE4, (moveEvent) => {
          var movePos = getEventPosition(moveEvent);
          var currentAngle = this.getAngle(
            this.centerX,
            this.centerY,
            movePos.left,
            movePos.top
          );
          var newAngle = startAngle - currentAngle;
          this.angle = this.prevAngle + newAngle;
          this.angle *= -1;
          this.setAngle(this.angle);
          moveEvent.preventDefault();
          moveEvent.stopPropagation();
          return false;
        });
        $body2.on(MOUSE_UP4, (endEvent) => {
          $body2.off(MOUSE_UP4);
          $body2.off(MOUSE_MOVE4);
          this.lastAngle = this.angle;
        });
        startEvent.preventDefault();
        startEvent.stopPropagation();
        return false;
      });
    }
    stopRotate() {
      this.$rotateControls.remove();
      this.$rotateControls = null;
    }
    setAngle(angle) {
      this.angle = angle;
      this.$rotateControls.css("-webkit-transform", "rotate(" + angle + "rad)");
      var rotatedDimensions = this.getRotatedDimensions(
        this.controlsStartWidth,
        this.controlsStartHeight,
        angle
      );
      this.widthDiff = rotatedDimensions.width - this.controlsStartWidth;
      this.heightDiff = rotatedDimensions.height - this.controlsStartHeight;
      this.$rotateControls.css({
        top: this.heightDiff / 2,
        left: this.widthDiff / 2
      });
      this.imager.setPreviewSize(
        rotatedDimensions.width,
        rotatedDimensions.height
      );
      this.imager.render();
    }
    render(ctx) {
      var tempCtx = this.imager.tempCanvas.getContext("2d");
      tempCtx.clearRect(0, 0, tempCtx.canvas.width, tempCtx.canvas.height);
      var scaledWidthDiff = this.imager.convertScale(
        this.widthDiff,
        this.controlsStartWidth,
        ctx.canvas.width
      );
      var scaledHeightDiff = this.imager.convertScale(
        this.heightDiff,
        this.controlsStartHeight,
        ctx.canvas.height
      );
      tempCtx.canvas.width = ctx.canvas.width + scaledWidthDiff;
      tempCtx.canvas.height = ctx.canvas.height + scaledHeightDiff;
      this.rotateCanvas(tempCtx, this.angle);
      tempCtx.translate(scaledWidthDiff / 2, scaledHeightDiff / 2);
      tempCtx.drawImage(
        ctx.canvas,
        0,
        0,
        ctx.canvas.width,
        ctx.canvas.height,
        0,
        0,
        ctx.canvas.width,
        ctx.canvas.height
      );
      tempCtx.translate(-scaledWidthDiff / 2, -scaledHeightDiff / 2);
      this.restoreCanvasRotation(tempCtx, this.angle);
      ctx.canvas.width += scaledWidthDiff;
      ctx.canvas.height += scaledHeightDiff;
      this.imager.clearCanvas(ctx);
      var paddingWidth = 0;
      var paddingHeight = 0;
      if (this.$rotateControls) {
        paddingWidth = this.imager.convertScale(
          10,
          this.controlsStartWidth,
          ctx.canvas.width
        );
        paddingHeight = this.imager.convertScale(
          10,
          this.controlsStartHeight,
          ctx.canvas.height
        );
      }
      ctx.drawImage(
        tempCtx.canvas,
        0,
        // srcX
        0,
        // srcY
        tempCtx.canvas.width,
        // srcWidth
        tempCtx.canvas.height,
        // srcHeight
        paddingWidth,
        // destX
        paddingHeight,
        // destY
        ctx.canvas.width - paddingWidth * 2,
        // destWidth
        ctx.canvas.height - paddingHeight * 2
        // destHeight
      );
    }
    rotateCanvas(context, angle) {
      context.translate(context.canvas.width / 2, context.canvas.height / 2);
      context.rotate(angle);
      context.translate(-context.canvas.width / 2, -context.canvas.height / 2);
    }
    restoreCanvasRotation(context, angle) {
      context.translate(context.canvas.width / 2, context.canvas.height / 2);
      context.rotate(angle * -1);
      context.translate(-context.canvas.width / 2, -context.canvas.height / 2);
    }
    getRotatedDimensions(width, height, angle) {
      if (angle < 0) {
        angle *= -1;
      }
      if (angle > Math.PI * 2) {
        angle = angle - Math.PI * 2;
        angle = Math.PI * 2 - angle;
      }
      if (angle > Math.PI) {
        angle = angle - Math.PI;
        angle = Math.PI - angle;
      }
      if (angle > Math.PI / 2) {
        angle = angle - Math.PI / 2;
        angle = Math.PI / 2 - angle;
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
    }
    getAngle(x1, y1, x2, y2) {
      return Math.atan2(y2 - y1, x2 - x1);
    }
    deserialize(savedState) {
      if (savedState && savedState.angle) {
        this.angle = savedState.angle;
      }
    }
    serialize() {
      return {
        angle: this.angle
      };
    }
    /**
     * Reset all rotation related variables, so on the next rotation start
     * it will start from zeroed rotation.
     */
    reset() {
      this.widthDiff = 0;
      this.heightDiff = 0;
      this.angle = 0;
    }
  };

  // src/plugins/save/Save.js
  init_live_reload();
  var SavePlugin = class {
    constructor(imagerInstance, options) {
      this.imager = imagerInstance;
      this.defaultOptions = {
        upload: false,
        uploadFunction: null
      };
      options = options ? options : {};
      this.options = $.extend(true, this.defaultOptions, options);
    }
    getButtons() {
      return [
        {
          classes: "btn-save",
          iconClasses: "fa-save",
          tooltip: translate("Save"),
          enabledHandler: (toolbar) => {
            var contentConfig = this.imager.options.contentConfig;
            var saveFunc = contentConfig ? contentConfig.saveImageData : null;
            if (this.options.upload) {
              saveFunc = this.options.uploadFunction;
            }
            if (!saveFunc) {
              console.error(
                "No uploadFunction function provided in imager.options.contentConfig.saveImageData."
              );
            } else {
              saveFunc.call(
                this.imager,
                this.imager.$imageElement.attr("data-imager-id"),
                this.imager.$imageElement.attr("src"),
                (savedImageUrl) => {
                  this.imager.stopEditing();
                  this.imager.$imageElement.attr("src", savedImageUrl);
                }
              );
            }
          }
        }
      ];
    }
  };

  // src/plugins/toolbar/Toolbar.js
  init_live_reload();
  var ToolbarPlugin = class {
    constructor(imagerInstance, options) {
      this.imager = imagerInstance;
      options = options || {};
      var defaultOptions = {
        tooltipEnabled: true,
        tooltipCss: null
      };
      if (this.imager.touchDevice) {
        defaultOptions.tooltipEnabled = false;
      }
      this.options = $.extend(defaultOptions, options);
      this.activeButton = null;
      this.weight = -100;
    }
    /**
     * This method will be invoked by Imager when edit mode is enabled.
     */
    onEditStart() {
      this.toolbar = new Toolbar(this.options);
      this.toolbar.getElement().attr("data-sizeable", "toolbar-button").attr("data-cssrules", "top:($v * -1)");
      var getButtonsResults = this.imager.invokePluginsMethod("getButtons");
      for (var i = 0; i < getButtonsResults.length; i++) {
        var plugin = getButtonsResults[i].instance;
        var buttons = getButtonsResults[i].result;
        for (var b = 0; b < buttons.length; b++) {
          var btn = buttons[b];
          btn.plugin = plugin;
          var $button = null;
          if (btn.group === void 0) {
            $button = this.toolbar.addButton(
              btn.classes,
              btn.iconClasses,
              btn.tooltip,
              this.createHandler(btn)
            );
          } else {
            $button = this.toolbar.addButtonToGroup(
              btn.classes,
              btn.iconClasses,
              btn.tooltip,
              btn.group,
              this.createHandler(btn)
            );
          }
          if (btn.buttonCreatedHandler) {
            btn.buttonCreatedHandler($button);
          }
        }
      }
      this.imager.$editContainer.append(this.toolbar.getElement());
    }
    onRemove() {
      if (this.toolbar) {
        this.toolbar.remove();
      }
    }
    onEditStop() {
      if (this.toolbar) {
        this.toolbar.remove();
      }
    }
    createHandler(btn) {
      return () => {
        if (this.activeButton) {
          if (this.activeButton.disabledHandler) {
            this.activeButton.disabledHandler();
          }
        }
        this.toolbar.clearActiveButton();
        btn.enabledHandler();
        if (btn.applyHandler && btn.rejectHandler) {
          this.activeButton = btn;
          this.imager.trigger("toolSelected", btn);
          this.toolbar.setActiveButton(btn.classes);
          this.toolbar.getElement().addClass("hidden");
          this.createOperationToolbar(btn);
        }
        return false;
      };
    }
    createOperationToolbar(btn) {
      this.operationToolbar = new Toolbar(this.options);
      this.operationToolbar.addButton(
        "btn-accept",
        "fa-check",
        translate("Apply"),
        () => {
          btn.applyHandler();
          this.operationButtonHandler();
          this.imager.trigger("toolApply");
          return false;
        }
      );
      this.operationToolbar.addButton(
        "btn-reject",
        "fa-times",
        translate("Reject"),
        () => {
          btn.rejectHandler();
          this.operationButtonHandler();
          this.imager.trigger("toolReject");
          return false;
        }
      );
      this.imager.$editContainer.append(this.operationToolbar.getElement());
    }
    operationButtonHandler() {
      this.activeButton = null;
      this.removeOperationToolbar();
      this.toolbar.getElement().removeClass("hidden");
      this.toolbar.clearActiveButton();
    }
    removeOperationToolbar() {
      this.operationToolbar.remove();
      this.operationToolbar = null;
    }
    getActiveButton() {
      return this.activeButton;
    }
  };

  // src/plugins/undo/Undo.js
  init_live_reload();
  var UndoPlugin = class {
    constructor(imagerInstance, options) {
      this.imager = imagerInstance;
      this.$toolbarButton = null;
      options = options ? options : {};
      this.options = $.extend(true, this.defaultOptions, options);
    }
    getButtons() {
      return [
        {
          classes: "btn-undo",
          iconClasses: "fa-undo",
          tooltip: translate("Undo"),
          buttonCreatedHandler: ($btn) => {
            this.$toolbarButton = $btn;
          },
          enabledHandler: (toolbar) => {
            this.toolbar = toolbar;
            this.imager.setWaiting(true);
            setTimeout(() => {
              this.imager.historyUndo();
              this.imager.setWaiting(false);
            }, 50);
          }
        }
      ];
    }
    onHistoryChange() {
      if (this.imager.history.length > 1) {
        this.$toolbarButton.css({
          "pointer-events": "all"
        });
        this.$toolbarButton.find("a").css("color", "#333");
      } else {
        this.$toolbarButton.css({
          "pointer-events": "none"
        });
        this.$toolbarButton.find("a").css("color", "#C3C3C3");
      }
    }
  };

  // src/util/FileSelector.js
  init_live_reload();
  var FileSelector = class {
    constructor(accept) {
      this.acceptTypes = accept;
      this.$element = $(
        '<div class="file-selector"><input type="file" /><div class="drop-area">' + translate("Or drop files here") + '</div><div class="error-container bg-danger"></div></div>'
      );
      if (this.acceptTypes) {
        this.$element.find("input").attr("accept", this.acceptTypes);
      }
      this.$element.find("input").on("change", (e) => {
        if (e.target.files.length < 1) {
          this.showError(translate("No file selected."));
        }
        for (var i = 0; i < e.target.files.length; i++) {
          if (e.target.files[i].type.indexOf("image") < 0) {
            this.showError(translate("Incorrect file type"));
            return;
          }
        }
        this.parseFile(e.target.files[0]);
      });
      var $dropArea = this.$element.find(".drop-area");
      $dropArea.on("dragover", (e) => {
        e.stopPropagation();
        e.preventDefault();
        $dropArea.addClass("hover");
      });
      $dropArea.on("dragleave", (e) => {
        e.stopPropagation();
        e.preventDefault();
        $dropArea.removeClass("hover");
      });
      $dropArea.on("drop", (e) => {
        e.stopPropagation();
        e.preventDefault();
        $dropArea.removeClass("hover");
        var files = e.originalEvent.dataTransfer.files;
        if (files.length < 1) {
          this.showError(translate("No file selected."));
          return;
        }
        for (var i = 0; i < files.length; i++) {
          if (files[i].type.indexOf("image") < 0) {
            this.showError(translate("Incorrect file type."));
            return;
          }
        }
        this.parseFile(files[0]);
      });
    }
    parseFile(file) {
      var fileReader = new FileReader();
      fileReader.onload = (onloadEvent) => {
        this.$element.trigger("fileSelected.fileSelector", {
          info: file,
          data: fileReader.result
        });
      };
      fileReader.readAsDataURL(file);
    }
    onFileSelected(handler) {
      this.$element.on(
        "fileSelected.fileSelector",
        (event, file) => handler(file)
      );
    }
    showError(error) {
      this.$element.find(".error-container").html(error);
      this.$element.find(".error-container").slideDown(200);
      setTimeout(() => this.$element.find(".error-container").slideUp(200), 2e3);
    }
    getElement() {
      return this.$element;
    }
    hide() {
      this.$element.hide();
    }
    show() {
      this.$element.show();
    }
  };

  // src/ImagerJs.js
  var imagerInstances = [];
  var pluginsCatalog = [
    Modal2,
    Toolbar,
    CropPlugin,
    DeletePlugin,
    PropertiesPlugin,
    ResizePlugin,
    RotatePlugin,
    SavePlugin,
    ToolbarPlugin,
    UndoPlugin
  ];
  var PLATFORM = {
    ios: "ios",
    android: "android",
    windowsMobile: "windowsMobile",
    genericMobile: "genericMobile"
  };
  var Imager = class {
    constructor($imageElement, options) {
      this.$imageElement = $($imageElement);
      this.defaultOptions = {
        saveData: void 0,
        loadData: void 0,
        quality: 1,
        targetScale: 1,
        plugins: [],
        format: void 0,
        toolbarButtonSize: 32,
        toolbarButtonSizeTouch: 50,
        editModeCss: {
          border: "1px solid white"
        },
        pluginsConfig: {},
        detectTouch: null,
        waitingCursor: "wait",
        imageSizeForPerformanceWarning: 1e6,
        // 1 MB
        maxImageWidth: 2048,
        maxImageHeight: 2048
      };
      options = options ? options : {};
      this.options = $.extend(true, this.defaultOptions, options);
      this.debug = false;
      this.showTemporaryCanvas = false;
      this.targetScale = this.options.targetScale;
      this.quality = this.options.quality;
      this._eventEmitter = $({});
      this._isInEditMode = false;
      this.history = [];
      imagerInstances.push(this);
      this.originalExif = null;
      this.detectPlatform();
      if (!this.options.canvasSizeLimit) {
        if ([PLATFORM.ios, PLATFORM.android, PLATFORM.windowsMobile].indexOf(
          this.platform
        ) !== -1) {
          this.canvasSizeLimit = 5 * 1024 * 1024;
        } else {
          this.canvasSizeLimit = 32 * 1024 * 1024;
        }
      }
      this.$originalImage = this.$imageElement.clone();
      this.pluginsInstances = null;
      this.instantiatePlugins(pluginsCatalog);
      $("body").on("imagerResize", () => {
        this.adjustEditContainer();
      });
      $(window).on("resize", () => {
        this.adjustEditContainer();
      });
    }
    destroy() {
    }
    on(event, handler) {
      this._eventEmitter.on(event, handler);
    }
    off(event) {
      this._eventEmitter.off(event);
    }
    trigger(event, args) {
      this._eventEmitter.trigger(event, args);
      var eventMethodName = "on" + event.substr(0, 1).toUpperCase() + event.substr(1);
      for (var i = 0; i < this.pluginsInstances.length; i++) {
        var p = this.pluginsInstances[i];
        if (p[eventMethodName] !== void 0) {
          p[eventMethodName](args);
        }
      }
    }
    log() {
      if (this.debug) {
        var args = Array.prototype.slice.call(arguments);
        console.log.apply(console, args);
      }
    }
    invokePluginsMethod(methodName) {
      var results = [];
      var args = Array.prototype.slice.call(arguments);
      args = args.slice(1);
      for (var i = 0; i < this.pluginsInstances.length; i++) {
        var p = this.pluginsInstances[i];
        if (p[methodName] !== void 0) {
          var result = p[methodName].apply(p, args);
          if (result) {
            results.push({
              name: p.__name,
              instance: p,
              result
            });
          }
        }
      }
      return results;
    }
    /**
     * Sorts plugins based in their `weight`
     */
    pluginSort(p1, p2) {
      if (p1.weight === void 0 || p2.weight === null) {
        p1.weight = Infinity;
      }
      if (p2.weight === void 0 || p2.weight === null) {
        p2.weight = Infinity;
      }
      if (p1.weight < p2.weight) {
        return -1;
      }
      if (p1.weight > p2.weight) {
        return 1;
      }
      return 0;
    }
    /*
     * Iterates through plugins array from config and instantiates them.
     */
    instantiatePlugins(plugins) {
      this.pluginsInstances = plugins.map(
        (t) => new t(this, {})
        // this.options.pluginsConfig[pluginName]  TODO
      );
      this.pluginsInstances.sort(this.pluginSort);
    }
    /**
     * This function should be called when image's `src` attribute is changed from outside of the imager.
     * It checks `src` attribute, detects image format, prepares image (rotates it according to EXIF for example)
     * and triggers `ready` event on imager.
     */
    handleImageElementSrcChanged() {
      if (!this.options.format) {
        this.options.format = this.getImageFormat(this.$imageElement.attr("src"));
      }
      if (this.$imageElement.attr("data-imager-id")) {
        this.id = this.$imageElement.attr("data-imager-id");
        if (this.$imageElement.attr("src").length < 1) {
          throw new Error(
            "Imager was initialized on an empty image. Please check image's `src` attribute. It should not be empty."
          );
        }
      } else {
        this.id = nanoid();
        this.$imageElement.attr("data-imager-id", this.id);
      }
      this.fixImageSizeAndRotation(this.$imageElement).then((imageData) => {
        this.$imageElement.attr("src", imageData);
        this.$imageElement.attr("imager-attached", true);
      }).fail((err) => {
        console.error(err);
      });
      this.$imageElement.on("load.imagerInit", () => {
        this.$imageElement.off("load.imagerInit");
        this.trigger("ready");
      });
    }
    /**
     * Prepares image after first loading. It checks image EXIF data and fixes it's rotation,
     * scales image down if it's too large.
     *
     * @param {HTMLImageElement} $image
     * @returns {jQuery.Deferred.<string>} Image data base64 string
     */
    fixImageSizeAndRotation($image) {
      var deferred = $.Deferred();
      var imageSrc = $image.attr("src");
      if (imageSrc.length < 1) {
        return $.when("");
      } else if (imageSrc.indexOf("data:image") === 0) {
        return this._fixBase64ImageSizeAndRotation(imageSrc);
      } else if (imageSrc.indexOf("http") === 0) {
        var xhr = new XMLHttpRequest();
        xhr.responseType = "blob";
        xhr.onload = () => {
          var reader = new FileReader();
          reader.onloadend = () => {
            this._fixBase64ImageSizeAndRotation(reader.result).then(
              (imageData) => deferred.resolve(imageData)
            );
          };
          reader.onerror = (err) => {
            deferred.reject(err);
          };
          reader.readAsDataURL(xhr.response);
        };
        xhr.open("GET", imageSrc);
        xhr.send();
        return deferred.promise();
      } else {
        console.error("Unsupported image `src`!");
        return $.when("");
      }
    }
    /**
     * Base64 image data could contain EXIF data which causes
     * @param imageBase64Data
     * @returns {*}
     * @private
     */
    _fixBase64ImageSizeAndRotation(imageBase64Data) {
      var deferred = $.Deferred();
      var imageFormat = this.getImageFormat(this.$imageElement.attr("src"));
      if (imageFormat === "jpeg" || imageFormat === "jpg") {
        this.originalExif = import_piexifjs.default.load(imageBase64Data);
        var originalOrientation = this.originalExif["0th"][import_piexifjs.default.ImageIFD.Orientation];
        this.originalExif["0th"][import_piexifjs.default.ImageIFD.Orientation] = 1;
        imageBase64Data = import_piexifjs.default.insert(
          import_piexifjs.default.dump(this.originalExif),
          imageBase64Data
        );
      }
      var image = document.createElement("img");
      image.onload = () => {
        var canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        var ctx = canvas.getContext("2d");
        if (imageFormat === "jpeg" || imageFormat === "jpg") {
          switch (originalOrientation) {
            case 2:
              ctx.translate(canvas.width, 0);
              ctx.scale(-1, 1);
              break;
            case 3:
              ctx.translate(canvas.width, canvas.height);
              ctx.rotate(Math.PI);
              break;
            case 4:
              ctx.translate(0, canvas.height);
              ctx.scale(1, -1);
              break;
            case 5:
              canvas.width = image.naturalHeight;
              canvas.height = image.naturalWidth;
              ctx.rotate(0.5 * Math.PI);
              ctx.scale(1, -1);
              break;
            case 6:
              canvas.width = image.naturalHeight;
              canvas.height = image.naturalWidth;
              ctx.translate(canvas.width, 0);
              ctx.rotate(0.5 * Math.PI);
              break;
            case 7:
              canvas.width = image.naturalHeight;
              canvas.height = image.naturalWidth;
              ctx.rotate(0.5 * Math.PI);
              ctx.translate(canvas.width, -canvas.height);
              ctx.scale(-1, 1);
              break;
            case 8:
              canvas.width = image.naturalHeight;
              canvas.height = image.naturalWidth;
              ctx.rotate(-0.5 * Math.PI);
              ctx.translate(-canvas.width, 0);
              break;
          }
        }
        ctx.drawImage(image, 0, 0);
        if (canvas.width > this.options.maxImageWidth) {
          var newWidth = this.options.maxImageWidth;
          var scalePercent = this.options.maxImageWidth * 100 / canvas.width;
          var newHeight = scalePercent * canvas.height / 100;
          this.log(
            "Image is bigger than we could handle, resizing to",
            newWidth,
            newHeight
          );
          resizeImage(
            canvas,
            canvas.width,
            canvas.height,
            newWidth,
            newHeight
          );
        }
        deferred.resolve(canvas.toDataURL(this.options.format));
      };
      image.src = imageBase64Data;
      return deferred.promise();
    }
    init(file) {
      var onImageLoad = () => {
        this.$imageElement.off("load", onImageLoad);
        this.handleImageElementSrcChanged();
      };
      setTimeout(() => {
        this.$imageElement.attr("src", file.data);
        this.$imageElement.css("height", "auto");
        this.$imageElement.css("min-height", "inherit");
        this.$imageElement.css("min-width", "inherit");
        this.$imageElement.on("load", onImageLoad);
      }, 200);
    }
    startEditing() {
      this.log("startEditing()");
      this.hideOriginalImage();
      if (!this.$imageElement[0].complete) {
        throw new Error(
          "Trying to start editing image that was not yet loaded. Please add `ready` event listener to imager."
        );
      }
      this.originalPreviewWidth = this.$imageElement.width();
      this.originalPreviewHeight = this.$imageElement.height();
      this.$editContainer = $(
        '<div class="imager-edit-container" tabindex="1"></div>'
      );
      if (this.options.editModeCss) {
        this.$editContainer.css(this.options.editModeCss);
      }
      $("body").append(this.$editContainer);
      this._createEditCanvas();
      this.adjustEditContainer();
      this.trigger("editStart");
      this.render();
      this._isInEditMode = true;
      this.$editContainer.focus();
      var sizeInBytes = this.getDataSize();
      if (sizeInBytes > this.options.imageSizeForPerformanceWarning) {
        setOverlayMessage(
          this.$editContainer,
          "Image is too big and could cause very poor performance.",
          "default",
          "Ok",
          () => removeOverlayMessage(this.$editContainer)
        );
      }
      this._adjustElementsSize(
        "toolbar-button",
        this.touchDevice ? this.options.toolbarButtonSizeTouch : this.options.toolbarButtonSize
      );
      if (this.history.length === 0) {
        this.commitChanges("Original");
      }
      this.trigger("historyChange");
    }
    stopEditing() {
      if (!this._isInEditMode) {
        return;
      }
      this.showOriginalImage();
      this.render();
      var pluginsDataRaw = this.invokePluginsMethod("serialize");
      var pluginsData = {};
      $(pluginsDataRaw).each((i, d) => {
        pluginsData[d.name] = d.result;
      });
      var imageData = null;
      try {
        imageData = this.canvas.toDataURL(
          "image/" + this.options.format,
          this.quality
        );
      } catch (err) {
        if (err.name && err.name === "SecurityError") {
          console.error(
            "Failed to get image data from canvas because of security error.Usually this happens when image drawed on canvas is located on separate domain withoutproper access-control headers."
          );
        } else {
          console.error(err);
        }
      }
      if (!imageData) {
        console.error("Failed to get image data from canvas.");
      }
      this.$imageElement.attr("src", imageData);
      this.$editContainer.remove();
      this.$editContainer = null;
      this.canvas = null;
      this.tempCanvas = null;
      this.trigger("editStop", {
        imageData,
        pluginsData
      });
      this._isInEditMode = false;
    }
    /**
     * Change the container's z-index property.
     *
     * @param zIndexValue
     */
    setZindex(zIndexValue) {
      if (this.$editContainer) {
        this.$editContainer.css("z-index", zIndexValue);
      }
    }
    /**
     * Stores current image to history, then renders current canvas into image.
     *
     * @param operationMessage
     */
    commitChanges(operationMessage, callback) {
      var originalQuality = this.quality;
      var originalTargetScale = this.targetScale;
      this.quality = 1;
      this.targetScale = 1;
      this.adjustCanvasSize();
      this.render();
      const imageLoadHandler = () => {
        this.$imageElement.off("load", imageLoadHandler);
        this.quality = originalQuality;
        this.targetScale = originalTargetScale;
        this.adjustCanvasSize();
        this.history.push({
          message: operationMessage,
          image: imageData,
          width: this.$imageElement.width(),
          height: this.$imageElement.height()
        });
        this.originalPreviewWidth = this.$imageElement.width();
        this.originalPreviewHeight = this.$imageElement.height();
        this.render();
        this.trigger("historyChange");
        if (callback && callback instanceof Function) {
          callback();
        }
      };
      const onImageLoadError = (event) => {
        console.warn("commitChanges() : image failed to load :", event);
      };
      var imageData = this.canvas.toDataURL("image/" + this.options.format, 100);
      this.$imageElement.on("load", imageLoadHandler);
      this.$imageElement.on("error", onImageLoadError);
      this.$imageElement.attr("src", imageData);
    }
    isInEditMode() {
      return this._isInEditMode;
    }
    /**
     * Creates canvas for showing temporary edited image.
     * Created temporary canvas for drawing temporary data by plugins etc.
     *
     * Those canvases could be accessed as this.canvas and this.tempCanvas.
     *
     * @private
     */
    _createEditCanvas() {
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
      this.tempCanvas = document.createElement("canvas");
      this.tempCanvas.width = imageNaturalWidth;
      this.tempCanvas.height = imageNaturalHeight;
      if (this.showTemporaryCanvas) {
        $("body").append(this.tempCanvas);
        $(this.tempCanvas).css({
          position: "absolute",
          left: "50px",
          top: "50px",
          width: imageWidth
        });
      }
    }
    /**
     * Renders image on temporary canvas and then invokes plugin methods
     * that shoul modify image.
     *
     * @param [ctx] Context on which to draw image.
     */
    render(ctx) {
      ctx = ctx !== void 0 ? ctx : this.canvas.getContext("2d");
      var realWidth = this.$imageElement[0].naturalWidth;
      var realHeight = this.$imageElement[0].naturalHeight;
      if (realWidth === 0 || realHeight === 0) {
        console.warn("Trying to render canvas with zero width or height");
        console.trace();
        return;
      }
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
        destWidth,
        destHeight,
        paddingWidth: 0,
        paddingHeight: 0
      };
      this.drawImage(this.$imageElement, ctx, viewPort);
      this.invokePluginsMethod("render", ctx);
    }
    clearCanvas(ctx) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      if (this.options.format == "jpeg") {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      }
    }
    drawImage($img, ctx, viewPort) {
      if (ctx.canvas.width === 0 || ctx.canvas.height === 0) {
        console.warn(
          "Imager.drawImage() : Trying to render canvas with either width or height equal to 0"
        );
        return;
      }
      this._drawWithScaling(
        $img,
        ctx,
        this.tempCanvas.getContext("2d"),
        viewPort.sourceLeft,
        viewPort.sourceTop,
        viewPort.sourceWidth,
        viewPort.sourceHeight,
        viewPort.destLeft,
        viewPort.destTop,
        viewPort.destWidth,
        viewPort.destHeight,
        viewPort.paddingWidth,
        viewPort.paddingHeight
      );
    }
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
    _drawWithScaling($img, ctx, tempCtx, sourceLeft, sourceTop, sourceWidth, sourceHeight, destLeft, destTop, destWidth, destHeight, paddingWidth, paddingHeight) {
      paddingWidth = paddingWidth !== void 0 ? paddingWidth : 0;
      paddingHeight = paddingHeight !== void 0 ? paddingHeight : 0;
      sourceLeft = sourceLeft !== void 0 ? sourceLeft : 0;
      sourceTop = sourceTop !== void 0 ? sourceTop : 0;
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
      tempCtx.drawImage(
        img,
        currentStepSourceLeft,
        currentStepSourceTop,
        sourceWidth,
        sourceHeight,
        0,
        0,
        currentStepWidth,
        currentStepHeight
      );
      for (var s = 0; s < steps; s++) {
        if (currentStepWidth <= destWidth * 2 || currentStepHeight <= destHeight * 2) {
          break;
        }
        var prevStepWidth = currentStepWidth;
        var prevStepHeight = currentStepHeight;
        currentStepWidth *= step;
        currentStepHeight *= step;
        currentStepSourceLeft *= step;
        currentStepSourceTop *= step;
        var stepTempCanvas = document.createElement("canvas");
        stepTempCanvas.width = tempCtx.canvas.width;
        stepTempCanvas.height = tempCtx.canvas.height;
        var stepTempCtx = stepTempCanvas.getContext("2d");
        stepTempCtx.clearRect(0, 0, stepTempCanvas.width, stepTempCanvas.height);
        stepTempCtx.drawImage(
          tempCanvas,
          currentStepSourceLeft,
          currentStepSourceTop,
          prevStepWidth,
          prevStepHeight,
          0,
          0,
          currentStepWidth,
          currentStepHeight
        );
        tempCtx.clearRect(0, 0, tempCtx.canvas.width, tempCtx.canvas.height);
        tempCtx.drawImage(
          stepTempCanvas,
          0,
          0,
          currentStepWidth,
          currentStepHeight,
          0,
          0,
          currentStepWidth,
          currentStepHeight
        );
      }
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.drawImage(
        tempCanvas,
        0,
        0,
        currentStepWidth,
        currentStepHeight,
        destLeft + paddingWidthHalf,
        destTop + paddingHeightHalf,
        destWidth - paddingWidth,
        destHeight - paddingHeight
      );
    }
    /**
     * Sets preview area dimensions.
     * Note that this affects only the size of image that user sees.
     * Internal image size is not affected.
     *
     * @param {number} width
     * @param {number} height
     */
    setPreviewSize(width, height) {
      this.$imageElement.css({
        width,
        height
      });
      $(this.canvas).css({
        width,
        height
      });
      $("body").trigger("imagerResize");
      this.log("resize trigger");
      this.originalPreviewWidth = this.$imageElement.width();
      this.originalPreviewHeight = this.$imageElement.height();
    }
    getPreviewSize() {
      return {
        width: this.$imageElement.width(),
        height: this.$imageElement.height()
      };
    }
    getImageRealSize() {
      return {
        width: this.$imageElement[0].naturalWidth,
        height: this.$imageElement[0].naturalHeight
      };
    }
    getCanvasSize() {
      return {
        width: this.canvas.width,
        height: this.canvas.height
      };
    }
    convertScale(value, sourceMax, targetMax) {
      var valueInPercents = value * 100 / sourceMax;
      return valueInPercents * targetMax / 100;
    }
    hideOriginalImage() {
      this.$imageElement.css("opacity", 0);
    }
    showOriginalImage() {
      this.$imageElement.css("opacity", 1);
    }
    /**
     * Takes image's real size (naturalWidth & naturalHeight)
     * and adjust canvas size to match that
     * but with respect to aspect ratio of preview viewport size.
     */
    adjustCanvasSize() {
      var imageRealSize = this.getImageRealSize();
      var previewSize = this.getPreviewSize();
      var newCanvasWidth = 0;
      var newCanvasHeight = 0;
      var aspectRatio = 0;
      if (previewSize.width > previewSize.height) {
        newCanvasWidth = imageRealSize.width;
        aspectRatio = previewSize.height * 100 / previewSize.width;
        newCanvasHeight = aspectRatio * newCanvasWidth / 100;
      } else {
        newCanvasHeight = imageRealSize.height;
        aspectRatio = previewSize.width * 100 / previewSize.height;
        newCanvasWidth = aspectRatio * newCanvasHeight / 100;
      }
      this.canvas.width = newCanvasWidth * this.targetScale;
      this.canvas.height = newCanvasHeight * this.targetScale;
      this.canvasSizeLimit = 1 * 1024 * 1024;
      if (this.canvasSizeLimit) {
        if (this.canvas.width * this.canvas.height > this.canvasSizeLimit) {
          console.warn(
            "adjustCanvasSize(): canvas size is too big : ",
            this.canvas.width,
            this.canvas.height
          );
          var ratio = 0.95 * this.canvasSizeLimit / (this.canvas.width * this.canvas.height);
          this.canvas.width = this.canvas.width * ratio;
          this.canvas.height = this.canvas.height * ratio;
          console.warn(
            "adjustCanvasSize(): canvas was reduced to : ",
            this.canvas.width,
            this.canvas.height
          );
        }
      }
    }
    /**
     * Positions $editContained with absolute coordinates
     * to be on top of $imageElement.
     */
    adjustEditContainer() {
      var imageOffset = this.$imageElement.offset();
      if (this.$editContainer) {
        this.$editContainer.css({
          left: imageOffset.left,
          top: imageOffset.top,
          width: this.$imageElement.width(),
          height: this.$imageElement.height()
        });
      }
    }
    restoreOriginal() {
      this.$imageElement.replaceWith(this.$originalImage);
    }
    historyUndo() {
      if (this.history.length < 2) {
        return;
      }
      var lastEntry = this.history[this.history.length - 2];
      const imageLoadHandler = () => {
        this.$imageElement.off("load", imageLoadHandler);
        this.originalPreviewWidth = this.$imageElement.width();
        this.originalPreviewHeight = this.$imageElement.height();
        this.setPreviewSize(lastEntry.width, lastEntry.height);
        this.render();
        this.history.splice(this.history.length - 1, 1);
        this.trigger("historyChange");
      };
      this.$imageElement.on("load", imageLoadHandler);
      this.$imageElement.attr("src", lastEntry.image);
      this.$imageElement.width(lastEntry.width);
      this.$imageElement.height(lastEntry.height);
    }
    remove(removeImage) {
      this.trigger("remove");
      this.$imageElement.removeAttr("imager-attached");
      this.stopEditing();
      this.showOriginalImage();
      var index = imagerInstances.indexOf(this);
      imagerInstances.splice(index, 1);
      this.$originalImage = null;
      this.pluginsInstances = null;
      if (removeImage) {
        this.$imageElement.remove();
      }
    }
    /**
     * Returns current image data in bytes.
     *
     * @returns {number} Bytes number
     */
    getDataSize() {
      var head = "data:image/" + this.options.format + ";base64,";
      var data = this.canvas.toDataURL(
        "image/" + this.options.format,
        this.quality
      );
      var size = Math.round((data.length - head.length) * 3 / 4);
      return size;
    }
    /**
     * Tries to find Imager instance associated with provided img element.
     *
     * @param $img {HTMLImageElement|jQuery}
     * @returns {Imager|undefined}
     */
    static getImagerFor($img) {
      for (var i = 0; i < imagerInstances.length; i++) {
        var imager = imagerInstances[i];
        if (imager.id == $($img).attr("data-imager-id")) {
          return imager;
        }
      }
      return void 0;
    }
    static isImagerAttached($elem) {
      return $($elem).attr("imager-attached") !== void 0;
    }
    /**
     * @param {boolean} waiting Waiting status. TRUE for adding 'waiting' text,
     * false to remove.
     */
    setWaiting(waiting) {
      if (waiting) {
        if (this.$editContainer) {
          setWaiting(
            this.$editContainer,
            translate("Please wait..."),
            this.options.waitingCursor
          );
        }
      } else {
        stopWaiting(this.$editContainer);
      }
    }
    /**
     * Detects image format for either base64 encoded string or http:// url.
     * @param {string} imageSrc
     */
    getImageFormat(imageSrc) {
      if (!imageSrc) {
        return;
      }
      var extension;
      if (imageSrc.indexOf("http") === 0) {
        extension = imageSrc.split(".").pop();
        if (extension == "jpeg") {
          extension = "jpeg";
        } else if (extension == "jpg") {
          extension = "jpeg";
        } else if (extension == "png") {
          extension = "png";
        }
      } else if (imageSrc.indexOf("data:image") === 0) {
        if (imageSrc[11] == "j") {
          extension = "jpeg";
        } else if (imageSrc[11] == "p") {
          extension = "png";
        }
      }
      return extension;
    }
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
    _adjustElementsSize(namespace, newSize) {
      var elementsToResize = $("[data-sizeable=" + namespace + "]");
      for (var i = 0; i < elementsToResize.length; i++) {
        var elem = elementsToResize[i];
        var attributesToChange = $(elem).attr("data-cssrules").split(",");
        for (var a = 0; a < attributesToChange.length; a++) {
          var attrName = attributesToChange[a];
          var attrVal = newSize;
          if (attrName[0] == "-") {
            attrName = attrName.substr(1);
            attrVal = "-" + newSize;
          }
          var matches = attrName.match(/:\((.+)\)/);
          if (matches) {
            attrName = attrName.replace(matches[0], "");
            var expression = matches[1];
            expression = expression.replace("$v", attrVal);
            var result = new Function("return " + expression)();
            attrVal = result;
          }
          $(elem).css(attrName, attrVal + "px");
        }
      }
    }
    /**
     * Crude detection of device and platform.
     * Sets this.platform and this.touchDevice.
     * @todo this is BAD. Use more precise methods or some lib
     */
    detectPlatform() {
      if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        this.platform = PLATFORM.ios;
      } else if (/Android|BlackBerry/i.test(navigator.userAgent)) {
        this.platform = PLATFORM.android;
      } else if (/IEMobile/i.test(navigator.userAgent)) {
        this.platform = PLATFORM.windowsMobile;
      }
      if (this.options.detectTouch && this.options.detectTouch.constructor.name !== "Function") {
        console.error(
          "detectTouch should be a function which will be called when Imager needs to determine whether it is working on touch device"
        );
        this.options.detectTouch = null;
      }
      if (this.options.detectTouch) {
        this.touchDevice = this.options.detectTouch(this);
      } else {
        this.touchDevice = /(iPhone|iPod|iPad|BlackBerry|Android)/i.test(
          navigator.userAgent
        );
      }
      $("body").on("touchstart.DrawerTouchCheck", () => {
        this.touchDevice = true;
        $("body").off("touchstart.DrawerTouchCheck");
        this.log("Found touch screen.");
      });
    }
  };

  // src/main.js
  window.ImagerJs = {
    Imager,
    FileSelector
  };
})();
