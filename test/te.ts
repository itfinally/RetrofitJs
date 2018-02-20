import {
  Config, GET, HTTP, MultiPart, Part, PUT, ResponseBody, ResponseType, Retrofit, RetrofitConfig,
  RetrofitPromise
} from "..";
import * as fs from "fs";
import { Exception } from "jcdt";

let retrofit = Retrofit.getBuilder()
  .setConfig<RetrofitConfig>( {
    baseURL: "http://192.168.1.113:8080",
    timeout: 3000,
    debug: true
  } )
  .setErrorHandler( {
    handler( realReason: any, exception: Exception ): void {
      console.log(arguments);
    }
  } )
  .build();

@HTTP( "/test" )
class TestingClient {

  @GET( "/download_test" )
  @ResponseBody( ResponseType.DOCUMENT )
  public download( @Config config: RetrofitConfig ): RetrofitPromise<ArrayBuffer> & void {
  }

  @MultiPart
  @PUT( "/upload" )
  public upload( @Part( "file" ) file: any, @Part( "name" ) name: string ): RetrofitPromise<void> & void {
  }
}

let client: TestingClient = retrofit.create( TestingClient );

// ( <any>document.getElementById( "submit" ) ).onclick = () => {
//   client.upload( ( <any>document.getElementById( "file" ) ).files[ 0 ], "test222" ).then( response => {
//     console.log( response );
//   } );
// };

( async () => {
  client.upload( fs.createReadStream( "/Users/itfinally/crm.sql" ), "test222" ).then( response => {
    console.log( response );
  } ).catch( reason => {
    console.log( reason );
  } );
} )();