import Axios, { AxiosInstance } from "axios";
import { CoreUtils, HashMap, Map, IllegalStateException, Exception, ArrayList, List } from "jcdt";

import { RequestBuilder } from "./factory";
import { Proxy, ProxyHandler } from "./core/proxy";
import { IOException, RequestCancelException, RequestTimeoutException } from "./core/exception";
import { Decorators, MethodMetadata } from "./decorators";
import { RequestInterFace, ResponseInterface, RetrofitConfig, RetrofitPromise, RetrofitResponse } from "./core/define";
import { Interceptor, InterceptorChainActor, ApplicationInterceptorChainActor, Chain } from "./core/interceptors";

interface RequestProxiesConfig {
  config: RetrofitConfig;
  errorHandler: ErrorHandler;
  interceptorActor: InterceptorChainActor;
}

module Proxies {
  let builder: RequestBuilder = new RequestBuilder(),
    handlers: List<( request: RequestInterFace, reason: any ) => Exception> = new ArrayList(),
    exceptionSelector = ( request: RequestInterFace, reason: any ) => {
      let exception: Exception = <any>null;

      handlers.forEach( handler => ( exception = handler( request, reason ) ) !== null );

      return null === exception ? new IOException( reason.message ) : exception;
    };

  // Obvious, is cancel by user.
  handlers.add( ( request, reason ) => !( "code" in reason ) && request.isCancel() ? new RequestCancelException( reason.message ) : <any>null );

  // Two situation:
  // 1. ETIMEDOUT is server
  // When user set 'timeout' option, and request already timeout, use this exception.
  handlers.add( ( _, reason ) => "code" in reason && "ECONNABORTED ETIMEDOUT".indexOf( reason.code ) >= 0 ? new RequestTimeoutException( reason.message ) : <any>null );

  export class RequestProxies<T = any> extends ProxyHandler<T> {
    private proxyCls: any;
    private toolBox: RequestProxiesConfig;

    public constructor( box: RequestProxiesConfig ) {
      super();
      this.toolBox = box;
    }

    public construct( nativeCls: any, propKey: string, proxy: T ): T {
      let childPrototype = nativeCls.prototype,
        methods = this.scanningMethod( nativeCls.prototype );

      // Binding native class for type checking.
      this.proxyCls = nativeCls;

      // In order to make 'thisArg' parameter pointer to instance who activation 'apply' method,
      // should be overwrite prototype object of this instance, and added methods from all parent prototype,
      // also it can be avoided to traverse prototype chain when method called.
      let instance = new nativeCls();
      methods.forEach( name => instance[ name ] = Proxy.newProxy( childPrototype[ name ], this ) );

      return instance;
    }

    public apply( method: Function, thisArg: any, parameters: Array<any> ): RetrofitPromise {
      if ( this.proxyCls && !( thisArg instanceof this.proxyCls ) ) {
        throw new IllegalStateException(
          "Can not call with other object. ( should be binding with original class if is necessary )" );
      }

      let metadata: MethodMetadata = Decorators.getMetadata( thisArg.constructor, method.name ),
        request: RequestInterFace = builder.build( metadata, parameters ),
        box = this.toolBox,

        promise = box.interceptorActor.intercept( request ).catch( reason => {

          if ( box.errorHandler ) {
            box.errorHandler.handler( reason, exceptionSelector( request, reason ) );
          }

          return Promise.reject( reason );
        } );

      ( <any>promise ).cancel = ( message: string = "" ) => request.cancel( message );
      return <RetrofitPromise>promise;
    }

    private scanningMethod( prototype: any, methods: string[] = [] ): string[] {
      if ( prototype === Object.prototype ) {
        return methods.filter( name => name !== "constructor" );
      }

      return this.scanningMethod(
        Object.getPrototypeOf( prototype ),
        methods.concat( Object.getOwnPropertyNames( prototype ) )
      );
    }
  }
}

interface RetrofitBuilder {
  config: RetrofitConfig;
  errorHandler: ErrorHandler;
  interceptors: Interceptor[];
}

export interface ErrorHandler {
  handler( realReason: any, exception: Exception ): void;
}

export class Retrofit {
  private proxiesMap: Map<object, ProxyHandler<any>> = new HashMap();
  private interceptorActor: InterceptorChainActor;
  private errorHandler: ErrorHandler;
  private config: RetrofitConfig;
  private engine: AxiosInstance;

