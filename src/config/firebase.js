import admin from 'firebase-admin'
import path from 'path'
//download this file from firebase and add it to project root and save it here below
import serviceAccount from "../../livelink-6be26-firebase-adminsdk-fbsvc-189099b76d.json" assert { type: "json" };
 // your Firebase Admin SDK key

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin