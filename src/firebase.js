// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBNl6CbKapjqcE9vhB9GEZqPqFehB_A5Ug",
  authDomain: "pokerinsite-6ad08.firebaseapp.com",
  projectId: "pokerinsite-6ad08",
  storageBucket: "pokerinsite-6ad08.appspot.com",
  messagingSenderId: "1073807509897",
  appId: "1:1073807509897:web:490aa29d907c9ccd0d7958",
  measurementId: "G-G4KRPQ2LKC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);

export { app, auth, analytics };
