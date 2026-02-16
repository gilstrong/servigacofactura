const admin = require("firebase-admin");
const path = require("path");

if (!admin.apps.length) {
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
      databaseURL: "https://servigaco-default-rtdb.firebaseio.com",
    });

    console.log("🔥 Firebase inicializado desde ENV");
  } else {
    const serviceAccount = require(path.join(__dirname, "../../serviceAccountKey.json"));

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://servigaco-default-rtdb.firebaseio.com",
    });

    console.log("🔥 Firebase inicializado desde JSON local");
  }
}

const db = admin.database();

module.exports = { admin, db };
