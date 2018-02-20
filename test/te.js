"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("../index");
const fs = require("fs");
let retrofit = __1.Retrofit.getBuilder()
    .setConfig({
    baseURL: "http://192.168.1.113:8080",
    timeout: 3000,
    debug: true
})
    .setErrorHandler({
    handler(realReason, exception) {
        console.log(arguments);
    }
})
    .build();
let TestingClient = class TestingClient {
    download(config) {
    }
    upload(file, name) {
    }
};
__decorate([
    __1.GET("/download_test"),
    __1.ResponseBody(__1.ResponseType.DOCUMENT),
    __param(0, __1.Config),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Object)
], TestingClient.prototype, "download", null);
__decorate([
    __1.MultiPart,
    __1.PUT("/upload"),
    __param(0, __1.Part("file")), __param(1, __1.Part("name")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Object)
], TestingClient.prototype, "upload", null);
TestingClient = __decorate([
    __1.HTTP("/test")
], TestingClient);
let client = retrofit.create(TestingClient);
(() => __awaiter(this, void 0, void 0, function* () {
    client.upload(fs.createReadStream("/Users/itfinally/crm.sql"), "test222").then(response => {
        console.log(response);
    }).catch(reason => {
        console.log(reason);
    });
}))();
;
//# sourceMappingURL=te.js.map