import Axios, { AxiosInstance } from "axios";
import { CoreUtils, HashMap, Map, IllegalStateException, Exception, ArrayList, List } from "jcdt";

import { RequestBuilder } from "./factory";
import { Proxy, ProxyHandler } from "./core/proxy";
import { IOException, RequestCancelException, RequestTimeoutException } from "./core/exception";
import { Decorators, MethodMetadata } from "./decorators";
import { RequestInterFace, RetrofitConfig, RetrofitPromise, } from "./core/define";
import { Interceptor, InterceptorChainActor, ApplicationInterceptorChainActor } from "./core/interceptors";
import { LoggerInterceptor, RealCall } from "./functions";

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

      return this.scanningMethod( Object.getPrototypeOf( prototype ), methods.concat( Object.getOwnPropertyNames( prototype ) ) );
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

export interface RetrofitBuilderFactory {
  setConfig<T extends RetrofitConfig = RetrofitConfig>( config: T ): this;

  getConfig<T extends RetrofitConfig = RetrofitConfig>(): T;

  setErrorHandler( handler: ErrorHandler ): this;

  getErrorHandler(): ErrorHandler;

  addInterceptor( ...interceptors: Interceptor[] ): this;

  getInterceptors(): Interceptor[];

  build(): Retrofit;
}

export class Retrofit {
  private proxiesMap: Map<object, ProxyHandler<any>> = new HashMap();
  private interceptorActor: InterceptorChainActor;
  private errorHandler: ErrorHandler;
  private config: RetrofitConfig;
  private engine: AxiosInstance;

  private static Builder = class {
    private config: RetrofitConfig = Object.create( null );
    private errorHandler: ErrorHandler = <any>null;
    private interceptors: Interceptor[] = [];

    public setConfig<T extends RetrofitConfig = RetrofitConfig>( config: T ): this {
      this.config = config;
      return this;
    }

    public getConfig<T extends RetrofitConfig = RetrofitConfig>(): T {
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

      // if ( !( "maxTryTime" in config ) || <number>config.maxTryTime < 0 ) {
      //   config.maxTryTime = 3;
      // }

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

  public static getBuilder(): RetrofitBuilderFactory {
    return new Retrofit.Builder();
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