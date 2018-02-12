( function ( factory ) {
    "use strict";

    Object.defineProperty( exports, "__esModule", { value: true } );
    factory( exports, Proxy );

} )( function ( context, NativeProxy ) {

    class Proxy {
        static revocable( target, handler ) {
            return NativeProxy.revocable( target, handler );
        }

        static newProxy( target, handler ) {
            return new NativeProxy( target, handler );
        }
    }

    class ProxyHandler {
        get( native, propKey, proxy ) {
            return native[ propKey ];
        }

        set( native, propKey, value, proxy ) {
            native[ propKey ] = value;
            return true;
        }

        has( native, propKey ) {
            return propKey in native;
        }

        deleteProperty( native, propKey ) {
            return true;
        }

        ownKeys( native ) {
            return native;
        }

        getOwnPropertyDescriptor( native, propKey ) {
            return Object.getOwnPropertyDescriptor( native, propKey );
        }

        defineProperty( native, propKey, propDesc ) {
            return true;
        }

        preventExtensions( native ) {
            return true;
        }

        getPrototypeOf( native ) {
            return native;
        }

        isExtensible( native ) {
            return Object.isExtensible( native );
        }

        setPrototypeOf( native ) {
            return true;
        }

        apply( method, thisArg, parameters ) {
            return method( ...parameters );
        }

        construct( native, propKey, proxy ) {
            return native;
        }
    }

    context.Proxy = Proxy;
    context.ProxyHandler = ProxyHandler;
} );