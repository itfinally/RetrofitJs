"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _dec, _dec2, _dec3, _dec4, _class, _desc, _value, _class2;

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) {
  var desc = {};
  Object['ke' + 'ys'](descriptor).forEach(function (key) {
    desc[key] = descriptor[key];
  });
  desc.enumerable = !!desc.enumerable;
  desc.configurable = !!desc.configurable;

  if ('value' in desc || desc.initializer) {
    desc.writable = true;
  }

  desc = decorators.slice().reverse().reduce(function (desc, decorator) {
    return decorator(target, property, desc) || desc;
  }, desc);

  if (context && desc.initializer !== void 0) {
    desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
    desc.initializer = undefined;
  }

  if (desc.initializer === void 0) {
    Object['define' + 'Property'](target, property, desc);
    desc = null;
  }

  return desc;
}

require("babel-polyfill");

var _require = require(".."),
    Retrofit = _require.Retrofit,
    HTTP = _require.HTTP,
    GET = _require.GET,
    ResponseBody = _require.ResponseBody,
    ResponseType = _require.ResponseType,
    Config = _require.Config,
    MultiPart = _require.MultiPart,
    Part = _require.Part,
    PUT = _require.PUT;

var fs = require("fs");

var retrofit = Retrofit.getBuilder().setConfig({
  baseURL: "http://192.168.1.113:8080",
  debug: true
}).build();

var TestingClient = (_dec = HTTP("/test"), _dec2 = GET("/download_test"), _dec3 = ResponseBody(ResponseType.DOCUMENT), _dec4 = PUT("/upload"), _dec(_class = (_class2 = function () {
  function TestingClient() {
    _classCallCheck(this, TestingClient);
  }

  _createClass(TestingClient, [{
    key: "download",
    value: function download(config) {}
  }, {
    key: "upload",
    value: function upload(file, name) {}
  }]);

  return TestingClient;
}(), (_applyDecoratedDescriptor(_class2.prototype, "download", [_dec2, _dec3], Object.getOwnPropertyDescriptor(_class2.prototype, "download"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "upload", [MultiPart, _dec4], Object.getOwnPropertyDescriptor(_class2.prototype, "upload"), _class2.prototype)), _class2)) || _class);


var client = retrofit.create(TestingClient);

// ( <any>document.getElementById( "submit" ) ).onclick = () => {
//   client.upload( ( <any>document.getElementById( "file" ) ).files[ 0 ], "test222" ).then( response => {
//     console.log( response );
//   } );
// };

_asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
  return regeneratorRuntime.wrap(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          client.upload(fs.createReadStream("/Users/itfinally/crm.sql"), "test222").then(function (response) {
            console.log(response);
          }).catch(function (reason) {
            console.log(reason);
          });

        case 1:
        case "end":
          return _context.stop();
      }
    }
  }, _callee, undefined);
}))();
