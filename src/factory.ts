import { MethodMetadata } from "./decorators";
import {
  Map, HashSet, Set, CoreUtils, StringUtils, IllegalArgumentException, HashMap,
  IndexOutOfBoundsException
} from "jcdt";
import { RequestInterFace, RetrofitRequest } from "./core/define";
import {
  BodyNotMatchException, HeaderNotMatchException, PathVariableNotMatchException,
  QueryParamNotMatchException,
  IllegalRequestException
} from "./core/exception";


let isBrowser = false;
try {
  let testing = FormData;
  isBrowser = true;

} catch ( e ) {
  isBrowser = false;
}

interface MetadataValidator {
  handler( metadata: MethodMetadata ): void;
}

class Validation {
  private pipe: MetadataValidator[];

  public constructor() {
    this.pipe = Object.getOwnPropertyNames( Object.getPrototypeOf( this ) )
      .filter( name => -1 === "checkIn constructor".indexOf( name ) )
      .map( name => ( <any>this )[ name ]() );
  }

  private noBodyOrFormInGetRequest(): MetadataValidator {
    return {
      handler( metadata: MethodMetadata ): void {
        if ( "requestMethod" in metadata && metadata.requestMethod !== "get" ) {
          return;
        }

        if ( "requestBodyIndex" in metadata || "fieldMapper" in metadata || "fieldMaps" in metadata ) {
          throw new IllegalRequestException( "There not allow request body or form with GET request." );
        }
      }
    };
  }

  private noBodyAndFormExistInSameRequest(): MetadataValidator {
    return {
      handler( metadata: MethodMetadata ): void {
        if ( ( "fieldMapper" in metadata || "fieldMaps" in metadata ) && "requestBodyIndex" in metadata ) {
          throw new IllegalRequestException( "Can not use body and form in same request." );
        }
      }
    };
  }

  private noDuplicateIndex(): MetadataValidator {
    return {
      handler( metadata: MethodMetadata ): void {
        let indexBucket: Set<number> = new HashSet(),
          indexFilter: ( index: number ) => void = index => {

            if ( indexBucket.contains( index ) ) {
              throw new IllegalRequestException( "There have duplicate parameter declare." );
            }

            indexBucket.add( index );
          },

          hashSetFilter: ( name: string ) => void = name => name in metadata
            ? ( <any>metadata )[ name ].toArray().forEach( indexFilter ) : null,

          hashMapFilter: ( name: string ) => void = name => name in metadata
            ? ( <any>metadata )[ name ].values().toArray().forEach( indexFilter ) : null;

        if ( "requestBodyIndex" in metadata ) {
          indexFilter( <number>metadata.requestBodyIndex );
        }

        if ( "configIndex" in metadata ) {
          indexFilter( <number>metadata.configIndex );
        }

        [ "headers", "queryMaps", "fieldMaps" ].forEach( hashSetFilter );
        [ "queryMapper", "fieldMapper", "headersMapper", "restfulMapper" ].forEach( hashMapFilter );
      }
    };
  }

  private isResponseType(): MetadataValidator {
    let types: Set<string> = new HashSet<string>();

    [ "arraybuffer", "blob", "document", "json", "text", "stream" ].forEach( key => types.add( key ) );

    return {
      handler( metadata: MethodMetadata ): void {
        if ( !( "responseType" in metadata ) ) {
          return;
        }

        if ( !types.contains( metadata.responseType ) ) {
          throw new IllegalRequestException( "There are not response type." );
        }
      }
    };
  }

  public checkIn( metadata: MethodMetadata ): void {
    this.pipe.forEach( h => h.handler( metadata ) );
  }
}


interface MetadataHandler {
  order: number;

  handler( metadata: MethodMetadata, parameter: any[], request: RequestInterFace ): void;
}

export class RequestBuilder {
  private pipe: MetadataHandler[];

  private validator: Validation = new Validation();
  private safe: Set<MethodMetadata> = new HashSet();

  public constructor() {
    this.pipe = Object.getOwnPropertyNames( Object.getPrototypeOf( this ) )
      .filter( name => -1 === "build constructor".indexOf( name ) )
      .map( name => ( <any>this )[ name ]() )

      .sort( ( a: MetadataHandler, b: MetadataHandler ): number =>
        a.order === b.order ? 0 : a.order > b.order ? 1 : -1 );
  }

