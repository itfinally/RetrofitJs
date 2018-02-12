# RetrofitJs

Axios based declarative HTTP client for the browser and node.js.<br/>
Written by a java programmer who got used to declarative HTTP client.<br/>

The goal is provide a simple, concise http client in all javascript/typescript environment, ( es6 environment, actually )
let us focus on declare own http interface rather than http details, just like Retrofit did, write less, do more.

In the last, thank for all peoples who written or update [Axios](https://github.com/axios/axios) ( javascript http client ) and [Retrofit](https://github.com/square/retrofit) ( java http client ) very much, those are wonderful projects, it teach me a lot.

## Feature
* Fully compatible with the axios feature.
* Totally declarative interface by decorators, focus on your interface.
* Unified interceptor process chain, no longer split request/response process in interceptor.

## Support
This program can't working on IE8/9/10/11 and other environment( usually browser ) who not support es6 in native,
because it depend on `Proxy` object( es6 ) and `Decorator` feature( es7 ).

In other word, RetrofitJs can be working on any environment who support es6 in native.

About `Proxy` object, I can not find any polyFill to supported. But for the `Decorator`, you can use it by something babel support like `transform-decorators-legacy`.

## Installing
Using npm: 
```text
npm install retrofitjs
```

## Example
```typescript
// This is typescript demo, also javascript demo( it is if you remove all type define )

// In the first step, you must create your retrofit object. 
let client = Retrofit.getBuilder()
  .setConfig<RetrofitConfig>( { /** config, you can use retrofit config or axios config */ } )
  .addInterceptor( /** your interceptor */ )
  .setErrorHandler( /** define your error handler */ )
  .build();

// This is the part of define any interface what you need.
@HTTP( "/testing" )
@Headers( [ "Cache-Control: no-store" ] )
class TestingClient {
  
  @GET( "/demo1/:callByWho/:when" )
  demo1( @Path( "callByWho" ) name: string, @Path( "when" ) time: number ): RetrofitPromise<string> & void {
  }
  
  @POST( "/demo2/:file" )
  demo2( @Path( "file" ) file: string, @Header( "cookie" ) val: string, @Config localConfig: AxiosConfig ): RetrofitPromise<string> & void {
  }
}

// The final step, create your client.
export let testingClient = client.create( TestingClient );

// When your call this method, it is a http call actually. 
testingClient.demo1( "itfinally", Date.now() ).then( response => {
    // any code
} ).catch( reason => {
	// any code
} );
```

## All decorators

### Method decorators

#### @HTTP( path: string, method: RequestMethod = "get" )
#### @GET( path: string )
#### @POST( path: string )
#### @PUT( path: string )
#### @DELETE( path: string )
#### @OPTIONS( path: string )
#### @HEAD( path: string )
#### @PATCH( path: string )
#### @Headers( headers: string[] )
#### @FormUrlEncoded


### Parameter decorators

#### @Header( name: string )
#### @Path( name: string )
#### @Body
#### @Query( name: string )
#### @QueryMap
#### @Field( name: string )
#### @FieldMap
#### @Config


## Interceptor chain

Like Retrofit, RetrofitJs also implemented by interceptor chain. All interceptor sort by `order` field, and <strong>sort from largest to smallest</strong>.

```typescript
// This is a interceptor interface

export interface Interceptor {
  order: number;

  init( config: RetrofitConfig ): void;

  intercept( chain: Chain ): Promise<ResponseInterface<any>>
}
```

Be careful, <strong>the `RealCall` interceptor is the last interceptor, and it must be.</strong>

It is a default interceptor, the value of `order` field is zero. RetrofitJs used it to send all http request by axios object.

### Custom interceptor
Your can easily to implement your own interceptor, just like this.

```typescript
class MyInterceptor implement Interceptor {
	public order: number = 100;
	public init( config: RetrofitConfig ): void {
		// Initializing your interceptor
	}
	
	public intercept( chain: Chain ): Promise<ResponseInterface<any>> {
		// Your code
		
		return chain.proceed( chain.request() );
	}
}
```

Note `chain.proceed( chain.request() )`, this code decide whether the request will continue.

If you calling with `chain.proceed`, current request will be transfer to next interceptor. Otherwise the rest interceptor will not be active. And the whole process will be terminate and active error handler if any error throw from interceptor chain.

## Cancellation
You can easily to cancel a request.

```typescript
let tick = testingClient.demo1(...args);

// Careful the different between micro task and macro task
setTimeout( () => tick.cancel( "your message" ), 3000 );
```

Careful, the `cancel` api is a method of `RetrofitPromise` object, you can't calling with other promise object, this is a example: 

```typescript
// It is wrong.
tick.then( () => { ...you code } ).cancel( "message" );
```

When you cancel the request, it will be throw a `RequestCancelException`, you can handle or ignore in error handler.
 
## Handling Errors
If you want to uniform handling all exception, just implement `ErrorHandler`.

```typescript
class MyErrorHandler implement ErrorHandler {
  public handler( realReason: any, exception: Exception ): void {
  	// your code
  }
}
```

`realReason` is the parameter given by axios, and `exception` is the instance of `Exception`, you can easily to Uniform process all exception.

Although error handler can be catch all exception, but it doesn't mean `Promise.catch` will not be active. In fact, it is necessary for the reason at terminate normal process when exception has been throws.

```typescript
class MyErrorHandler implement ErrorHandler {
  public handler( realReason: any, exception: Exception ): void {
  	// Your code
  }
}


testingClient.demo1( ...args ).then( response => {
	// Normal business process
	
} ).catch( reason => {
	// Active after error handler call
} );
```

## Requesting

In a single method sign, can not decorate single parameter with multi-decorator.

```typescript
// It is wrong!
public demo1<T>( @Field( "key1" ) @Header( "header1" ) val1: any ): RetrofitPromise<T>;
```

### Url query
If you want to create url query like `https://127.0.0.1/demo?key1=val1&key2=val2`, just do it as follows:

```typescript
public demo1<T>( @Query( "key1" ) val1: any, @QueryMap map1: object ): RetrofitPromise<T>;
```

* `@Query` declare a query key-value entry.
* `@QueryMap` declare a query multi-key-value-entries.

### Form submit
Easily to submit form.

```typescript
@FormUrlEncoded
public demo1<T>( @Field( "key1" ) val1: any, @FieldMap map1: object ): RetrofitPromise<T>;
```

* `@FormUrlEncoded` declare this is a form.
* `@Field` declare a form key-value entry.
* `@FieldMap` declare a form multi-key-value-entries.

### Json submit
If you want to requesting with a json body, use `@Body` to decorate parameter.

```typescript
public demo1<T>( @Body myBody: object ): RetrofitPromise<T>;
```

`@Body` can not used with any `@Field` or `@FieldMap`, because there is one body in single request. Also `@Body` can not used more than one in same method sign.

```typescript
// It is wrong!
public demo1<T>( @Body myBody: object, @Body otherBody: object ): RetrofitPromise<T>;
```

Like the above case, parameter `myBody` will be ignore.

### Domain Config
If you want to override config, use `@Config` to decorate parameter.

```typescript
public demo1<T>( @Config config: RetrofitRequest ): RetrofitPromise<T>;
```

It will be override decorator setting( but not including the global config ) by the field who parameter config contain.

### File upload 
Doesn't support yet, add in next version.

### Stream download
Doesn't support yet, add in next version.

## Other
This is the last chapter, as you can see, RetrofitJs provide a platform only, and all http interface must be write by yourself.

Also you can <strong>write a common interface and extend it</strong>, then information collector working as follows:
 1. searching method in prototype chain
 2. collect method information
 3. find all class information, and combine information in the order of parent to child
 4. search config in current parameter
 5. combine all information and send a real request to interceptor chain

In short, information priority chain follow this:
	@Config > method > this class > super class

## License
MIT


