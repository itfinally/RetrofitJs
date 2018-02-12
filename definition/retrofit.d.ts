import { Interceptor, InterceptorChainActor } from "./core/interceptor";
import { RetrofitConfig } from "./core/define";
import { AxiosInstance } from "axios";
import { Exception } from "jcdt";

interface RetrofitBuilder {
  config: RetrofitConfig;
  errorHandler: ErrorHandler;
  interceptors: Interceptor[];
}

export interface ErrorHandler {
  handler( realReason: any, exception: Exception ): void;
}

export class RetrofitBuilderFactory {
  constructor();

  setConfig<T extends RetrofitConfig = RetrofitConfig>( config: T ): this;

  getConfig<T extends RetrofitConfig = RetrofitConfig>(): T;

  setErrorHandler( handler: ErrorHandler ): this;

  getErrorHandler(): ErrorHandler;

  addInterceptor( ...interceptors: Interceptor[] ): this;

  getInterceptors(): Interceptor[];

  build(): Retrofit;
}

export class Retrofit {
  private proxiesMap: Map<object, ProxyHandler<any>>;
  private interceptorActor: InterceptorChainActor;
  private errorHandler: ErrorHandler;
  private config: RetrofitConfig;
  private engine: AxiosInstance;

  private static Builder: any;

  private constructor( configure: RetrofitBuilder );

  public static getBuilder(): RetrofitBuilderFactory;

  public getEngine(): AxiosInstance;

  public create<T>( cls: object ): T;
}