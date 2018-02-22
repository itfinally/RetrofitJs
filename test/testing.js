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
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
let retrofit = __1.Retrofit.getBuilder()
    .setConfig({
    baseURL: "http://127.0.0.1:8080",
    maxTry: 3,
    debug: true,
    timeout: 2000
})
    .build();
class Parent {
    demo1() {
    }
}
__decorate([
    __1.GET("/a1_testing/:a1"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], Parent.prototype, "demo1", null);
let TestingClient = class TestingClient extends Parent {
};
TestingClient = __decorate([
    __1.HTTP("/test")
], TestingClient);
__1.Retrofit.use(new class MyInterceptor {
    constructor() {
        this.order = 24;
    }
    init(config) {
    }
    intercept(chain) {
        console.log("123");
        return chain.proceed(chain.request());
    }
});
let client = retrofit.create(TestingClient);
client.demo1().then(response => {
    console.log(response);
});
//# sourceMappingURL=testing.js.map