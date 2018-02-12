import { IllegalArgumentException, NullPointException, Set, CoreUtils, HashSet, IllegalStateException } from "jcdt";
import { RequestInterFace, ResponseInterface, RetrofitConfig, RetrofitRequest } from "./define";
import { RequestCancelException } from "./exception";

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
        private index: number = 0;
        private localRequest: RequestInterFace = <any>null;
        private length: number = that.localInterceptors.length;
        private interceptors: Interceptor[] = that.localInterceptors.slice();

        // this is a recursive-chain function
        // this-proceed -> interceptor-proceed-1 -> this-proceed -> interceptor-proceed-2 -> ...
        public async proceed( request: RequestInterFace ): Promise<ResponseInterface> {
          if ( CoreUtils.isNone( request ) ) {
            throw new NullPointException( "Request must not be null." );
          }

          this.localRequest = request;

          if ( request.isCancel() ) {
            return Promise.reject( new RequestCancelException( request.getCancelMessage() ) );
          }

          let response: Promise<ResponseInterface> = this.index < this.length
            ? this.interceptors[ this.index++ ].intercept( this )
            : Promise.reject( new IllegalStateException( "No real call in this interceptor chain, request has been rejected." ) );

          this.index -= 1;
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