import { Chain, GET, HTTP, Interceptor, ResponseInterface, Retrofit, RetrofitConfig, RetrofitPromise } from "..";


let retrofit = Retrofit.getBuilder()
  .setConfig<RetrofitConfig>( {
    baseURL: "http://127.0.0.1:8080",
    maxTry: 3,
    debug: true,
    timeout: 2000
  } )
  .build();

class Parent {
  @GET( "/a1_testing" )
  public demo1(): RetrofitPromise<string> {
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
    return chain.proceed( chain.request() );
  }
} );

let client: TestingClient = retrofit.create( TestingClient );
client.demo1().then( response => {
  console.log( response );
} );