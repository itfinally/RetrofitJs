export class ProxyHandler<T> {
  /**
   * active when getter has been called
   *
   * @param native the native object
   * @param propKey property key
   * @param proxy the native object who be proxied
   * @returns anything you want to return
   */
  get( native: T, propKey: string, proxy: T ): any;

  /**
   * active when setter has been called
   *
   * @param native native object
   * @param propKey property key
   * @param value setting value
   * @param proxy setting successful if return true
   */
  set( native: T, propKey: string, value: any, proxy: T ): boolean;

  /**
   * active when 'in' operator has been called
   *
   * @param native native object
   * @param propKey property key
   * @return
   */
  has( native: T, propKey: string ): boolean;

  /**
   * active when 'delete' operator has been called
   *
   * @param native native object
   * @param propKey property key
   * @return delete successful if return true
   */
  deleteProperty( native: T, propKey: string ): boolean;

  /**
   * active when this api has been called
   * - Object.getOwnPropertyNames
   * - Object.getOwnPropertySymbols
   * - Object.keys
   *
   * @param native native object
   * @return return native object
   */
  ownKeys( native: T ): T;

  /**
   * active when this api has been called
   * - Object.getOwnPropertyDescriptor
   *
   * @param native native object
   * @param propKey property key
   * @return return property descriptor of native object,
   *         like 'Object.getOwnPropertyDescriptor(native, propKey);'
   */
  getOwnPropertyDescriptor( native: T, propKey: string ): PropertyDescriptor;

  /**
   * active when this api has been called
   * - Object.getOwnPropertyDescriptor
   *
   * @param native native object
   * @param propKey property key
   * @param propDesc property descriptor of native object
   * @return setting successful if return true
   */
  defineProperty( native: T, propKey: string, propDesc: PropertyDescriptor ): boolean;

  /**
   * active when this api has been called
   * - Object.preventExtensions
   *
   * @param native native object
   * @return setting successful if return true
   */
  preventExtensions( native: T ): boolean;

  /**
   * active when this api has been called
   * - Object.getPrototypeOf
   *
   * @param native native object
   * @return setting successful if return true
   */
  getPrototypeOf( native: T ): T;

  /**
   * active when this api has been called
   * - Object.isExtensible
   *
   * @param native native object
   * @return
   */
  isExtensible( native: T ): boolean;

  /**
   * active when this api has been called
   * - Object.setPrototypeOf
   *
   * @param native native object
   * @return
   */
  setPrototypeOf( native: T ): T;

  /**
   * active when method has been called
   * like method() / method.call() / method.apply() are activated
   *
   * @param method the method to be called
   * @param thisArg object who calling method
   * @param parameters method parameter list
   * @return return value of method
   */
  apply( method: Function, thisArg: T | any, parameters: Array<any> ): any;

  /**
   * active before class instantiating
   *
   * @param native native object
   * @param propKey property key
   * @param proxy native object who be proxied
   * @return return {native} or {proxy} object
   */
  construct( native: T, propKey: string, proxy: T ): T;
}

export declare class Proxy<T> {
  static revocable<T>( target: T, handler: ProxyHandler<T> ): void;

  static newProxy<T>( target: any, handler: ProxyHandler<T> ): T;
}