// Tells Convex to trust Firebase ID tokens issued for this Firebase project.
// The frontend sends `await firebaseUser.getIdToken()`; Convex verifies it against
// https://securetoken.google.com/<projectId> and exposes the Firebase uid as identity.subject.
const projectId = process.env.FIREBASE_PROJECT_ID ?? "medivise-45810";

export default {
  providers: [
    {
      domain: `https://securetoken.google.com/${projectId}`,
      applicationID: projectId,
    },
  ],
};
