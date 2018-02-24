import { MethodMetadata } from "./decorators";
import {
  CoreUtils, HashMap, HashSet, IllegalArgumentException, IllegalStateException, IndexOutOfBoundsException, Map,
  Set, StringUtils
} from "jcdt";
import { RequestInterFace, RequestMethod, ResponseType, RetrofitRequest } from "./core/define";
import {
  BodyNotMatchException, HeaderNotMatchException, IllegalRequestException, PathVariableNotMatchException,
  QueryParamNotMatchException
} from "./core/exception";

import * as FormData from "form-data";


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

  private noMatchRestfulPath(): MetadataValidator {
    return {
      handler( metadata: MethodMetadata ): void {
        let matcher = /:([\w\-_]+)/g,
          hasRestfulClassPath = metadata.classPath && matcher.test( <string>metadata.classPath ),
          hasRestfulMethodPath = metadata.methodPath && matcher.test( <string>metadata.methodPath ),
          hasRestfulPathVariable = metadata.restfulMapper && !metadata.restfulMapper.isEmpty();

        if ( ( hasRestfulClassPath || hasRestfulMethodPath ) && !hasRestfulPathVariable ) {
          let url = "";

          if ( hasRestfulClassPath ) {
            url += metadata.classPath;
          }

          if ( hasRestfulMethodPath ) {
            url += ( "/" + metadata.methodPath );
          }

          url = url.replace( /(\/{2,})/g,
            ( match: string, key: string ): string => match.replace( key, "/" ) );

          throw new PathVariableNotMatchException( `You may missing some path variables in ${url}.` );
        }
      }
    };
  }

  private noBodyOrFormInGetRequest(): MetadataValidator {
    return {
      handler( metadata: MethodMetadata ): void {
        if ( metadata.requestMethod && metadata.requestMethod !== "get" ) {
          return;
        }

        if ( "requestBodyIndex" in metadata || metadata.isMultiPart || metadata.isFormCommit ) {
          throw new IllegalRequestException( "There not allow request body or form with GET request." );
        }
      }
    };
  }

  private noBodyAndFormExistInSameRequest(): MetadataValidator {
    return {
      handler( metadata: MethodMetadata ): void {
        if ( ( metadata.isMultiPart || metadata.isFormCommit ) && "requestBodyIndex" in metadata ) {
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

        [ "headers", "queryMaps", "fieldMaps", "partMaps" ].forEach( hashSetFilter );
        [ "queryMapper", "fieldMapper", "headersMapper", "restfulMapper", "partMapper" ].forEach( hashMapFilter );
      }
    };
  }

  private isResponseType(): MetadataValidator {
    let types: Set<string> = new HashSet<string>();

    [ ResponseType.JSON, ResponseType.ARRAY_BUFFER, ResponseType.STREAM,
      ResponseType.DOCUMENT, ResponseType.TEXT, ResponseType.BLOB

    ].forEach( key => types.add( key ) );

    return {
      handler( metadata: MethodMetadata ): void {
        if ( !metadata.responseType ) {
          return;
        }

        if ( !types.contains( metadata.responseType ) ) {
          throw new IllegalRequestException( "There are not support response type." );
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
        let classPath = metadata.classPath ? metadata.classPath : "",
          methodPath = metadata.methodPath ? metadata.methodPath : "";

        request.url = `${classPath}/${methodPath}`.replace( /\w(\/{2,})/g,
          ( match: string, key: string ): string => match.replace( key, "/" ) );
      }
    };
  }

  private methodHandler(): MetadataHandler {
    return {
      order: 0,
      handler( metadata: MethodMetadata, parameter: any[], request: RequestInterFace ): void {
        request.method = metadata.requestMethod ? metadata.requestMethod : RequestMethod.GET;
      }
    };
  }

  private restfulPathHandler(): MetadataHandler {
    return {
      order: 1,
      handler( metadata: MethodMetadata, parameter: any[], request: RequestInterFace ): void {
        if ( StringUtils.isBlank( <string>request.url ) || !metadata.restfulMapper ) {
          return;
        }

        let mapper = <Map<string, number>>metadata.restfulMapper;
        request.url = ( <string>request.url ).replace( /:([\w\-_]+)/g, ( match: string, key: string ): string => {
          if ( !mapper.containsKey( key ) ) {
            throw new PathVariableNotMatchException( `The url ${request.url} variable @Path ${key} is not match.` );
          }

          let index = mapper.get( key );
          if ( index >= parameter.length ) {
            throw new IndexOutOfBoundsException( `The url '${request.url}' variable @Path '${key}' is out of index.` );
          }

          return encodeURI( parameter[ index ] );
        } );
      }
    };
  }

  private queryPathHandler(): MetadataHandler {
    return {
      order: 1,
      handler( metadata: MethodMetadata, parameter: any[], request: RequestInterFace ): void {
        if ( StringUtils.isBlank( <string>request.url ) || !( metadata.queryMaps || metadata.queryMapper ) ) {
          return;
        }

        let mapper: { [key: string]: string } = Object.create( null ),
          queryMaps: Set<number> = metadata.queryMaps ? <Set<number>>metadata.queryMaps : new HashSet(),
          queryMapper: Map<string, number> = metadata.queryMapper ? <Map<string, number>>metadata.queryMapper : new HashMap();

        for ( let entry of queryMapper.entrySet() ) {
          if ( entry.value >= parameter.length ) {
            throw new IndexOutOfBoundsException( `The url '${request.url}' variable @Query '${entry.key}' is out of index.` );
          }

          mapper[ entry.key ] = parameter[ entry.value ];
        }

        for ( let index of queryMaps ) {
          if ( index >= parameter.length ) {
            throw new IndexOutOfBoundsException( `The url '${request.url}' variable @QueryMap is out of index.` );
          }

          if ( !CoreUtils.isSimpleObject( parameter[ index ] ) ) {
            throw new QueryParamNotMatchException( "@QueryMap require a object." );
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
      order: 2,
      handler( metadata: MethodMetadata, parameter: any[], request: RequestInterFace ): void {
        if ( !( metadata.headers || metadata.headersMapper ) ) {
          return;
        }

        let mapper: { [key: string]: string } = Object.create( null ),
          headers: Set<string> = metadata.headers ? <Set<string>>metadata.headers : new HashSet(),
          headersMapper: Map<string, number> = metadata.headersMapper ? <Map<string, number>>metadata.headersMapper : new HashMap();

        for ( let entry of headersMapper.entrySet() ) {
          if ( entry.value >= parameter.length ) {
            throw new IndexOutOfBoundsException( `The url '${request.url}' variable @Header '${entry.key}' is out of index.` );
          }

          mapper[ entry.key ] = parameter[ entry.value ];
        }

        for ( let header of headers ) {
          let [ key, value ] = header.trim().split( ":" );

          if ( StringUtils.isBlank( key ) || StringUtils.isBlank( value ) ) {
            throw new HeaderNotMatchException( `@Header require key-value entry.` );
          }

          mapper[ key ] = value.trim();
        }

        request.headers = mapper;
      }
    };
  }

  private multiPartHandler(): MetadataHandler {
    return {
      order: 4,
      handler( metadata: MethodMetadata, parameter: any[], request: RequestInterFace ): void {
        if ( !metadata.isMultiPart ) {
          return;
        }

        let mapper: { [key: string]: string } = Object.create( null ),
          partMaps: Set<number> = metadata.partMaps ? <Set<number>>metadata.partMaps : new HashSet(),
          partMapper: Map<string, number> = metadata.partMapper ? <Map<string, number>>metadata.partMapper : new HashMap();

        for ( let entry of partMapper.entrySet() ) {
          if ( entry.value >= parameter.length ) {
            throw new IndexOutOfBoundsException( `The url '${request.url}' variable @Part '${entry.key}' is out of index.` );
          }

          mapper[ entry.key ] = parameter[ entry.value ];
        }

        for ( let index of partMaps ) {
          if ( index >= parameter.length ) {
            throw new IndexOutOfBoundsException( `The url '${request.url}' variable @PartMap is out of index.` );
          }

          if ( !CoreUtils.isSimpleObject( parameter[ index ] ) ) {
            throw new BodyNotMatchException( "@PartMap require a object." );
          }

          let localMapper = parameter[ index ];
          Object.keys( localMapper ).forEach( name => mapper[ name ] = localMapper[ name ] );
        }

        if ( !( "data" in request ) ) {
          request.data = new FormData();
        }

        if ( !( request.data instanceof FormData ) ) {
          throw new IllegalStateException( "Request Body is not Empty." );
        }

        let form: FormData = request.data,
          isNode = typeof( window ) === "undefined";

        Object.keys( mapper ).forEach( key => {
          if ( isNode && Buffer.isBuffer( mapper[ key ] ) ) {
            throw new IllegalArgumentException( "You can use 'fs' to create read stream and upload it if you want to upload a file." );
          }

          form.append( key, mapper[ key ] );
        } );

        // only use it in node
        if ( isNode ) {
          request.headers[ "Content-Type" ] = `multipart/form-data; boundary=${form.getBoundary()}`;
        }
      }
    };
  }

  private fieldBodyHandler(): MetadataHandler {
    return {
      order: 4,
      handler( metadata: MethodMetadata, parameter: any[], request: RequestInterFace ): void {
        if ( !metadata.isFormCommit ) {
          return;
        }

        let mapper: { [key: string]: string } = Object.create( null ),
          fieldMaps: Set<number> = metadata.fieldMaps ? <Set<number>>metadata.fieldMaps : new HashSet(),
          fieldMapper: Map<string, number> = metadata.fieldMapper ? <Map<string, number>>metadata.fieldMapper : new HashMap();

        for ( let entry of fieldMapper.entrySet() ) {
          if ( entry.value >= parameter.length ) {
            throw new IndexOutOfBoundsException( `The url '${request.url}' variable @Field '${entry.key}' is out of index.` );
          }

          mapper[ entry.key ] = parameter[ entry.value ];
        }

        for ( let index of fieldMaps ) {
          if ( index >= parameter.length ) {
            throw new IndexOutOfBoundsException( `The url '${request.url}' variable @FieldMap is out of index.` );
          }

          if ( !CoreUtils.isSimpleObject( parameter[ index ] ) ) {
            throw new BodyNotMatchException( "@FieldMap require a object." );
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
          throw new IndexOutOfBoundsException( `The url '${request.url}' variable @Body is out of index.` );
        }

        let body = parameter[ <number>metadata.requestBodyIndex ];
        if ( !CoreUtils.isSimpleObject( body ) ) {
          throw new BodyNotMatchException( "@Body require a object." );
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
        if ( !metadata.responseType ) {
          return;
        }

        request.responseType = metadata.responseType;
      }
    };
  }

  private configMerge(): MetadataHandler {
    return {
      order: 9999,
      handler( metadata: MethodMetadata, parameter: any[], request: RequestInterFace ): void {
        if ( !( "configIndex" in metadata ) ) {
          return;
        }

        if ( <number>metadata.configIndex >= parameter.length ) {
          throw new IndexOutOfBoundsException( `The url '${request.url}' variable @Config is out of index.` );
        }

        let config = parameter[ <number>metadata.configIndex ];
        if ( !CoreUtils.isSimpleObject( config ) ) {
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