// functions/src/index.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin
admin.initializeApp();

// Import our functions
import { createQuizSession } from "./quiz/createSession";
import { submitQuizSession } from "./quiz/submitSession";

// Export all functions
export {
  createQuizSession,
  submitQuizSession
};
