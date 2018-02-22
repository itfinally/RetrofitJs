import { CoreUtils } from "jcdt";

import Axios, {
  AxiosAdapter, AxiosBasicCredentials, AxiosProxyConfig, AxiosRequestConfig,
  AxiosResponse, AxiosTransformer, CancelToken, CancelTokenSource
} from "axios";

export enum ResponseType {
  ARRAY_BUFFER = "arraybuffer",
  BLOB = "blob",
  DOCUMENT = "document",
  JSON = "json",
  TEXT = "text",
  STREAM = "stream"
}

export enum RequestMethod {
  GET = "get",
  DELETE = "delete",
  HEAD = "head",
  OPTIONS = "options",
  POST = "post",
  PUT = "put",
  PATCH = "patch"
}

export interface RetryCondition {
  handler( request: RequestInterFace, reason: any ): boolean;
}

export interface RetrofitConfig {
  baseURL?: string;
  transformRequest?: AxiosTransformer | AxiosTransformer[];
  transformResponse?: AxiosTransformer | AxiosTransformer[];
  headers?: any;
  timeout?: number;
  withCredentials?: boolean;
  adapter?: AxiosAdapter;
  auth?: AxiosBasicCredentials;
  responseType?: string;
  xsrfCookieName?: string;
  xsrfHeaderName?: string;
  maxContentLength?: number;
  validateStatus?: ( status: number ) => boolean;
  maxRedirects?: number;
  httpAgent?: any;
  httpsAgent?: any;
  proxy?: AxiosProxyConfig;
  paramsSerializer?: ( params: any ) => string;

  retryCondition?: RetryCondition;
  maxTry?: number;
  // allowCache?: boolean;
  debug?: boolean;
}

export interface RequestInterFace extends AxiosRequestConfig {
  cancel( message?: string ): void;

  getCancelMessage(): string;

  isCancel(): boolean;
}

export interface ResponseInterface<T = any> extends AxiosResponse<T> {
  config: RequestInterFace
}

export class RetrofitRequest implements RequestInterFace {
  private cancelTokenSource: CancelTokenSource;
  private cancelRequest: boolean = false;
  private cancelMessage: string = "";

  private _requestToken: CancelToken;
  private _cancelToken: CancelToken;

  public url: string = "";
  public headers: any = Object.create( null );

  public method?: string;
  public baseURL?: string;
  public transformRequest?: AxiosTransformer | AxiosTransformer[];
  public transformResponse?: AxiosTransformer | AxiosTransformer[];
  public params?: any;
  public paramsSerializer?: ( params: any ) => string;
  public data?: any;
  public timeout?: number;
  public withCredentials?: boolean;
  public adapter?: AxiosAdapter;
  public auth?: AxiosBasicCredentials;
  public responseType?: string;
  public xsrfCookieName?: string;
  public xsrfHeaderName?: string;
  public onUploadProgress?: ( progressEvent: any ) => void;
  public onDownloadProgress?: ( progressEvent: any ) => void;
  public maxContentLength?: number;
  public validateStatus?: ( status: number ) => boolean;
  public maxRedirects?: number;
  public httpAgent?: any;
  public httpsAgent?: any;
  public proxy?: AxiosProxyConfig;

  public constructor( config?: RequestInterFace ) {
    if ( !CoreUtils.isNone( config ) ) {
      Object.assign( this, config );
    }

    this.cancelTokenSource = Axios.CancelToken.source();
    this._cancelToken = this._requestToken = this.cancelTokenSource.token;
  }

  public cancel( message: string = "" ): void {
    this.cancelTokenSource.cancel( message );
    this.cancelMessage = message;
    this.cancelRequest = true;
  }

  public getCancelMessage(): string {
    return this.cancelMessage;
  }

  get cancelToken(): CancelToken {
    return this._requestToken;
  }

  public isCancel(): boolean {
    return this.cancelRequest;
  }
}

export class RetrofitResponse<T = any> implements ResponseInterface<T> {
  public status: number = -1;
  public data: T = <any>null;
  public statusText: string = "";
  public headers: any = <any>null;
  public config: RequestInterFace;

  public constructor( config: RequestInterFace, response?: AxiosResponse ) {
    if ( !CoreUtils.isNone( response ) ) {
      Object.assign( this, response );
    }

    this.config = config;
  }
}

export interface RetrofitPromise<T = any> extends Promise<ResponseInterface<T>> {
  cancel( message: string ): void;
}