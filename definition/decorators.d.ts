import { RequestMethod, ResponseType } from "./core/define";

export function HTTP( path: string, method?: RequestMethod ): Function;

export function GET( path: string ): Function;

export function POST( path: string ): Function;

export function PUT( path: string ): Function;

export function DELETE( path: string ): Function;

export function OPTIONS( path: string ): Function;

export function HEAD( path: string ): Function;

export function PATCH( path: string ): Function;

export let Body: Function;

export function Path( name: string ): Function;

export function Query( name: string ): Function;

export let QueryMap: Function;

export function Headers( headers: string | string[] ): Function;

export function Header( name: string ): Function;

export let FormUrlEncoded: Function;

export function Field( name: string ): Function;

export let FieldMap: Function;

export let Config: Function;

export function ResponseBody( name?: ResponseType ): Function;