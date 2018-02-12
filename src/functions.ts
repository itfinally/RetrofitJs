import { ResponseInterface, RetrofitConfig, RetrofitResponse } from "./core/define";
import { AxiosInstance } from "axios";
import { Chain, Interceptor } from "./core/interceptors";

export class RealCall implements Interceptor {
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

/**
 * non-safety code
 *
 *
 export class RetryRequestInterceptor implements Interceptor {
  public order: number = 1;
  private maxTryTime: number = 0;
  private retryCondition: ( reason: any ) => boolean = () => false;

  public

  public init( config: RetrofitConfig ): void {
    if ( !( "maxTryTime" in config && "retryCondition" in config && "timeout" in config ) ) {
      return;
    }

    if ( !( CoreUtils.isNumber( config.maxTryTime ) && config.retryCondition instanceof Function ) ) {
      return;
    }

    this.maxTryTime = <number>config.maxTryTime;
    this.retryCondition = config.retryCondition;
  }

  public async intercept( chain: Chain ): Promise<ResponseInterface<any>> {
    let request = chain.request(),
      tryTime = 0;

    do {

      try {
        let response = await chain.proceed( request );
        if ( response.status ) {

        }

      } catch ( reason ) {
        // User cancel
        if ( request.isCancel() || "ECONNABORTED" === reason.code ) {
          throw reason;
        }

        if ( this.maxTryTime <= 0 &&  ) {

        }

        if ( ) {
        }
      }

    } while(tryTime < this.maxTryTime && this.retryCondition(  ));
  }

  private isOffline() {

  }
}

 export interface CacheUnit {
  response: ResponseInterface;  // response object
  isImmutable: boolean;         // if set immutable
  forceToVerified: boolean;     // if set no-cache
  verifiedIfExpire: boolean;    // if set must-revalidate
  expires: number;              // calculate with max-age or expires
  lastModified?: string;        // if set lastModified
  eTag?: string;                // set if eTag is exist
}

 export interface CacheBucket {
  put( key: string, val: CacheUnit ): void;

  get( key: string ): CacheUnit;

  containsKey( key: string ): boolean;

  remove( key: string ): void;
}

 // See RFC7234 -> https://tools.ietf.org/html/rfc7234
 export class CacheInterceptor implements Interceptor {
  public order: number = 2;

  private caches: CacheBucket = <any>null;
  private allowCache: boolean = false;
  private engine: AxiosInstance;

  public constructor( engine: AxiosInstance ) {
    this.engine = engine;
  }

  public init( config: RetrofitConfig ): void {
    if ( "allowCache" in config ) {
      this.allowCache = <boolean>config.allowCache;
    }
  }

  // The method can be override if use local file system to cache response.
  // To do that, only implement CacheBucket interface and return.
  protected getCacheBucket(): CacheBucket {
    if ( !this.caches ) {
      // Only new once if not exists.
      let bucket: Map<string, CacheUnit> = new HashMap();

      this.caches = {
        put( key: string, val: CacheUnit ): void {
          bucket.put( key, val );
        },

        get( key: string ): CacheUnit {
          return bucket.get( key );
        },

        containsKey( key: string ): boolean {
          return bucket.containsKey( key );
        },

        remove( key: string ): void {
          bucket.remove( key );
        }
      };
    }

    return this.caches;
  }

  private static getCurrentTime(): number {
    return ( Date.now || new Date().getTime )();
  }

  // Ignore upper/lower case
  private static getHeader( name: string, response: ResponseInterface ): string {
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
  }

  public async intercept( chain: Chain ): Promise<ResponseInterface<any>> {
    if ( !this.allowCache ) {
      return chain.proceed( chain.request() );
    }

    let caches = this.getCacheBucket(),

      request: RequestInterFace = chain.request(),
      response: ResponseInterface;

    if ( caches.containsKey( <string>request.url ) ) {
      response = await this.verifyAndGetResponseCache( request );

      if ( response ) {
        return response;

      } else {
        caches.remove( <string>request.url );
      }
    }

    try {
      response = await chain.proceed( chain.request() );

    } catch ( e ) {
      // Use old cache if corrupt in I/O
      if ( caches.containsKey( <string>request.url ) ) {
        response = Object.assign( Object.create( null ), caches.get( <string>request.url ).response );
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

  private async verifyAndGetResponseCache( request: RequestInterFace ): Promise<ResponseInterface> {
    let caches = this.getCacheBucket(),
      cacheUnit = caches.get( <string>request.url );

    if ( cacheUnit.expires < CacheInterceptor.getCurrentTime() ) {
      if ( cacheUnit.isImmutable || cacheUnit.verifiedIfExpire ) {
        let response = Object.assign( Object.create( null ), cacheUnit.response );
        response.statusText = "from cache";

        return response;
      }

      if ( cacheUnit.forceToVerified ) {
        let verifyRequest = Object.assign( Object.create( null ), request ),
          verifyResponse: ResponseInterface;

        if ( !( "headers" in verifyRequest ) ) {
          verifyRequest.headers = Object.create( null );
        }

        verifyRequest.method = RequestMethod.HEAD;
        verifyRequest[ "" ] = "";

        try {
          verifyResponse = new RetrofitResponse( verifyRequest, await this.engine.request( verifyRequest ) );

        } catch ( e ) {
          // Do not use cache if failed to verify.
          return <any>null;
        }

        let verifyHeaders = verifyResponse.headers;
      }
    }

    // The rest case is expires
    if ( cacheUnit.verifiedIfExpire ) {

    }

    return <any>null;
  }

  // Usually, only caching simple 'get' request with response status 2xx.
  // Also allow caching if meet all requirements:
  //  1. Not included 'Authorization' header field in request
  //  2. Not included 'Cache-Control' header field with 'no-store' directive in request or response
  //  3. ''
  private allowCaching( response: ResponseInterface ): boolean {
    if ( !( ( <string>response.config.method ).toLowerCase() !== "get"
        && ( 200 <= response.status && response.status < 300 )
        && !CacheInterceptor.getHeader( "content-disposition", response ) ) ) {

      return false;
    }

    // No caching status 206 because it is partial-content response
    if ( 206 === response.status ) {
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
      let date: string = CacheInterceptor.getHeader( "date", response ),
        startTiming: number = date ? new Date( date ).getTime() : CacheInterceptor.getCurrentTime();

      expiresDate = new Date( startTiming + parseInt( ageMatcher[ 1 ] ) * 1000 );

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
    let cacheControl = CacheInterceptor.getHeader( "cache-control", response ),
      ageMatcher = /max-age=(\d+)/.exec( cacheControl ),
      cacheUnit: CacheUnit,
      expiresDate: number,

      isImmutable = /immutable/.test( cacheControl ),
      forceToVerified = /no-cache/.test( cacheControl ),
      verifiedIfExpire = /must-revalidate/.test( cacheControl ),
      eTag: string = CacheInterceptor.getHeader( "etag", response ),
      lastModified: string = CacheInterceptor.getHeader( "last-modified", response );

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
    let url = response.config.url,
      caches = this.getCacheBucket();

    if ( caches.containsKey( <string>url ) ) {
      caches.remove( <string>url );
    }
  }
}

 */

export class LoggerInterceptor implements Interceptor {
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

    requestDetails[ "url" ] = `${request.baseURL ? request.baseURL + "/" + request.url : request.url}`;
    requestDetails[ "method" ] = `${request.method}`;
    requestDetails[ "data" ] = request.data ? request.data : Object.create( null );
    requestDetails[ "headers" ] = request.headers ? request.headers : Object.create( null );

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