import { Exception } from "jcdt";

export class RequestCancelException extends Exception {
  public constructor( message?: string );
}

export class RequestTimeoutException extends Exception {
  public constructor( message?: string );
}

export class IOException extends Exception {
  public constructor( message?: string );
}

export class PathVariableNotMatchException extends Exception {
  public constructor( message?: string );
}

export class QueryParamNotMatchException extends Exception {
  public constructor( message?: string );
}

export class BodyNotMatchException extends Exception {
  public constructor( message?: string );
}

export class HeaderNotMatchException extends Exception {
  public constructor( message?: string );
}

export class IllegalRequestException extends Exception {
  public constructor( message?: string );
}