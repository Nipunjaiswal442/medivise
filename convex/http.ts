import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// Routes Convex Auth needs (JWKS, OpenID configuration, OAuth callbacks).
auth.addHttpRoutes(http);

export default http;