  private basePathHandler(): MetadataHandler {
    return {
      order: 0,
      handler( metadata: MethodMetadata, parameter: any[], request: RequestInterFace ): void {
        let classPath = "classPath" in metadata ? metadata.classPath : "",
          methodPath = "methodPath" in metadata ? metadata.methodPath : "";

        request.url = `${classPath}/${methodPath}`.replace( /\w(\/{2,})/g,
          ( match: string, key: string ): string => match.replace( key, "/" ) );
      }
    };
  }

  private methodHandler(): MetadataHandler {
    return {
      order: 0,
      handler( metadata: MethodMetadata, parameter: any[], request: RequestInterFace ): void {
        request.method = "requestMethod" in metadata ? metadata.requestMethod : "get";
      }
    };
  }

  private restfulPathHandler(): MetadataHandler {
    return {
      order: 1,
      handler( metadata: MethodMetadata, parameter: any[], request: RequestInterFace ): void {
        if ( StringUtils.isBlank( <string>request.url ) || !( "restfulMapper" in metadata ) ) {
          return;
        }

        let mapper = <Map<string, number>>metadata.restfulMapper;
        request.url = ( <string>request.url ).replace( /:([\w\-_]+)/g, ( match: string, key: string ): string => {
          if ( !mapper.containsKey( key ) ) {
            throw new PathVariableNotMatchException( `The path variable '${key}' is not match.` );
          }

          let index = mapper.get( key );
          if ( index >= parameter.length ) {
            throw new IndexOutOfBoundsException( `The url '${request.url}' path variable '${key}' is out of index.` );
          }

          return encodeURI( parameter[ index ] );
        } );
      }
    };
  }

  private queryPathHandler(): MetadataHandler {
    return {
      order: 2,
      handler( metadata: MethodMetadata, parameter: any[], request: RequestInterFace ): void {
        if ( StringUtils.isBlank( <string>request.url ) || !( "queryMapper" in metadata || "queryMaps" in metadata ) ) {
          return;
        }

        let mapper: { [key: string]: string } = Object.create( null ),
          queryMaps: Set<number> = "queryMaps" in metadata ? <Set<number>>metadata.queryMaps : new HashSet(),
          queryMapper: Map<string, number> = "queryMapper" in metadata ? <Map<string, number>>metadata.queryMapper : new HashMap();

        for ( let entry of queryMapper.entrySet() ) {
          if ( entry.value >= parameter.length ) {
            throw new IndexOutOfBoundsException( `The url '${request.url}' query param '${entry.key}' is out of index.` );
          }

          mapper[ entry.key ] = parameter[ entry.value ];
        }

        for ( let index of queryMaps ) {
          if ( index >= parameter.length ) {
            throw new IndexOutOfBoundsException( `The url '${request.url}' query param map is out of index.` );
          }

          if ( !CoreUtils.isSimpleObject( parameter[ index ] ) ) {
            throw new QueryParamNotMatchException( "QueryMap require a object." );
          }

          let localMapper = parameter[ index ];
          Object.keys( localMapper ).forEach( name => mapper[ name ] = localMapper[ name ] );
        }

        let url: string = <string>request.url,
          queryParams = Object.keys( mapper ).map( name => `${name}=${mapper[ name ]}` ).join( "&" );

        queryParams = encodeURI( queryParams );

        request.url = /\?/.test( url )
          ? /&$/.test( url ) ? `${request.url}${queryParams}` : `${request.url}&${queryParams}`
          : `${request.url}?${queryParams}`;
      }
    };
  }

  private headerHandler(): MetadataHandler {
    return {
      order: 3,
      handler( metadata: MethodMetadata, parameter: any[], request: RequestInterFace ): void {
        if ( !( "headers" in metadata || "headersMapper" in metadata ) ) {
          return;
        }

        let mapper: { [key: string]: string } = Object.create( null ),
          headers: Set<string> = "headers" in metadata ? <Set<string>>metadata.headers : new HashSet(),
          headersMapper: Map<string, number> = "headersMapper" in metadata ? <Map<string, number>>metadata.headersMapper : new HashMap();

        for ( let entry of headersMapper.entrySet() ) {
          if ( entry.value >= parameter.length ) {
            throw new IndexOutOfBoundsException( `The url '${request.url}' query param '${entry.key}' is out of index.` );
          }

          mapper[ entry.key ] = parameter[ entry.value ];
        }

        for ( let header of headers ) {
          let [ key, value ] = header.trim().split( ":" );

          if ( StringUtils.isBlank( key ) || StringUtils.isBlank( value ) ) {
            throw new HeaderNotMatchException( `Header require key-value entry.` );
          }

          mapper[ key ] = value.trim();
        }

        request.headers = mapper;
      }
    };
  }

