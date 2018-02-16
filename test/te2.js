require( "babel-polyfill" );

let { Retrofit, HTTP, GET, ResponseBody, ResponseType, Config, MultiPart, Part, PUT } = require( ".." );
let fs = require( "fs" );

let retrofit = Retrofit.getBuilder()
  .setConfig( {
    baseURL: "http://192.168.1.113:8080",
    debug: true
  } )
  .build();

@HTTP( "/test" )
class TestingClient {

  @GET( "/download_test" )
  @ResponseBody( ResponseType.DOCUMENT )
  download( config ) {
  }

  @MultiPart
  @PUT( "/upload" )
  upload( @Part( "file" ) file, @Part( "name" ) name ) {
  }
}

let client = retrofit.create( TestingClient );

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