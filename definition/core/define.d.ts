import {
  AxiosAdapter, AxiosBasicCredentials, AxiosProxyConfig, AxiosRequestConfig, AxiosResponse,
  AxiosTransformer, CancelToken, CancelTokenSource
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
  private cancelRequest: boolean;
  private cancelMessage: string;

  private _requestToken: CancelToken;
  private _cancelToken: CancelToken;

  public url: string;
  public headers: any;

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

  public constructor( config?: RequestInterFace );

  public cancel( message?: string ): void;

  public getCancelMessage(): string;

  public isCancel(): boolean;
}

export class RetrofitResponse<T = any> implements ResponseInterface<T> {
  public status: number;
  public data: T;
  public statusText: string;
  public headers: any;
  public config: RequestInterFace;

  public constructor( config: RequestInterFace, response?: AxiosResponse );
}

export interface RetrofitPromise<T = any> extends Promise<ResponseInterface<T>> {
  cancel( message: string ): void;
}