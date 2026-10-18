// Convex Auth issues its own JWTs; this tells the deployment to trust them.
// CONVEX_SITE_URL is provided automatically by every Convex deployment.
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