  public static Builder = class {
    private config: RetrofitConfig = Object.create( null );
    private errorHandler: ErrorHandler = <any>null;
    private interceptors: Interceptor[] = [];

    public setConfig<T extends RetrofitConfig>( config: T ): this {
      this.config = config;
      return this;
    }

    public getConfig<T extends RetrofitConfig>(): T {
      return <T>this.config;
    }

    public setErrorHandler( handler: ErrorHandler ): this {
      this.errorHandler = handler;
      return this;
    }

    public getErrorHandler(): ErrorHandler {
      return this.errorHandler;
    }

    public addInterceptor( ...interceptors: Interceptor[] ): this {
      this.interceptors.push( ...interceptors );
      return this;
    }

    public getInterceptors(): Interceptor[] {
      return this.interceptors;
    }

    public build(): Retrofit {
      let config = this.config;

      if ( !CoreUtils.isNumber( config.maxTryTime ) || <number>config.maxTryTime < 0 ) {
        config.maxTryTime = 3;
      }

      return new Retrofit( {
        config: this.config,
        errorHandler: this.errorHandler,
        interceptors: this.interceptors.filter( item => item.order && <any>item.order <= 0 )
      } );
    }
  };

  private constructor( configure: RetrofitBuilder ) {
    this.config = configure.config;

    this.interceptorActor = new ApplicationInterceptorChainActor();

    // interceptor init
    configure.interceptors.forEach( interceptor => {
      interceptor.init( this.config );
      this.interceptorActor.addInterceptor( interceptor );
    } );

    // add default interceptor
    this.engine = Axios.create( configure.config );
    this.interceptorActor.addInterceptor( new RealCall( this.engine ) )
      .addInterceptor( new LoggerInterceptor( "debug" in configure.config && <boolean>configure.config.debug ) );
    // .addInterceptor( new CacheInterceptor( this.engine ) );

    this.errorHandler = !CoreUtils.isNone( configure.errorHandler ) ? configure.errorHandler : <any>null;
  }

  public getEngine(): AxiosInstance {
    return this.engine;
  }

  public create<T>( cls: object ): T {
    if ( !( cls instanceof Object ) ) {
      throw new TypeError( `Expect class object but got ${typeof cls}` );
    }

    let proxies: ProxyHandler<T>,
      proxiesMap = this.proxiesMap;

    if ( proxiesMap.containsKey( cls ) ) {
      proxies = proxiesMap.get( cls );

    } else {
      proxies = new Proxies.RequestProxies( {
        config: this.config,
        errorHandler: this.errorHandler,
        interceptorActor: this.interceptorActor
      } );

      proxiesMap.put( cls, proxies );
    }

    // "Proxy.newProxy" will be return a proxy Class
    return new ( Proxy.newProxy<any>( cls, proxies ) )();
  }
}


/** start to define important interceptor */
class RealCall implements Interceptor {
  public order: number = 0;
  private engine: AxiosInstance;

  public constructor( engine: AxiosInstance ) {
    this.engine = engine;
  }

  public init( config: RetrofitConfig ): void {
  }

  public intercept( chain: Chain ): Promise<ResponseInterface<any>> {
    return this.engine.request<any>( chain.request() )
      .then( response => Promise.resolve( new RetrofitResponse( chain.request(), response ) ) );
  }
}

class LoggerInterceptor implements Interceptor {
  public order: number = 5;
  public isDebug: boolean = false;

  public constructor( isDebug: boolean ) {
    this.isDebug = isDebug;
  }

  public init( config: RetrofitConfig ): void {
  }

  public async intercept( chain: Chain ): Promise<ResponseInterface<any>> {
    if ( !this.isDebug ) {
      return chain.proceed( chain.request() );
    }

    let requestDetails: any = Object.create( null ),
      responseDetails: any = Object.create( null ),
      request = chain.request();

    requestDetails[ "url" ] = `${request.baseURL ? request.baseURL + "/" + request.url : request.url }`;
    requestDetails[ "method" ] = `${request.method}`;
    requestDetails[ "data" ] = request.data ? request.data : {};
    requestDetails[ "headers" ] = request.headers ? request.headers : {};

    let
      getTime = () => ( Date.now || new Date().getTime )(),
      start = getTime(),
      response = await chain.proceed( chain.request() );

    responseDetails[ "time" ] = `${( getTime() - start ) / 1000}s`;

    let respHeaders = response.headers;
    responseDetails[ "headers" ] = Object.create( null );
    Object.keys( respHeaders ).forEach( name => responseDetails[ "headers" ][ name ] = respHeaders[ name ] );

    console.log( "\n" );
    console.log( "---- request details ----" );
    console.log( requestDetails );
    console.log( "---- response log ----" );
    console.log( responseDetails );
    console.log( "\n" );

    return response;
  }
}

interface CacheUnit {
  response: ResponseInterface;  // response object
  isImmutable: boolean;         // if set immutable
  forceToVerified: boolean;     // if set no-cache
  verifiedIfExpire: boolean;    // if set must-revalidate
  expires: number;              // calculate with max-age or expires
  lastModified?: string;        // if set lastModified
  eTag?: string;                // set if eTag is exist
}

class CacheInterceptor implements Interceptor {
  private caches: Map<string, CacheUnit> = new HashMap();
  private allowCache: boolean = true;
  private engine: AxiosInstance;

