import {
  HashMap, Map, CoreUtils, HashSet,
  Set, IllegalStateException, IllegalArgumentException
} from "jcdt";
import { RequestMethod, ResponseType } from "./core/define";

export interface MethodMetadata {
  classPath?: string;
  methodPath?: string;
  configIndex?: number;
  isFormCommit?: boolean;
  requestBodyIndex?: number;
  responseType?: ResponseType;
  requestMethod?: RequestMethod;

  headers?: Set<string>;
  queryMaps?: Set<number>;
  fieldMaps?: Set<number>;
  queryMapper?: Map<string, number>;
  fieldMapper?: Map<string, number>;
  headersMapper?: Map<string, number>;
  restfulMapper?: Map<string, number>;
}

let metadataMapper: Map<string, MethodMetadata> = new HashMap(),
  classMapper: Map<Function, string> = new HashMap(),
  methodMapper: Map<string, string> = new HashMap(),
  once: Set<string> = new HashSet();

class CollectorUtils {
  public static getOrBuildKey( constructor: Function, method: string = "none" ) {
    let part1: string = classMapper.get( constructor ),
      part2: string = methodMapper.get( method ),
      tempUUID: string = CoreUtils.uuid().replace( /-/g, "" );
    if ( !part1 ) {
      part1 = tempUUID.substr( 0, 16 );
      classMapper.put( constructor, part1 );
    }

    if ( !part2 ) {
      part2 = tempUUID.substr( 16, 32 );
      methodMapper.put( method, part2 );
    }

    return `${part1}${part2}`;
  }

  public static getKeyAndAlias( target: Function | object, method: string, name: string ): [ string, string ] {
    // if target is a Function, that mean target is constructor
    // otherwise, target is a prototype object
    let constructor = target instanceof Function ? target : target.constructor,
      methodId = CollectorUtils.getOrBuildKey( constructor, method ),
      alias = `${methodId}_${name}`;

    return [ methodId, alias ];
  }
}

export class Decorators {
  private static metadataCache: Map<string, MethodMetadata> = new HashMap();

  public static getMetadata( constructor: Function, method: string ): MethodMetadata {
    let key = CollectorUtils.getOrBuildKey( constructor, method );

    if ( this.metadataCache.containsKey( key ) ) {
      return Object.assign( {}, this.metadataCache.get( key ) );
    }

    let methodMetadata = this.findMethodMetadata( constructor.prototype, method );

    if ( CoreUtils.isNone( methodMetadata ) ) {
      this.metadataCache.put( key, <any>null );
      return <any>null;
    }

    let methodMetadataCopier = Object.assign( {}, methodMetadata ),
      finalMetadata = this.metadataMerge( methodMetadataCopier, this.findClassMetadata( constructor.prototype ) );

    this.metadataCache.put( key, finalMetadata );

    return Object.assign( {}, finalMetadata );
  }

  private static findMethodMetadata( prototype: object, method: string ): MethodMetadata {
    let key = CollectorUtils.getOrBuildKey( prototype.constructor, method );

    if ( prototype === Object.prototype ) {
      return <any>null;
    }

    if ( metadataMapper.containsKey( key ) ) {
      return metadataMapper.get( key );
    }

    return this.findMethodMetadata( Object.getPrototypeOf( prototype ), method );
  }

  private static findClassMetadata( prototype: object, metadata: MethodMetadata = Object.create( null ) ): MethodMetadata {
    let key = CollectorUtils.getOrBuildKey( prototype.constructor );

    if ( prototype === Object.prototype ) {
      return metadata;
    }

    if ( metadataMapper.containsKey( key ) ) {
      metadata = this.metadataMerge( metadata, metadataMapper.get( key ) );
    }

    return this.findClassMetadata( Object.getPrototypeOf( prototype ), metadata );
  }

  private static metadataMerge( to: any, from: any ): MethodMetadata {
    Object.keys( from ).forEach( key => {
      if ( key in to ) {
        return;
      }

      to[ key ] = from[ key ];
    } );

    return to;
  }
}


/** Start to define annotations */
function basicMethodAnnotation( name: string, callbackFn: ( metadata: MethodMetadata, target: Object ) => void ): Function {
  return ( target: Object | Function, method: string, descriptor: PropertyDescriptor ) => {
    // third-param is number type in parameter decorators
    if ( CoreUtils.isNumber( descriptor ) ) {
      throw new IllegalStateException( "Method decorator must be use to decorate class constructor or method." );
    }

    let [ key, alias ] = CollectorUtils.getKeyAndAlias( target, method, name );

    if ( CoreUtils.isNone( alias ) ) {
      return descriptor;
    }

    let metadata = metadataMapper.getOrDefault( key, Object.create( null ) );
    if ( !metadataMapper.containsKey( key ) ) {
      metadataMapper.put( key, metadata );
    }

    callbackFn( metadata, target );

    once.add( alias );

    return descriptor;
  };
}

function basicParameterAnnotation( callbackFn: ( metadata: MethodMetadata, parameterIndex: number ) => void ): Function {
  return ( target: Object, methodName: string | symbol, parameterIndex: number ) => {
    if ( CoreUtils.isNone( parameterIndex ) || !CoreUtils.isNumber( parameterIndex ) ) {
      throw new IllegalStateException( "Parameter decorator must be use to decorate parameter." );
    }

    let [ key, alias ] = CollectorUtils.getKeyAndAlias( target, <string>methodName, parameterIndex.toString() );

    if ( CoreUtils.isNone( alias ) ) {
      return;
    }

    let metadata = metadataMapper.getOrDefault( key, Object.create( null ) );
    if ( !metadataMapper.containsKey( key ) ) {
      metadataMapper.put( key, metadata );
    }

    callbackFn( metadata, parameterIndex );

    once.add( alias );
  };
}

