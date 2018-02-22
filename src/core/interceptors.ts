import { CoreUtils, HashSet, IllegalArgumentException, IllegalStateException, NullPointException, Set } from "jcdt";
import { RequestInterFace, ResponseInterface, RetrofitConfig, RetrofitRequest } from "./define";

export interface Chain {
  proceed( request: RequestInterFace ): Promise<ResponseInterface>;

  request(): RequestInterFace;
}

export interface Interceptor {
  order: number;

  init( config: RetrofitConfig ): void;

  intercept( chain: Chain ): Promise<ResponseInterface<any>>
}

export abstract class InterceptorChainActor {
  private localInterceptors: Array<Interceptor> = <any>null;
  private inOrder: boolean = false;

  public abstract getInterceptors(): Set<Interceptor>;

  public async intercept( request: RequestInterFace ): Promise<ResponseInterface> {
    if ( !( request instanceof RetrofitRequest ) ) {
      throw new IllegalArgumentException( "Require retrofit request object." );
    }

    if ( !this.inOrder ) {
      this.sort();
    }

    let that = this,
      chain: Chain = new class implements Chain {
        private localRequest: RequestInterFace = <any>null;

        private stack: Interceptor[] = [];
        private interceptors: Interceptor[] = that.localInterceptors.slice();

        // this is a recursive-chain function
        // this-proceed -> interceptor-proceed-1 -> this-proceed -> interceptor-proceed-2 -> ...
        public async proceed( request: RequestInterFace ): Promise<ResponseInterface> {
          if ( CoreUtils.isNone( request ) ) {
            throw new NullPointException( "Request must not be null." );
          }

          this.localRequest = request;

          if ( request.isCancel() ) {
            return Promise.reject( { "message": request.getCancelMessage() } );
          }

          let currentCall = this.interceptors.shift();
          if ( currentCall ) {
            this.stack.push( currentCall );
          }

          // It will be return in direct and ignore the rest of function calling stack if using Promise rather than await.
          // You can see the old implements from github log
          let response: Promise<ResponseInterface>;
          if ( currentCall ) {
            try {
              response = Promise.resolve( await currentCall.intercept( this ) );

            } catch ( e ) {
              response = Promise.reject( e );
            }

          } else {
            response = Promise.reject( new IllegalStateException( "No real call in this interceptor chain, request has been rejected." ) );
          }

          this.interceptors.unshift( <Interceptor>this.stack.pop() );
          return response;
        }

        public request(): RequestInterFace {
          return this.localRequest;
        }
      };

    return chain.proceed( request );
  }

  private sort() {
    this.inOrder = true;

    this.localInterceptors = this.getInterceptors().toArray();
    this.localInterceptors.sort( ( a: Interceptor, b: Interceptor ): number => {
      let aOrder = CoreUtils.isNumber( a.order ) && a.order >= 0 ? a.order : 9999,
        bOrder = CoreUtils.isNumber( b.order ) && b.order >= 0 ? b.order : 9999;

      // to small from lager
      return aOrder === bOrder ? 0 : aOrder > bOrder ? -1 : 1;
    } );
  }

  public addInterceptor( interceptor: Interceptor ): this {
    this.getInterceptors().add( interceptor );
    return this;
  }

  public removeInterceptor( interceptor: Interceptor ): boolean {
    return this.getInterceptors().remove( interceptor );
  }
}

export class ApplicationInterceptorChainActor extends InterceptorChainActor {
  private interceptors: Set<Interceptor> = new HashSet();

  public constructor( ...interceptors: Interceptor[] ) {
    super();

    if ( !CoreUtils.isNone( interceptors ) ) {
      let arr = this.interceptors;
      interceptors.forEach( item => arr.add( item ) );
    }
  }

  public getInterceptors(): Set<Interceptor> {
    return this.interceptors;
  }
}