import { Exception } from "jcdt";

export class RequestCancelException extends Exception {
    public constructor( message: string = "" ) {
        super( "RequestCancelException", message );
    }
}

export class RequestTimeoutException extends Exception {
  public constructor( message: string = "" ) {
    super( "RequestTimeoutException", message );
  }
}

export class IOException extends Exception {
  public constructor( message: string = "" ) {
    super( "IOException", message );
  }
}

export class PathVariableNotMatchException extends Exception {
    public constructor( message: string = "" ) {
        super( "PathVariableNotMatchException", message );
    }
}

export class QueryParamNotMatchException extends Exception {
    public constructor( message: string = "" ) {
        super( "QueryParamNotMatchException", message );
    }
}

export class BodyNotMatchException extends Exception {
    public constructor( message: string = "" ) {
        super( "BodyNotMatchException", message );
    }
}

export class HeaderNotMatchException extends Exception {
    public constructor( message: string = "" ) {
        super( "HeaderNotMatchException", message );
    }
}

export class IllegalRequestException extends Exception {
    public constructor( message: string = "" ) {
        super( "IllegalRequestException", message );
    }
}