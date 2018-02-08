import { HTTP, GET, Path, Header, Headers } from "./src/decorators";
import { Retrofit } from "./src/retrofit";
import { RequestInterFace, ResponseInterface, RetrofitPromise } from "./src/core/define";
import { CoreUtils, Exception, HashMap, Map } from "jcdt";
import Axios from "axios";

// let client = Axios.create( {
//     baseURL: "http://127.0.0.1:8080"
// } );
//
// let response = client.request( {
//     url: "/testing/a1_testing/1/2"
// } );
//
// response.then(resp => {
//     console.log(resp);
// });

let client = new Retrofit.Builder()
  .setConfig( {
    baseURL: "http://127.0.0.1:8080",
    // timeout: 2000,
    debug: true,
    d: ""
  } )
  .setErrorHandler( {
    handler( reason: any, exception: Exception ): void {
      console.log( "I am here." );
      // console.log( reason );
    }
  } )
  .build();

@HTTP( "/test" )
@Headers( [ "Cache-Control: no-store" ] )
class TestingClient {

  @GET( "/a1_testing/:p1/:p2" )
  a1( @Path( "p1" ) p1: string, @Path( "p2" ) p2: string ): RetrofitPromise<string> & void {
  }
}


let testingClient: TestingClient = client.create( TestingClient );

let resp = testingClient.a1( "1", "2" );