  public constructor( engine: AxiosInstance ) {
    this.engine = engine;
  }

  public init( config: RetrofitConfig ): void {
    if ( "allowCache" in config ) {
      this.allowCache = <boolean>config.allowCache;
    }
  }

  private static getCurrentTime: () => number = () => ( Date.now || new Date().getTime )();

  // ignore upper/lower case
  private static getHeader: ( name: string, response: ResponseInterface ) => string = ( name, response ) => {
    let responseHeaders = response.headers,
      value: string = <any>null;

    Object.keys( responseHeaders ).some( key => {
      if ( key.toLowerCase() === name.toLowerCase() ) {
        value = responseHeaders[ key ];
        return true;
      }

      return false;
    } );

    return /^\s*$/.test( value ) ? <any>null : value;
  };

  public async intercept( chain: Chain ): Promise<ResponseInterface<any>> {
    if ( !this.allowCache ) {
      return chain.proceed( chain.request() );
    }

    let request: RequestInterFace = chain.request(),
      response: ResponseInterface;

    if ( this.caches.containsKey( request.url ) ) {
      response = this.caches.get( request.url ).response;

      if ( await this.cacheVerification( <string>request.url ) ) {
        return Object.assign( Object.create( null ), response );

      } else {
        this.caches.remove( request.url );
      }
    }

    try {
      response = await chain.proceed( chain.request() );

    } catch ( e ) {
      // if corrupt in io, use old cache
      if ( this.caches.containsKey( request.url ) ) {
        response = Object.assign( Object.create( null ), this.caches.get( request.url ).response );
        response.statusText = "Gateway timeout";
        response.status = 504;

        return response;
      }

      // if no cache to use, throw exception.
      throw e;
    }

    if ( this.allowCaching( response ) ) {
      this.cachedResponse( <string>request.url, response );
    }

    return Object.assign( Object.create( null ), response );
  }

  private async cacheVerification( url: string ): Promise<boolean> {
    return false;
  }

  private allowCaching( response: ResponseInterface ): boolean {
    let responseHeaders = response.headers;

    // only caching 'get' request with response status 2xx
    if ( !( ( <string>response.config.method ).toLowerCase() !== "get"
        && ( 200 <= response.status && response.status < 300 )
        && !CacheInterceptor.getHeader( "content-disposition", response ) ) ) {

      return false;
    }

    let cacheControl = CacheInterceptor.getHeader( "cache-control", response ),
      expires = CacheInterceptor.getHeader( "expires", response ),
      pragma = CacheInterceptor.getHeader( "pragma", response );

    if ( !( cacheControl || pragma ) ) {
      return false;
    }

    if ( pragma && !cacheControl ) {
      cacheControl = "";
    }

    if ( /no-store/.test( cacheControl ) ) {
      this.removeCache( response );
      return false;
    }

    let ageMatcher = /max-age=(\d+)/.exec( cacheControl ),
      expiresDate: Date;

    if ( ageMatcher !== null ) {
      expiresDate = new Date( CacheInterceptor.getCurrentTime() + parseInt( ageMatcher[ 1 ] ) * 1000 );

    } else if ( expires ) {
      expiresDate = new Date( expires );

    } else {
      return false;
    }

    let alive = expiresDate.getTime() > CacheInterceptor.getCurrentTime();
    if ( !alive ) {
      this.removeCache( response );
    }

    return alive;
  }

  private cachedResponse( url: string, response: ResponseInterface ): void {
    let responseHeaders = response.headers,
      cacheControl = responseHeaders[ "cache-control" ],
      ageMatcher = /max-age=(\d+)/.exec( cacheControl ),
      expiresDate: number,
      cacheUnit: CacheUnit,

      isImmutable = /immutable/.test( cacheControl ),
      forceToVerified = /no-cache/.test( cacheControl ),
      verifiedIfExpire = /must-revalidate/.test( cacheControl ),
      eTag: string = "etag" in responseHeaders ? responseHeaders[ "etag" ] : <any>null,
      lastModified: string = "last-modified" in responseHeaders ? responseHeaders[ "last-modified" ] : <any>null;

    expiresDate = ageMatcher !== null
      ? CacheInterceptor.getCurrentTime() + parseInt( ageMatcher[ 1 ] ) * 1000
      : new Date( response.headers[ "expires" ] ).getTime();

    cacheUnit = {
      response, forceToVerified, verifiedIfExpire, isImmutable,
      expires: expiresDate
    };

    if ( eTag ) {
      cacheUnit.eTag = eTag;
    }

    if ( lastModified ) {
      cacheUnit.lastModified = lastModified;
    }

    this.caches.put( url, cacheUnit );
  }


  private removeCache( response: ResponseInterface ): void {
    let url = response.config.url;
    if ( this.caches.containsKey( url ) ) {
      this.caches.remove( url );
    }
  }

  private redirectRequest( url: string ): ResponseInterface {
    return <any>null;
  }
}