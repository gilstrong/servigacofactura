const admin = require("firebase-admin");

const serviceAccount = {
  project_id: process.env.FIREBASE_PROJECT_ID,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://servigaco-default-rtdb.firebaseio.com"
});

const db = admin.database();
console.log("🔥 Firebase Admin inicializado correctamente desde variables de entorno.");

module.exports = { db };
