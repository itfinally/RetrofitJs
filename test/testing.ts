import { ResponseInterface, GET, HTTP, Retrofit, RetrofitConfig, RetrofitPromise, Chain, Interceptor } from "..";


let retrofit = Retrofit.getBuilder()
  .setConfig<RetrofitConfig>( {
    baseURL: "http://127.0.0.1:8080",
    maxTry: 3,
    debug: true,
    timeout: 2000
  } )
  .build();

class Parent {
  @GET( "/a1_testing/:a1" )
  public demo1(): RetrofitPromise<string> & void {
  }
}

@HTTP( "/test" )
class TestingClient extends Parent {
}

Retrofit.use( new class MyInterceptor implements Interceptor {
  public order: number = 24;

  init( config: RetrofitConfig ): void {
  }

  intercept( chain: Chain ): Promise<ResponseInterface<any>> {
    console.log("123");
    return chain.proceed(chain.request());
  }
} );

let client: TestingClient = retrofit.create( TestingClient );
client.demo1().then( response => {
  console.log( response );
} );