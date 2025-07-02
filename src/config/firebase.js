import admin from 'firebase-admin'
import path from 'path'
//download this file from firebase and add it to project root and save it here below
const serviceAccount = require(path.join(__dirname, "../../chatter-289f4-firebase-adminsdk-fbsvc-bd6ded5f47.json")); // your Firebase Admin SDK key

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;