  private fieldBodyHandler(): MetadataHandler {
    return {
      order: 4,
      handler( metadata: MethodMetadata, parameter: any[], request: RequestInterFace ): void {
        if ( StringUtils.isBlank( <string>request.url )
          || ( !( "fieldMapper" in metadata ) && !( "fieldMaps" in metadata ) )
          || "requestBodyIndex" in metadata ) {

          return;
        }

        let mapper: { [key: string]: string } = Object.create( null ),
          fieldMaps: Set<number> = "fieldMaps" in metadata ? <Set<number>>metadata.fieldMaps : new HashSet(),
          fieldMapper: Map<string, number> = "fieldMapper" in metadata ? <Map<string, number>>metadata.fieldMapper : new HashMap();

        for ( let entry of fieldMapper.entrySet() ) {
          if ( entry.value >= parameter.length ) {
            throw new IndexOutOfBoundsException( `The form body field of '${entry.key}' is out of index.` );
          }

          mapper[ entry.key ] = parameter[ entry.value ];
        }

        for ( let index of fieldMaps ) {
          if ( index >= parameter.length ) {
            throw new IndexOutOfBoundsException( `The url '${request.url}' field map is out of index.` );
          }

          if ( !CoreUtils.isSimpleObject( parameter[ index ] ) ) {
            throw new BodyNotMatchException( "FieldMap require a object." );
          }

          let localMapper = parameter[ index ];
          Object.keys( localMapper ).forEach( name => mapper[ name ] = localMapper[ name ] );
        }

        request.data = encodeURI( Object.keys( mapper ).map( name => `${name}=${mapper[ name ]}` ).join( "&" ) );
        request.headers[ "Content-Type" ] = "application/x-www-form-urlencoded";
      }
    };
  }

  private bodyHandler(): MetadataHandler {
    return {
      order: 4,
      handler( metadata: MethodMetadata, parameter: any[], request: RequestInterFace ): void {
        if ( !( "requestBodyIndex" in metadata ) ) {
          return;
        }

        if ( <number>metadata.requestBodyIndex >= parameter.length ) {
          throw new IndexOutOfBoundsException( `The url '${request.url}' body is out of index.` );
        }

        let body = parameter[ <number>metadata.requestBodyIndex ];
        if ( !CoreUtils.isSimpleObject( body ) ) {
          throw new BodyNotMatchException( "Body require a object." );
        }

        request.data = body;
        request.headers[ "Content-Type" ] = "application/json;charset=UTF-8";
      }
    };
  }

  private responseBodyHandler(): MetadataHandler {
    return {
      order: 4,
      handler( metadata: MethodMetadata, parameter: any[], request: RequestInterFace ): void {
        if ( !( "responseType" in metadata ) ) {
          return;
        }

        request.responseType = metadata.responseType;
      }
    };
  }

  private configMerge(): MetadataHandler {
    return {
      order: 10,
      handler( metadata: MethodMetadata, parameter: any[], request: RequestInterFace ): void {
        if ( !( "configIndex" in metadata ) ) {
          return;
        }

        if ( <number>metadata.configIndex >= parameter.length ) {
          throw new IndexOutOfBoundsException( `The url '${request.url}' body is out of index.` );
        }

        let config = parameter[ <number>metadata.configIndex ];
        if ( CoreUtils.isSimpleObject( config ) ) {
          throw new IllegalArgumentException( "Config require a object." );
        }

        Object.keys( config ).forEach( name => ( <any>request )[ name ] = config[ name ] );
      }
    };
  }

  public build( metadata: MethodMetadata, parameters: any[] ): RequestInterFace {
    if ( CoreUtils.isNone( metadata ) ) {
      throw new IllegalArgumentException( "Require metadata to build request." );
    }

    if ( !this.safe.contains( metadata ) ) {
      this.validator.checkIn( metadata );
      this.safe.add( metadata );
    }

    let request = new RetrofitRequest();
    this.pipe.forEach( h => h.handler( metadata, parameters, request ) );

    return request;
  }
}