export function HTTP( path: string, method: RequestMethod = RequestMethod.GET ): Function {
  return basicMethodAnnotation( "http", ( metadata, target ) => {
    metadata[ target instanceof Function ? "classPath" : "methodPath" ] = path;
    metadata.requestMethod = method;
  } );
}

export function GET( path: string ): Function {
  return HTTP( path, RequestMethod.GET );
}

export function POST( path: string ): Function {
  return HTTP( path, RequestMethod.POST );
}

export function PUT( path: string ): Function {
  return HTTP( path, RequestMethod.PUT );
}

export function DELETE( path: string ): Function {
  return HTTP( path, RequestMethod.DELETE );
}

export function OPTIONS( path: string ): Function {
  return HTTP( path, RequestMethod.OPTIONS );
}

export function HEAD( path: string ): Function {
  return HTTP( path, RequestMethod.HEAD );
}

export function PATCH( path: string ): Function {
  return HTTP( path, RequestMethod.PATCH );
}

export let Body = ( () => {
  return basicParameterAnnotation( ( metadata, parameterIndex ) => {
    metadata.requestBodyIndex = parameterIndex;
  } );
} )();

export function Path( name: string ) {
  if ( !CoreUtils.isString( name ) ) {
    throw new IllegalArgumentException( "Require path name." );
  }

  return basicParameterAnnotation( ( metadata, parameterIndex ) => {
    if ( CoreUtils.isNone( metadata.restfulMapper ) ) {
      metadata.restfulMapper = new HashMap();
    }

    ( <Map<string, number>>metadata.restfulMapper ).put( name, parameterIndex );
  } );
}

export function Query( name: string ) {
  if ( !CoreUtils.isString( name ) ) {
    throw new IllegalArgumentException( "Require query name." );
  }

  return basicParameterAnnotation( ( metadata, parameterIndex ) => {
    if ( CoreUtils.isNone( metadata.queryMapper ) ) {
      metadata.queryMapper = new HashMap();
    }

    ( <Map<string, number>>metadata.queryMapper ).put( name, parameterIndex );
  } );
}

export let QueryMap = ( () => {
  return basicParameterAnnotation( ( metadata, parameterIndex ) => {
    if ( CoreUtils.isNone( metadata.queryMaps ) ) {
      metadata.queryMaps = new HashSet();
    }

    ( <Set<number>>metadata.queryMaps ).add( parameterIndex );
  } );
} )();

export function Headers( headers: string | string[] ) {
  if ( CoreUtils.isNone( headers ) ) {
    throw new IllegalArgumentException( "Require headers." );
  }

  return basicMethodAnnotation( "headers", metadata => {
    if ( CoreUtils.isNone( metadata.headers ) ) {
      metadata.headers = new HashSet();
    }

    let headersSet: Set<string> = <Set<string>>metadata.headers,
      headersArr: string[] = [];

    if ( CoreUtils.isString( headers ) ) {
      headersArr.push( <string>headers );

    } else if ( CoreUtils.isSimpleObject( headers ) ) {
      headersArr.push( ...headers );

    } else {
      throw new IllegalArgumentException( "Illegal header." );
    }

    headersArr.forEach( header => {
      header = header.replace( /^\s*|\s*$/g, "" );

      if ( !/[\w\-]+\s*:\s*.+/.test( header ) ) {
        throw new IllegalArgumentException( `Illegal header '${header}'.` );
      }

      headersSet.add( header );
    } );
  } );
}

export function Header( name: string ) {
  if ( !CoreUtils.isString( name ) ) {
    throw new IllegalArgumentException( "Require header name." );
  }

  return basicParameterAnnotation( ( metadata, parameterIndex ) => {
    if ( !( "headersMapper" in metadata ) ) {
      metadata.headersMapper = new HashMap();
    }

    ( <Map<string, number>>metadata.headersMapper ).put( name, parameterIndex );
  } );
}

export let FormUrlEncoded = ( () => basicMethodAnnotation( "form", metadata => metadata.isFormCommit = true ) )();

export function Field( name: string ) {
  if ( !CoreUtils.isString( name ) ) {
    throw new IllegalArgumentException( "Require field name." );
  }

  return basicParameterAnnotation( ( metadata, parameterIndex ) => {
    if ( CoreUtils.isNone( metadata.fieldMapper ) ) {
      metadata.fieldMapper = new HashMap();
    }

    ( <Map<string, number>>metadata.fieldMapper ).put( name, parameterIndex );
  } );
}

export let FieldMap = ( () => {
  return basicParameterAnnotation( ( metadata, parameterIndex ) => {
    if ( CoreUtils.isNone( metadata.fieldMaps ) ) {
      metadata.fieldMaps = new HashSet();
    }

    ( <Set<number>>metadata.fieldMaps ).add( parameterIndex );
  } );
} )();

export let Config = ( () => basicParameterAnnotation( ( metadata, parameterIndex ) => metadata.configIndex = parameterIndex ) )();