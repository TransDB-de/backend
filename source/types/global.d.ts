import * as express from "express"
import * as Api from "../api/api"

// This type definition file maps the api definition to custom express.js Interfaces, to ensure type safety
// Author @ElectronicBlueberry

// Extract all avalible methods from route base type
type Methods = keyof Api.Route;

// This helper type makes sure something is either defined, or undefined
// Prevents types from defaulting to unkown, when insufficiently defined.
type MustExtend<T, U> = T extends U ? T : undefined; 

// Overrides express router method definition
// Types are now infered from the router methods path
interface RouteMatcher<T, method extends Methods, baseRoute extends Api.Route> {

    <Path extends keyof baseRoute[method]> // Path the user enters into the function  
    (path: Path,...handlers: Array<express.RequestHandler< // set types for used request handlers

        // Searches for the correct type with given baseRoute and path
        MustExtend< baseRoute[method][Path]["params"], Api.PossileParams >,
        MustExtend< baseRoute[method][Path]["response"], Api.PossibleResponse >,
        MustExtend< baseRoute[method][Path]["request"], Api.PossibleRequest >,
        MustExtend< baseRoute[method][Path]["query"], Api.PossibleQuery >

    >> ): T; // return self, same as express.js definition

}

declare global {
    /**
     * Replaces express.js RequestHandler.
     * Includes all possible request bodies, queries, and parameters.
     * Includes all possible response bodies.
     */
    interface IMiddleware extends express.RequestHandler<Api.PossileParams, Api.PossibleResponse, Api.PossibleRequest, Api.PossibleQuery> {}

    /**
     * Replaces express.js Request.
     * Includes all possible request bodies, as defined out in api.ts
     */
    interface IRequest extends express.Request<Api.PossileParams, Api.PossibleResponse, Api.PossibleRequest, Api.PossibleQuery> {}

    /**
     * Replaces express.js Response.
     * Includes all possible response bodies, as defined out in api.ts
     */
    interface IResponse extends express.Response<Api.PossibleResponse> {}

    /**
     * Replaces express.js Router.
     * Typechecks according to the api.ts definitions.
     * 'baseRoute' can be any interface extending 'Route'
     */
    interface IRouter< baseRoute extends Api.Route > extends Omit< express.IRouter, keyof { get, post, put, patch, delete } > {

        get: RouteMatcher<this, "get", baseRoute>
        post: RouteMatcher<this, "post", baseRoute>
        put: RouteMatcher<this, "put", baseRoute>
        patch: RouteMatcher<this, "patch", baseRoute>
        delete: RouteMatcher<this, "delete", baseRoute>

    }
}
