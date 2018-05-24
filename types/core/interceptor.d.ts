import { RequestInterFace, ResponseInterface, RetrofitConfig } from "./define";

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
  private localInterceptors: Array<Interceptor>;
  private inOrder: boolean;

  public abstract getInterceptors(): Set<Interceptor>;

  public intercept( request: RequestInterFace ): Promise<ResponseInterface>;

  private sort(): void;

  public addInterceptor( interceptor: Interceptor ): this;

  public removeInterceptor( interceptor: Interceptor ): boolean;
}

export class ApplicationInterceptorChainActor extends InterceptorChainActor {
  private interceptors: Set<Interceptor>;

  public constructor( ...interceptors: Interceptor[] );

  public getInterceptors(): Set<Interceptor>;
}