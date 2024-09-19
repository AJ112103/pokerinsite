const admin = require('firebase-admin');
admin.initializeApp();
const functions = require('firebase-functions');
const stripe = require('stripe')(functions.config().stripe.secret);

// Example function using the Stripe secret
exports.createStripeCustomer = functions.https.onCall(async (data, context) => {
    const email = data.email;
    const name = data.name;

    const customer = await stripe.customers.create({
        email: email,
        name: name,
    });

    return { customerId: customer.id };
});

exports.createStripeSession = functions.https.onCall(async (data, context) => {
  // Check for authenticated user
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to initiate payment.');
  }

  // Get customer ID from Firestore based on the authenticated user's UID
  const db = admin.firestore();
  const userRef = db.collection('users').doc(context.auth.uid);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'User does not exist in the database.');
  }

  const customerId = userSnap.data().stripeCustomerId;


  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: 'price_1PmKP209evpoqo3sG2EPKm6h',  // Use the price ID for your product on Stripe
        quantity: 1
      }],
      mode: 'subscription',  // Change to 'payment' if this is a one-time payment
      success_url: 'http://localhost:3000/payment-success',  // Make sure to include http:// and the correct port number
      cancel_url: 'http://localhost:3000/payment-failure',
    });

    return { sessionId: session.url };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message, error);
  }
});

exports.getUserData = functions.https.onCall(async (data, context) => {
    // Check if the user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const userId = context.auth.uid; // Get the UID from the authenticated user

    try {
        const userRef = admin.firestore().collection('users').doc(userId);
        const doc = await userRef.get();

        if (!doc.exists) {
            throw new functions.https.HttpsError('not-found', 'User data not found.');
        }

        const userData = doc.data();

        // Return the necessary user data
        return {
            email: userData.email,
            name: userData.name,
            stripeCustomerId: userData.stripeCustomerId,
            subscriptionTier: userData.subscriptionTier,
            uploads: userData.uploads
        };
    } catch (error) {
        console.error('Error retrieving user data:', error);
        throw new functions.https.HttpsError('unknown', 'Failed to retrieve user data', error);
    }
});

exports.cancelStripeSubscription = functions.https.onCall(async (data, context) => {
    // Check for authenticated user
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to cancel subscriptions.');
    }

    // Retrieve the customer ID from Firestore
    const db = admin.firestore();
    const userRef = db.collection('users').doc(context.auth.uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'User does not exist in the database.');
    }

    const stripeCustomerId = userDoc.data().stripeCustomerId;
    const subscriptionId = userDoc.data().subscriptionId; // Assume you store subscription ID in Firestore

    try {
        const subscription = await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true
        });

        return { status: 'success', message: 'Subscription will be canceled at the end of the period.' };
    } catch (error) {
        console.error('Failed to cancel subscription:', error);
        throw new functions.https.HttpsError('internal', 'Failed to cancel subscription.', error.message);
    }
});


exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'];

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, "whsec_y6o7gAeUD719hjocZIEIlnspLseTh3mp");
    } catch (err) {
        console.error('Webhook signature verification failed.', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle different types of events
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        // Check if the session was for a subscription
        if (session.mode === 'subscription') {
            const subscriptionId = session.subscription;  // Extract the subscription ID from the session object
            const customerId = session.customer;
    
            // Update Firestore with the subscription ID
            const usersRef = admin.firestore().collection('users');
            const snapshot = await usersRef.where('stripeCustomerId', '==', customerId).get();
    
            if (!snapshot.empty) {
                snapshot.forEach(doc => {
                    usersRef.doc(doc.id).update({
                        subscriptionTier: 'Basic',  // Assuming subscription creates or updates to a 'Basic' tier
                        subscriptionId: subscriptionId  // Store the subscription ID
                    });
                });
            }
        }
    } else if (event.type === 'customer.subscription.updated') {
        const subscription = event.data.object;
        // Check if subscription is being canceled at period end
        if (subscription.cancel_at_period_end && subscription.status === 'active') {
            updateSubscriptionStatus(subscription.customer, 'Expiring');
        }
    } else if (event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object;
        updateSubscriptionStatus(subscription.customer, 'Free');
    }
    

    res.json({received: true});
});

async function updateSubscriptionStatus(customerId, tier) {
    const usersRef = admin.firestore().collection('users');
    const snapshot = await usersRef.where('stripeCustomerId', '==', customerId).get();
    if (snapshot.empty) {
        console.log('No matching user found.');
        return;
    }

    snapshot.forEach(doc => {
        usersRef.doc(doc.id).update({
            subscriptionTier: tier
        });
    });
}

exports.checkUploadPermission = functions.https.onCall(async (data, context) => {
    // Ensure the user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const userId = context.auth.uid;
    const userRef = admin.firestore().collection('users').doc(userId);
    const doc = await userRef.get();

    if (!doc.exists) {
        throw new functions.https.HttpsError('not-found', 'User does not exist.');
    }

    const userData = doc.data();
    if (userData.subscriptionTier === "Free" && userData.uploads > 0) {
        // Decrement the upload count
        await userRef.update({
            uploads: admin.firestore.FieldValue.increment(-1)
        });
        return { success: true, uploadsLeft: userData.uploads, free: true };
    } else if (userData.subscriptionTier === "Free" && userData.uploads <= 0) {
        // No uploads left
        return { success: false, message: "No uploads left, please subscribe." };
    } else {
        // Assume subscription tier gives unlimited uploads
        return { success: true, free: false };
    }
});

exports.addBankrollEntryAndUpdateScore = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication is required.');
    }

    const userId = context.auth.uid;
    const { sessionName, date, score } = data;

    if (!date || typeof score !== 'number') {
        throw new functions.https.HttpsError('invalid-argument', 'Score must be a number and date must be provided.');
    }

    const userDocRef = admin.firestore().collection('userData').doc(userId);
    const settingsRef = userDocRef.collection('settings').doc('bankrollCounter');
    const bankrollRef = userDocRef.collection('bankroll').doc('details');

    try {
        const transactionResult = await admin.firestore().runTransaction(async (transaction) => {
            const settingsDoc = await transaction.get(settingsRef);
            const bankrollDoc = await transaction.get(bankrollRef);
            const entriesRef = bankrollRef.collection('entries');

            // Calculate the new net score by summing all existing scores
            let netScore = score; // Start with the new score
            const entriesSnapshot = await entriesRef.get();
            entriesSnapshot.forEach(doc => {
                netScore += doc.data().score; // Sum up all scores
            });

            let counter = settingsDoc.exists ? settingsDoc.data().counter : 0;
            const newName = sessionName || `Pokernow Session #${counter + 1}`;

            // Update counter and bankroll entry atomically
            transaction.set(settingsRef, { counter: counter + 1 }, { merge: true });
            transaction.set(bankrollRef, { netScore }, { merge: true });

            // Create a new bankroll entry
            const entryRef = entriesRef.doc();
            transaction.set(entryRef, {
                name: newName,
                date,
                score
            });

            return { netScore, entryId: entryRef.id, newName };
        });

        return { 
            message: "Bankroll entry and score updated successfully.",
            netScore: transactionResult.netScore,
            entryId: transactionResult.entryId,
            sessionName: transactionResult.newName
        };
    } catch (error) {
        console.error('Failed to update bankroll:', error);
        throw new functions.https.HttpsError('internal', 'Failed to update bankroll.', error);
    }
});


exports.getBankrollData = functions.https.onCall(async (data, context) => {
    // Authentication check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    // Retrieve the user ID from the authentication context
    const userId = context.auth.uid;

    const userDocRef = admin.firestore().collection('userData').doc(userId);
    const bankrollRef = userDocRef.collection('bankroll').doc('details');

    try {
        const bankrollDoc = await bankrollRef.get();
        if (!bankrollDoc.exists) {
            // Instead of throwing an error, return a specific message or status
            return {
                status: 'not-initialized',
                message: 'No bankroll data found. Please set up your bankroll.'
            };
        }

        const entriesRef = bankrollRef.collection('entries');
        const entriesSnapshot = await entriesRef.get();
        const entries = entriesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return {
            status: 'Success',
            netScore: bankrollDoc.data().netScore,
            entries: entries
        };
    } catch (error) {
        console.error('Failed to retrieve bankroll data:', error);
        throw new functions.https.HttpsError('unknown', 'Failed to retrieve data', error);
    }
});

exports.deleteBankrollEntryAndUpdateScore = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const userId = context.auth.uid;
    const entryId = data.entryId; // ID of the entry to be deleted

    if (!entryId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing mandatory field: entryId.');
    }

    try {
        const result = await admin.firestore().runTransaction(async (transaction) => {
            const userDocRef = admin.firestore().collection('userData').doc(userId);
            const bankrollRef = userDocRef.collection('bankroll').doc('details');
            const entryRef = bankrollRef.collection('entries').doc(entryId);

            // Check if the entry exists
            const entryDoc = await transaction.get(entryRef);
            if (!entryDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Bankroll entry not found.');
            }

            // Delete the entry first

            // Recalculate the net score by summing the scores of all remaining entries
            const entriesSnapshot = await transaction.get(bankrollRef.collection('entries'));
            let newNetScore = 0; // Reset net score to recalculate
            entriesSnapshot.forEach(doc => {
                if (doc.id !== entryId) { // Make sure to exclude the entry being deleted
                    newNetScore += doc.data().score;
                }
            });

            transaction.delete(entryRef);

            // Update the net score
            transaction.update(bankrollRef, { netScore: newNetScore });

            return newNetScore; // Return the updated net score
        });

        return { netScore: result, message: "Bankroll entry deleted and net score updated successfully." };
    } catch (error) {
        console.error('Failed to update bankroll:', error);
        throw new functions.https.HttpsError('internal', 'Failed to update bankroll.', error);
    }
});

exports.storeHardcodedData = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    // Retrieve the user ID from the authentication context
    const userId = context.auth.uid;

    const userDocRef = admin.firestore().collection('userData').doc(userId);
    
    const resultData = {
            "Glance": {
                "hands_analyzed": 12,
                "hands_won": 2,
                "fish": "Aanisj",
                "shark": "SS",
                "nit": "Rishabh"
            },
            "Hands": [
                {
                    "pot": 7.0,
                    "winners": [
                        "Rahul"
                    ],
                    "players": [
                        "Jay",
                        "Rishabh",
                        "Kevin",
                        "Sam1/1😍",
                        "Rahul",
                        "SS",
                        "Aanisj",
                        "tin",
                        "Haris"
                    ],
                    "cards": [
                        "l6",
                        "N9",
                        "1.",
                        "00"
                    ],
                    "actions": [
                        "Player stacks: #1 \"Jay rec @ EziWC8etOr\" (295.00) | #3 \"Rishabh @ SBUHAZYysm\" (355.75) | #4 \"Kevin @ LZ6ptcp3lq\" (228.50) | #5 \"Sam1/1😍 @ 97AL3q3Fha\" (215.50) | #6 \"Rahul @ 2iGZrI6yLr\" (150.00) | #7 \"SS BT @ pOEhwgXc-4\" (312.25) | #8 \"Aanisj @ YdVwR8c1Rr\" (263.88) | #9 \"tin @ w_njIYqhS-\" (314.00) | #10 \"Haris dono @ el6tN9ueMf\" (647.75)",
                        "\"Jay rec @ EziWC8etOr\" posts a big blind of 2.00",
                        "\"Rishabh @ SBUHAZYysm\" folds",
                        "\"Kevin @ LZ6ptcp3lq\" calls 2.00",
                        "\"Sam1/1😍 @ 97AL3q3Fha\" folds",
                        "\"Rahul @ 2iGZrI6yLr\" calls 2.00",
                        "\"SS BT @ pOEhwgXc-4\" folds",
                        "\"Aanisj @ YdVwR8c1Rr\" folds",
                        "\"tin @ w_njIYqhS-\" folds",
                        "\"Haris dono @ el6tN9ueMf\" folds",
                        "\"Jay rec @ EziWC8etOr\" checks",
                        "Flop:  [6♦, 2♠, K♠]",
                        "\"Jay rec @ EziWC8etOr\" checks",
                        "\"Kevin @ LZ6ptcp3lq\" checks",
                        "\"Rahul @ 2iGZrI6yLr\" bets 3.50",
                        "\"Jay rec @ EziWC8etOr\" folds",
                        "\"Kevin @ LZ6ptcp3lq\" folds",
                        "Uncalled bet of 3.50 returned to \"Rahul @ 2iGZrI6yLr\"",
                        "\"Rahul @ 2iGZrI6yLr\" collected 7.00 from pot"
                    ],
                    "dealer": "tin",
                    "number": 1,
                    "nets": {
                        "Jay": -2,
                        "Rishabh": 0,
                        "Kevin": -2,
                        "Sam1/1😍": 0,
                        "Rahul": 2,
                        "SS": 0,
                        "Aanisj": 0,
                        "tin": 0,
                        "Haris": -1
                    }
                },
                {
                    "pot": 195.0,
                    "winners": [
                        "Haris"
                    ],
                    "players": [
                        "Jay",
                        "Rishabh",
                        "Kevin",
                        "Sam1/1😍",
                        "Rahul",
                        "SS",
                        "Aanisj",
                        "tin",
                        "Haris"
                    ],
                    "cards": [
                        "\"J",
                        "C8",
                        "1.",
                        "00"
                    ],
                    "actions": [
                        "Player stacks: #1 \"Jay rec @ EziWC8etOr\" (293.00) | #3 \"Rishabh @ SBUHAZYysm\" (355.75) | #4 \"Kevin @ LZ6ptcp3lq\" (226.50) | #5 \"Sam1/1😍 @ 97AL3q3Fha\" (215.50) | #6 \"Rahul @ 2iGZrI6yLr\" (155.00) | #7 \"SS BT @ pOEhwgXc-4\" (312.25) | #8 \"Aanisj @ YdVwR8c1Rr\" (263.88) | #9 \"tin @ w_njIYqhS-\" (314.00) | #10 \"Haris dono @ el6tN9ueMf\" (646.75)",
                        "\"Rishabh @ SBUHAZYysm\" posts a big blind of 2.00",
                        "\"Kevin @ LZ6ptcp3lq\" folds",
                        "\"Sam1/1😍 @ 97AL3q3Fha\" calls 2.00",
                        "\"Rahul @ 2iGZrI6yLr\" folds",
                        "\"SS BT @ pOEhwgXc-4\" raises to 9.00",
                        "\"Aanisj @ YdVwR8c1Rr\" calls 9.00",
                        "\"tin @ w_njIYqhS-\" folds",
                        "\"Haris dono @ el6tN9ueMf\" calls 9.00",
                        "\"Jay rec @ EziWC8etOr\" folds",
                        "\"Rishabh @ SBUHAZYysm\" folds",
                        "\"Sam1/1😍 @ 97AL3q3Fha\" calls 9.00",
                        "Flop:  [K♥, 2♠, 2♣]",
                        "\"Sam1/1😍 @ 97AL3q3Fha\" checks",
                        "\"SS BT @ pOEhwgXc-4\" checks",
                        "\"Aanisj @ YdVwR8c1Rr\" checks",
                        "\"Haris dono @ el6tN9ueMf\" checks",
                        "Turn: K♥, 2♠, 2♣ [4♥]",
                        "\"Sam1/1😍 @ 97AL3q3Fha\" checks",
                        "\"SS BT @ pOEhwgXc-4\" bets 29.25",
                        "\"Aanisj @ YdVwR8c1Rr\" folds",
                        "\"Haris dono @ el6tN9ueMf\" calls 29.25",
                        "\"Sam1/1😍 @ 97AL3q3Fha\" folds",
                        "River: K♥, 2♠, 2♣, 4♥ [3♣]",
                        "\"SS BT @ pOEhwgXc-4\" checks",
                        "\"Haris dono @ el6tN9ueMf\" bets 48.75",
                        "\"SS BT @ pOEhwgXc-4\" calls 48.75",
                        "\"Haris dono @ el6tN9ueMf\" shows a K♠, 7♥.",
                        "\"Haris dono @ el6tN9ueMf\" collected 195.00 from pot with Two Pair, K's & 2's (combination: K♠, K♥, 2♠, 2♣, 7♥)"
                    ],
                    "dealer": "Haris",
                    "number": 2,
                    "nets": {
                        "Jay": -1,
                        "Rishabh": -2,
                        "Kevin": 0,
                        "Sam1/1😍": -11,
                        "Rahul": 0,
                        "SS": -86,
                        "Aanisj": -9,
                        "tin": 0,
                        "Haris": 109
                    }
                },
                {
                    "pot": 23.0,
                    "winners": [
                        "Haris"
                    ],
                    "players": [
                        "Jay",
                        "Rishabh",
                        "Kevin",
                        "Sam1/1😍",
                        "Rahul",
                        "SS",
                        "Aanisj",
                        "tin",
                        "Haris"
                    ],
                    "cards": [
                        "HA",
                        "1.",
                        "00"
                    ],
                    "actions": [
                        "Player stacks: #1 \"Jay rec @ EziWC8etOr\" (292.00) | #3 \"Rishabh @ SBUHAZYysm\" (353.75) | #4 \"Kevin @ LZ6ptcp3lq\" (226.50) | #5 \"Sam1/1😍 @ 97AL3q3Fha\" (206.50) | #6 \"Rahul @ 2iGZrI6yLr\" (155.00) | #7 \"SS BT @ pOEhwgXc-4\" (225.25) | #8 \"Aanisj @ YdVwR8c1Rr\" (254.88) | #9 \"tin @ w_njIYqhS-\" (314.00) | #10 \"Haris dono @ el6tN9ueMf\" (754.75)",
                        "\"Kevin @ LZ6ptcp3lq\" posts a big blind of 2.00",
                        "\"Sam1/1😍 @ 97AL3q3Fha\" folds",
                        "\"Rahul @ 2iGZrI6yLr\" folds",
                        "\"SS BT @ pOEhwgXc-4\" calls 2.00",
                        "\"Aanisj @ YdVwR8c1Rr\" raises to 9.00",
                        "\"tin @ w_njIYqhS-\" folds",
                        "\"Haris dono @ el6tN9ueMf\" raises to 69.00",
                        "\"Jay rec @ EziWC8etOr\" folds",
                        "\"Rishabh @ SBUHAZYysm\" folds",
                        "\"Kevin @ LZ6ptcp3lq\" folds",
                        "\"SS BT @ pOEhwgXc-4\" folds",
                        "\"Aanisj @ YdVwR8c1Rr\" folds",
                        "Uncalled bet of 60.00 returned to \"Haris dono @ el6tN9ueMf\"",
                        "\"Haris dono @ el6tN9ueMf\" collected 23.00 from pot"
                    ],
                    "dealer": "Jay",
                    "number": 3,
                    "nets": {
                        "Jay": 0,
                        "Rishabh": -1,
                        "Kevin": -2,
                        "Sam1/1😍": 0,
                        "Rahul": 0,
                        "SS": -2,
                        "Aanisj": -9,
                        "tin": 0,
                        "Haris": -46
                    }
                },
                {
                    "pot": 114.0,
                    "winners": [
                        "SS"
                    ],
                    "players": [
                        "Jay",
                        "Rishabh",
                        "Kevin",
                        "Sam1/1😍",
                        "Rahul",
                        "SS",
                        "Aanisj",
                        "tin",
                        "Haris"
                    ],
                    "cards": [
                        "\"K",
                        "Z6",
                        "p3",
                        "1.",
                        "00"
                    ],
                    "actions": [
                        "Player stacks: #1 \"Jay rec @ EziWC8etOr\" (292.00) | #3 \"Rishabh @ SBUHAZYysm\" (352.75) | #4 \"Kevin @ LZ6ptcp3lq\" (224.50) | #5 \"Sam1/1😍 @ 97AL3q3Fha\" (206.50) | #6 \"Rahul @ 2iGZrI6yLr\" (155.00) | #7 \"SS BT @ pOEhwgXc-4\" (223.25) | #8 \"Aanisj @ YdVwR8c1Rr\" (245.88) | #9 \"tin @ w_njIYqhS-\" (314.00) | #10 \"Haris dono @ el6tN9ueMf\" (768.75)",
                        "\"Sam1/1😍 @ 97AL3q3Fha\" posts a big blind of 2.00",
                        "\"Rahul @ 2iGZrI6yLr\" calls 2.00",
                        "\"SS BT @ pOEhwgXc-4\" raises to 9.00",
                        "\"Aanisj @ YdVwR8c1Rr\" calls 9.00",
                        "\"tin @ w_njIYqhS-\" folds",
                        "\"Haris dono @ el6tN9ueMf\" folds",
                        "\"Jay rec @ EziWC8etOr\" folds",
                        "\"Rishabh @ SBUHAZYysm\" folds",
                        "\"Kevin @ LZ6ptcp3lq\" calls 9.00",
                        "\"Sam1/1😍 @ 97AL3q3Fha\" folds",
                        "\"Rahul @ 2iGZrI6yLr\" calls 9.00",
                        "Flop:  [3♣, 2♦, 10♦]",
                        "\"Kevin @ LZ6ptcp3lq\" checks",
                        "\"Rahul @ 2iGZrI6yLr\" checks",
                        "\"SS BT @ pOEhwgXc-4\" bets 38.00",
                        "\"Aanisj @ YdVwR8c1Rr\" calls 38.00",
                        "\"Kevin @ LZ6ptcp3lq\" folds",
                        "\"Rahul @ 2iGZrI6yLr\" folds",
                        "Turn: 3♣, 2♦, 10♦ [A♣]",
                        "\"SS BT @ pOEhwgXc-4\" bets 85.50",
                        "\"Aanisj @ YdVwR8c1Rr\" folds",
                        "Uncalled bet of 85.50 returned to \"SS BT @ pOEhwgXc-4\"",
                        "\"SS BT @ pOEhwgXc-4\" collected 114.00 from pot"
                    ],
                    "dealer": "Rishabh",
                    "number": 4,
                    "nets": {
                        "Jay": 0,
                        "Rishabh": 0,
                        "Kevin": -10,
                        "Sam1/1😍": -2,
                        "Rahul": -11,
                        "SS": -18,
                        "Aanisj": -47,
                        "tin": 0,
                        "Haris": 0
                    }
                },
                {
                    "pot": 100.0,
                    "winners": [
                        "Sam1/1😍"
                    ],
                    "players": [
                        "Jay",
                        "Rishabh",
                        "Kevin",
                        "Sam1/1😍",
                        "Rahul",
                        "SS",
                        "Aanisj",
                        "tin",
                        "Haris"
                    ],
                    "cards": [
                        "m1",
                        "/1",
                        "97",
                        "AL",
                        "3q",
                        "3F",
                        "1.",
                        "00"
                    ],
                    "actions": [
                        "Player stacks: #1 \"Jay rec @ EziWC8etOr\" (292.00) | #3 \"Rishabh @ SBUHAZYysm\" (352.75) | #4 \"Kevin @ LZ6ptcp3lq\" (215.50) | #5 \"Sam1/1😍 @ 97AL3q3Fha\" (204.50) | #6 \"Rahul @ 2iGZrI6yLr\" (146.00) | #7 \"SS BT @ pOEhwgXc-4\" (290.25) | #8 \"Aanisj @ YdVwR8c1Rr\" (198.88) | #9 \"tin @ w_njIYqhS-\" (314.00) | #10 \"Haris dono @ el6tN9ueMf\" (768.75)",
                        "\"Rahul @ 2iGZrI6yLr\" posts a big blind of 2.00",
                        "\"SS BT @ pOEhwgXc-4\" posts a straddle of 4.00",
                        "\"Aanisj @ YdVwR8c1Rr\" calls 4.00",
                        "\"tin @ w_njIYqhS-\" folds",
                        "\"Haris dono @ el6tN9ueMf\" folds",
                        "\"Jay rec @ EziWC8etOr\" folds",
                        "\"Rishabh @ SBUHAZYysm\" folds",
                        "\"Kevin @ LZ6ptcp3lq\" calls 4.00",
                        "\"Sam1/1😍 @ 97AL3q3Fha\" calls 4.00",
                        "\"Rahul @ 2iGZrI6yLr\" calls 4.00",
                        "\"SS BT @ pOEhwgXc-4\" checks",
                        "Flop:  [Q♦, Q♣, 9♦]",
                        "\"Sam1/1😍 @ 97AL3q3Fha\" checks",
                        "\"Rahul @ 2iGZrI6yLr\" checks",
                        "\"SS BT @ pOEhwgXc-4\" checks",
                        "\"Aanisj @ YdVwR8c1Rr\" checks",
                        "\"Kevin @ LZ6ptcp3lq\" checks",
                        "Turn: Q♦, Q♣, 9♦ [3♦]",
                        "\"Sam1/1😍 @ 97AL3q3Fha\" checks",
                        "\"Rahul @ 2iGZrI6yLr\" bets 10.00",
                        "\"SS BT @ pOEhwgXc-4\" folds",
                        "\"Aanisj @ YdVwR8c1Rr\" folds",
                        "\"Kevin @ LZ6ptcp3lq\" folds",
                        "\"Sam1/1😍 @ 97AL3q3Fha\" calls 10.00",
                        "River: Q♦, Q♣, 9♦, 3♦ [J♦]",
                        "\"Sam1/1😍 @ 97AL3q3Fha\" bets 30.00",
                        "\"Rahul @ 2iGZrI6yLr\" calls 30.00",
                        "The player \"krish a 15 @ 1UJroZyL43\" sit back with the stack of 167.37.",
                        "\"Rahul @ 2iGZrI6yLr\" shows a A♦, 8♣.",
                        "\"Rahul @ 2iGZrI6yLr\" collected 100.00 from pot with Flush, Ad High (combination: A♦, Q♦, J♦, 9♦, 3♦)",
                        "\"Sam1/1😍 @ 97AL3q3Fha\" shows a K♦, 5♦."
                    ],
                    "dealer": "Kevin",
                    "number": 5,
                    "nets": {
                        "Jay": 0,
                        "Rishabh": 0,
                        "Kevin": -4,
                        "Sam1/1😍": -45,
                        "Rahul": 54,
                        "SS": -4,
                        "Aanisj": -4,
                        "tin": 0,
                        "Haris": 0
                    }
                },
                {
                    "pot": 6.0,
                    "winners": [
                        "krish"
                    ],
                    "players": [
                        "Jay",
                        "krish",
                        "Rishabh",
                        "Kevin",
                        "Sam1/1😍",
                        "Rahul",
                        "SS",
                        "Aanisj",
                        "tin",
                        "Haris"
                    ],
                    "cards": [
                        "2i",
                        "I6",
                        "1.",
                        "00"
                    ],
                    "actions": [
                        "Player stacks: #1 \"Jay rec @ EziWC8etOr\" (292.00) | #2 \"krish a 15 @ 1UJroZyL43\" (167.37) | #3 \"Rishabh @ SBUHAZYysm\" (352.75) | #4 \"Kevin @ LZ6ptcp3lq\" (211.50) | #5 \"Sam1/1😍 @ 97AL3q3Fha\" (160.50) | #6 \"Rahul @ 2iGZrI6yLr\" (202.00) | #7 \"SS BT @ pOEhwgXc-4\" (286.25) | #8 \"Aanisj @ YdVwR8c1Rr\" (194.88) | #9 \"tin @ w_njIYqhS-\" (314.00) | #10 \"Haris dono @ el6tN9ueMf\" (768.75)",
                        "\"SS BT @ pOEhwgXc-4\" posts a big blind of 2.00",
                        "\"krish a 15 @ 1UJroZyL43\" posts a missing small blind of 1.00",
                        "\"krish a 15 @ 1UJroZyL43\" posts a missed big blind of 2.00",
                        "\"Aanisj @ YdVwR8c1Rr\" folds",
                        "\"tin @ w_njIYqhS-\" folds",
                        "\"Haris dono @ el6tN9ueMf\" folds",
                        "\"Jay rec @ EziWC8etOr\" folds",
                        "\"krish a 15 @ 1UJroZyL43\" checks",
                        "\"Rishabh @ SBUHAZYysm\" folds",
                        "\"Kevin @ LZ6ptcp3lq\" folds",
                        "\"Sam1/1😍 @ 97AL3q3Fha\" folds",
                        "\"Rahul @ 2iGZrI6yLr\" folds",
                        "\"SS BT @ pOEhwgXc-4\" checks",
                        "Flop:  [8♣, Q♠, Q♥]",
                        "\"SS BT @ pOEhwgXc-4\" checks",
                        "\"krish a 15 @ 1UJroZyL43\" checks",
                        "Turn: 8♣, Q♠, Q♥ [10♥]",
                        "\"SS BT @ pOEhwgXc-4\" checks",
                        "\"krish a 15 @ 1UJroZyL43\" checks",
                        "River: 8♣, Q♠, Q♥, 10♥ [A♥]",
                        "\"SS BT @ pOEhwgXc-4\" checks",
                        "\"krish a 15 @ 1UJroZyL43\" bets 4.50",
                        "\"SS BT @ pOEhwgXc-4\" folds",
                        "Uncalled bet of 4.50 returned to \"krish a 15 @ 1UJroZyL43\"",
                        "\"krish a 15 @ 1UJroZyL43\" collected 6.00 from pot"
                    ],
                    "dealer": "Sam1/1😍",
                    "number": 6,
                    "nets": {
                        "Jay": 0,
                        "krish": -1,
                        "Rishabh": 0,
                        "Kevin": 0,
                        "Sam1/1😍": 0,
                        "Rahul": -1,
                        "SS": -2,
                        "Aanisj": 0,
                        "tin": 0,
                        "Haris": 0
                    }
                },
                {
                    "pot": 156.0,
                    "winners": [
                        "Jay"
                    ],
                    "players": [
                        "Jay",
                        "krish",
                        "Rishabh",
                        "Kevin",
                        "Sam1/1😍",
                        "Rahul",
                        "SS",
                        "Aanisj",
                        "tin",
                        "Haris"
                    ],
                    "cards": [
                        "-4",
                        "1.",
                        "00"
                    ],
                    "actions": [
                        "Player stacks: #1 \"Jay rec @ EziWC8etOr\" (292.00) | #2 \"krish a 15 @ 1UJroZyL43\" (170.37) | #3 \"Rishabh @ SBUHAZYysm\" (352.75) | #4 \"Kevin @ LZ6ptcp3lq\" (211.50) | #5 \"Sam1/1😍 @ 97AL3q3Fha\" (160.50) | #6 \"Rahul @ 2iGZrI6yLr\" (201.00) | #7 \"SS BT @ pOEhwgXc-4\" (284.25) | #8 \"Aanisj @ YdVwR8c1Rr\" (194.88) | #9 \"tin @ w_njIYqhS-\" (314.00) | #10 \"Haris dono @ el6tN9ueMf\" (768.75)",
                        "\"Aanisj @ YdVwR8c1Rr\" posts a big blind of 2.00",
                        "\"tin @ w_njIYqhS-\" raises to 7.00",
                        "\"Haris dono @ el6tN9ueMf\" folds",
                        "\"Jay rec @ EziWC8etOr\" calls 7.00",
                        "\"krish a 15 @ 1UJroZyL43\" calls 7.00",
                        "\"Rishabh @ SBUHAZYysm\" folds",
                        "\"Kevin @ LZ6ptcp3lq\" folds",
                        "\"Sam1/1😍 @ 97AL3q3Fha\" folds",
                        "\"Rahul @ 2iGZrI6yLr\" folds",
                        "\"SS BT @ pOEhwgXc-4\" folds",
                        "\"Aanisj @ YdVwR8c1Rr\" folds",
                        "Flop:  [2♦, 9♥, 5♥]",
                        "\"tin @ w_njIYqhS-\" bets 18.00",
                        "\"Jay rec @ EziWC8etOr\" calls 18.00",
                        "\"krish a 15 @ 1UJroZyL43\" calls 18.00",
                        "Turn: 2♦, 9♥, 5♥ [9♦]",
                        "\"tin @ w_njIYqhS-\" bets 39.00",
                        "\"Jay rec @ EziWC8etOr\" calls 39.00",
                        "\"krish a 15 @ 1UJroZyL43\" folds",
                        "River: 2♦, 9♥, 5♥, 9♦ [2♠]",
                        "\"tin @ w_njIYqhS-\" checks",
                        "\"Jay rec @ EziWC8etOr\" bets 117.00",
                        "\"tin @ w_njIYqhS-\" folds",
                        "Uncalled bet of 117.00 returned to \"Jay rec @ EziWC8etOr\"",
                        "\"Jay rec @ EziWC8etOr\" collected 156.00 from pot"
                    ],
                    "dealer": "Rahul",
                    "number": 7,
                    "nets": {
                        "Jay": -25,
                        "krish": -25,
                        "Rishabh": 0,
                        "Kevin": 0,
                        "Sam1/1😍": 0,
                        "Rahul": 0,
                        "SS": -1,
                        "Aanisj": -2,
                        "tin": -64,
                        "Haris": 0
                    }
                },
                {
                    "pot": 225.0,
                    "winners": [
                        "SS"
                    ],
                    "players": [
                        "Jay",
                        "krish",
                        "Rishabh",
                        "Kevin",
                        "Sam1/1😍",
                        "Rahul",
                        "SS",
                        "Aanisj",
                        "tin",
                        "Haris"
                    ],
                    "cards": [
                        "\"A",
                        "R8",
                        "c1",
                        "1.",
                        "00"
                    ],
                    "actions": [
                        "Player stacks: #1 \"Jay rec @ EziWC8etOr\" (384.00) | #2 \"krish a 15 @ 1UJroZyL43\" (145.37) | #3 \"Rishabh @ SBUHAZYysm\" (352.75) | #4 \"Kevin @ LZ6ptcp3lq\" (211.50) | #5 \"Sam1/1😍 @ 97AL3q3Fha\" (160.50) | #6 \"Rahul @ 2iGZrI6yLr\" (201.00) | #7 \"SS BT @ pOEhwgXc-4\" (283.25) | #8 \"Aanisj @ YdVwR8c1Rr\" (192.88) | #9 \"tin @ w_njIYqhS-\" (250.00) | #10 \"Haris dono @ el6tN9ueMf\" (768.75)",
                        "\"tin @ w_njIYqhS-\" posts a big blind of 2.00",
                        "\"Haris dono @ el6tN9ueMf\" posts a straddle of 4.00",
                        "\"Jay rec @ EziWC8etOr\" folds",
                        "\"krish a 15 @ 1UJroZyL43\" folds",
                        "\"Rishabh @ SBUHAZYysm\" folds",
                        "\"Kevin @ LZ6ptcp3lq\" folds",
                        "\"Sam1/1😍 @ 97AL3q3Fha\" folds",
                        "\"Rahul @ 2iGZrI6yLr\" calls 4.00",
                        "\"SS BT @ pOEhwgXc-4\" raises to 19.00",
                        "\"Aanisj @ YdVwR8c1Rr\" folds",
                        "\"tin @ w_njIYqhS-\" folds",
                        "\"Haris dono @ el6tN9ueMf\" folds",
                        "\"Rahul @ 2iGZrI6yLr\" calls 19.00",
                        "Flop:  [3♥, 3♠, 5♥]",
                        "\"Rahul @ 2iGZrI6yLr\" checks",
                        "\"SS BT @ pOEhwgXc-4\" bets 33.75",
                        "\"Rahul @ 2iGZrI6yLr\" calls 33.75",
                        "Turn: 3♥, 3♠, 5♥ [6♣]",
                        "\"Rahul @ 2iGZrI6yLr\" checks",
                        "\"SS BT @ pOEhwgXc-4\" checks",
                        "River: 3♥, 3♠, 5♥, 6♣ [A♦]",
                        "\"Rahul @ 2iGZrI6yLr\" checks",
                        "\"SS BT @ pOEhwgXc-4\" bets 56.25",
                        "\"Rahul @ 2iGZrI6yLr\" calls 56.25",
                        "\"SS BT @ pOEhwgXc-4\" shows a 10♣, A♠.",
                        "\"SS BT @ pOEhwgXc-4\" collected 225.00 from pot with Two Pair, A's & 3's (combination: A♠, A♦, 3♥, 3♠, 10♣)"
                    ],
                    "dealer": "SS",
                    "number": 8,
                    "nets": {
                        "Jay": 0,
                        "krish": 0,
                        "Rishabh": 0,
                        "Kevin": 0,
                        "Sam1/1😍": 0,
                        "Rahul": -112,
                        "SS": 117,
                        "Aanisj": -1,
                        "tin": -2,
                        "Haris": -4
                    }
                },
                {
                    "pot": 10.0,
                    "winners": [
                        "Kevin"
                    ],
                    "players": [
                        "Jay",
                        "krish",
                        "Rishabh",
                        "Kevin",
                        "Sam1/1😍",
                        "Rahul",
                        "SS",
                        "Aanisj",
                        "tin",
                        "Haris"
                    ],
                    "cards": [
                        "1.",
                        "00"
                    ],
                    "actions": [
                        "Player stacks: #1 \"Jay rec @ EziWC8etOr\" (384.00) | #2 \"krish a 15 @ 1UJroZyL43\" (145.37) | #3 \"Rishabh @ SBUHAZYysm\" (352.75) | #4 \"Kevin @ LZ6ptcp3lq\" (211.50) | #5 \"Sam1/1😍 @ 97AL3q3Fha\" (160.50) | #6 \"Rahul @ 2iGZrI6yLr\" (92.00) | #7 \"SS BT @ pOEhwgXc-4\" (399.25) | #8 \"Aanisj @ YdVwR8c1Rr\" (191.88) | #9 \"tin @ w_njIYqhS-\" (248.00) | #10 \"Haris dono @ el6tN9ueMf\" (764.75)",
                        "\"Haris dono @ el6tN9ueMf\" posts a big blind of 2.00",
                        "\"Jay rec @ EziWC8etOr\" folds",
                        "\"krish a 15 @ 1UJroZyL43\" folds",
                        "\"Rishabh @ SBUHAZYysm\" folds",
                        "\"Kevin @ LZ6ptcp3lq\" calls 2.00",
                        "\"Sam1/1😍 @ 97AL3q3Fha\" calls 2.00",
                        "\"Rahul @ 2iGZrI6yLr\" folds",
                        "\"SS BT @ pOEhwgXc-4\" calls 2.00",
                        "\"Aanisj @ YdVwR8c1Rr\" folds",
                        "\"tin @ w_njIYqhS-\" calls 2.00",
                        "\"Haris dono @ el6tN9ueMf\" checks",
                        "Flop:  [K♠, Q♦, J♠]",
                        "\"tin @ w_njIYqhS-\" checks",
                        "\"Haris dono @ el6tN9ueMf\" checks",
                        "\"Kevin @ LZ6ptcp3lq\" bets 5.00",
                        "\"Sam1/1😍 @ 97AL3q3Fha\" folds",
                        "\"SS BT @ pOEhwgXc-4\" folds",
                        "\"tin @ w_njIYqhS-\" folds",
                        "\"Haris dono @ el6tN9ueMf\" folds",
                        "Uncalled bet of 5.00 returned to \"Kevin @ LZ6ptcp3lq\"",
                        "\"Kevin @ LZ6ptcp3lq\" collected 10.00 from pot"
                    ],
                    "dealer": "Aanisj",
                    "number": 9,
                    "nets": {
                        "Jay": 0,
                        "krish": 0,
                        "Rishabh": 0,
                        "Kevin": 3,
                        "Sam1/1😍": -2,
                        "Rahul": 0,
                        "SS": -2,
                        "Aanisj": 0,
                        "tin": -3,
                        "Haris": -2
                    }
                },
                {
                    "pot": 228.0,
                    "winners": [
                        "Rahul",
                        "Rahul"
                    ],
                    "players": [
                        "Jay",
                        "krish",
                        "Kevin",
                        "Sam1/1😍",
                        "Rahul",
                        "SS",
                        "Aanisj",
                        "tin",
                        "Haris"
                    ],
                    "cards": [
                        "l6",
                        "N9",
                        "1.",
                        "00"
                    ],
                    "actions": [
                        "Player stacks: #1 \"Jay rec @ EziWC8etOr\" (384.00) | #2 \"krish a 15 @ 1UJroZyL43\" (145.37) | #4 \"Kevin @ LZ6ptcp3lq\" (219.50) | #5 \"Sam1/1😍 @ 97AL3q3Fha\" (158.50) | #6 \"Rahul @ 2iGZrI6yLr\" (92.00) | #7 \"SS BT @ pOEhwgXc-4\" (397.25) | #8 \"Aanisj @ YdVwR8c1Rr\" (191.88) | #9 \"tin @ w_njIYqhS-\" (246.00) | #10 \"Haris dono @ el6tN9ueMf\" (762.75)",
                        "\"Jay rec @ EziWC8etOr\" posts a big blind of 2.00",
                        "\"krish a 15 @ 1UJroZyL43\" calls 2.00",
                        "\"Kevin @ LZ6ptcp3lq\" folds",
                        "\"Sam1/1😍 @ 97AL3q3Fha\" folds",
                        "\"Rahul @ 2iGZrI6yLr\" calls 2.00",
                        "\"SS BT @ pOEhwgXc-4\" calls 2.00",
                        "\"Aanisj @ YdVwR8c1Rr\" calls 2.00",
                        "\"tin @ w_njIYqhS-\" folds",
                        "\"Haris dono @ el6tN9ueMf\" calls 2.00",
                        "\"Jay rec @ EziWC8etOr\" checks",
                        "Flop:  [5♠, 9♦, 7♠]",
                        "\"Haris dono @ el6tN9ueMf\" checks",
                        "\"Jay rec @ EziWC8etOr\" checks",
                        "\"krish a 15 @ 1UJroZyL43\" checks",
                        "\"Rahul @ 2iGZrI6yLr\" checks",
                        "\"SS BT @ pOEhwgXc-4\" checks",
                        "\"Aanisj @ YdVwR8c1Rr\" bets 12.00",
                        "\"Haris dono @ el6tN9ueMf\" calls 12.00",
                        "\"Jay rec @ EziWC8etOr\" folds",
                        "\"krish a 15 @ 1UJroZyL43\" folds",
                        "\"Rahul @ 2iGZrI6yLr\" calls 12.00",
                        "\"SS BT @ pOEhwgXc-4\" folds",
                        "Turn: 5♠, 9♦, 7♠ [4♣]",
                        "\"Haris dono @ el6tN9ueMf\" checks",
                        "\"Rahul @ 2iGZrI6yLr\" checks",
                        "\"Aanisj @ YdVwR8c1Rr\" bets 24.00",
                        "\"Haris dono @ el6tN9ueMf\" calls 24.00",
                        "\"Rahul @ 2iGZrI6yLr\" raises to 78.00 and go all in",
                        "\"Aanisj @ YdVwR8c1Rr\" calls 78.00",
                        "\"Haris dono @ el6tN9ueMf\" folds",
                        "Remaining players decide whether to run it twice.",
                        "\"Aanisj @ YdVwR8c1Rr\" chooses to  run it twice.",
                        "\"Rahul @ 2iGZrI6yLr\" chooses to  run it twice.",
                        "All players in hand choose to run it twice.",
                        "\"Rahul @ 2iGZrI6yLr\" shows a 10♠, 4♠.",
                        "\"Aanisj @ YdVwR8c1Rr\" shows a 9♥, K♠.",
                        "River: 5♠, 9♦, 7♠, 4♣ [10♥]",
                        "River (second run): 5♠, 9♦, 7♠, 4♣ [Q♠]",
                        "\"Rahul @ 2iGZrI6yLr\" collected 114.00 from pot with Two Pair, 10's & 4's (combination: 10♠, 10♥, 4♠, 4♣, 9♦)",
                        "\"Rahul @ 2iGZrI6yLr\" collected 114.00 from pot with Flush, Qs High on the second run  (combination: Q♠, 10♠, 7♠, 5♠, 4♠)"
                    ],
                    "dealer": "tin",
                    "number": 10,
                    "nets": {
                        "Jay": -2,
                        "krish": -2,
                        "Kevin": 0,
                        "Sam1/1😍": 0,
                        "Rahul": -320,
                        "SS": -2,
                        "Aanisj": -116,
                        "tin": 0,
                        "Haris": -39
                    }
                },
                {
                    "pot": 55.0,
                    "winners": [
                        "SS"
                    ],
                    "players": [
                        "Jay",
                        "krish",
                        "Kevin",
                        "Sam1/1😍",
                        "Rahul",
                        "SS",
                        "Aanisj",
                        "tin",
                        "Haris"
                    ],
                    "cards": [
                        "\"J",
                        "C8",
                        "1.",
                        "00"
                    ],
                    "actions": [
                        "Player stacks: #1 \"Jay rec @ EziWC8etOr\" (382.00) | #2 \"krish a 15 @ 1UJroZyL43\" (143.37) | #4 \"Kevin @ LZ6ptcp3lq\" (219.50) | #5 \"Sam1/1😍 @ 97AL3q3Fha\" (158.50) | #6 \"Rahul @ 2iGZrI6yLr\" (228.00) | #7 \"SS BT @ pOEhwgXc-4\" (395.25) | #8 \"Aanisj @ YdVwR8c1Rr\" (99.88) | #9 \"tin @ w_njIYqhS-\" (246.00) | #10 \"Haris dono @ el6tN9ueMf\" (724.75)",
                        "\"krish a 15 @ 1UJroZyL43\" posts a big blind of 2.00",
                        "\"Kevin @ LZ6ptcp3lq\" calls 2.00",
                        "\"Sam1/1😍 @ 97AL3q3Fha\" folds",
                        "\"Rahul @ 2iGZrI6yLr\" folds",
                        "\"SS BT @ pOEhwgXc-4\" calls 2.00",
                        "\"Aanisj @ YdVwR8c1Rr\" calls 2.00",
                        "\"tin @ w_njIYqhS-\" folds",
                        "\"Haris dono @ el6tN9ueMf\" raises to 13.00",
                        "\"Jay rec @ EziWC8etOr\" folds",
                        "\"krish a 15 @ 1UJroZyL43\" folds",
                        "\"Kevin @ LZ6ptcp3lq\" calls 13.00",
                        "\"SS BT @ pOEhwgXc-4\" calls 13.00",
                        "\"Aanisj @ YdVwR8c1Rr\" calls 13.00",
                        "Flop:  [5♦, 3♣, 7♣]",
                        "\"Kevin @ LZ6ptcp3lq\" checks",
                        "\"SS BT @ pOEhwgXc-4\" bets 55.00",
                        "\"Aanisj @ YdVwR8c1Rr\" folds",
                        "\"Haris dono @ el6tN9ueMf\" folds",
                        "\"Kevin @ LZ6ptcp3lq\" folds",
                        "Uncalled bet of 55.00 returned to \"SS BT @ pOEhwgXc-4\"",
                        "\"SS BT @ pOEhwgXc-4\" collected 55.00 from pot"
                    ],
                    "dealer": "Haris",
                    "number": 11,
                    "nets": {
                        "Jay": -1,
                        "krish": -2,
                        "Kevin": -15,
                        "Sam1/1😍": 0,
                        "Rahul": 0,
                        "SS": 95,
                        "Aanisj": -15,
                        "tin": 0,
                        "Haris": -13
                    }
                },
                {
                    "pot": 184.76,
                    "winners": [
                        "Aanisj",
                        "Aanisj"
                    ],
                    "players": [
                        "Jay",
                        "krish",
                        "Kevin",
                        "Sam1/1😍",
                        "Rahul",
                        "SS",
                        "Aanisj",
                        "tin",
                        "Haris"
                    ],
                    "cards": [
                        "15",
                        "1U",
                        "Jr",
                        "L4",
                        "3\"",
                        "1.",
                        "00"
                    ],
                    "actions": [
                        "Player stacks: #1 \"Jay rec @ EziWC8etOr\" (381.00) | #2 \"krish a 15 @ 1UJroZyL43\" (141.37) | #4 \"Kevin @ LZ6ptcp3lq\" (206.50) | #5 \"Sam1/1😍 @ 97AL3q3Fha\" (158.50) | #6 \"Rahul @ 2iGZrI6yLr\" (228.00) | #7 \"SS BT @ pOEhwgXc-4\" (437.25) | #8 \"Aanisj @ YdVwR8c1Rr\" (86.88) | #9 \"tin @ w_njIYqhS-\" (246.00) | #10 \"Haris dono @ el6tN9ueMf\" (711.75)",
                        "\"Kevin @ LZ6ptcp3lq\" posts a big blind of 2.00",
                        "\"Sam1/1😍 @ 97AL3q3Fha\" folds",
                        "\"Rahul @ 2iGZrI6yLr\" folds",
                        "\"SS BT @ pOEhwgXc-4\" folds",
                        "\"Aanisj @ YdVwR8c1Rr\" calls 2.00",
                        "\"tin @ w_njIYqhS-\" raises to 9.00",
                        "\"Haris dono @ el6tN9ueMf\" folds",
                        "\"Jay rec @ EziWC8etOr\" folds",
                        "\"krish a 15 @ 1UJroZyL43\" raises to 31.00",
                        "\"Kevin @ LZ6ptcp3lq\" folds",
                        "\"Aanisj @ YdVwR8c1Rr\" calls 31.00",
                        "\"tin @ w_njIYqhS-\" folds",
                        "Flop:  [10♣, 9♠, Q♠]",
                        "\"krish a 15 @ 1UJroZyL43\" checks",
                        "\"Aanisj @ YdVwR8c1Rr\" bets 55.88 and go all in",
                        "\"krish a 15 @ 1UJroZyL43\" calls 55.88",
                        "Remaining players decide whether to run it twice.",
                        "\"krish a 15 @ 1UJroZyL43\" chooses to  run it twice.",
                        "\"Aanisj @ YdVwR8c1Rr\" chooses to  run it twice.",
                        "All players in hand choose to run it twice.",
                        "\"krish a 15 @ 1UJroZyL43\" shows a A♠, J♥.",
                        "\"Aanisj @ YdVwR8c1Rr\" shows a 10♠, Q♣.",
                        "Turn: 10♣, 9♠, Q♠ [9♥]",
                        "River: 10♣, 9♠, Q♠, 9♥ [6♣]",
                        "Turn (second run): 10♣, 9♠, Q♠ [K♦]",
                        "River (second run): 10♣, 9♠, Q♠, K♦ [Q♦]",
                        "\"Aanisj @ YdVwR8c1Rr\" collected 92.38 from pot with Two Pair, Q's & 10's (combination: Q♣, Q♠, 10♠, 10♣, 9♠)",
                        "\"Aanisj @ YdVwR8c1Rr\" collected 92.38 from pot with Full House, Q's over 10's on the second run  (combination: Q♣, Q♠, Q♦, 10♠, 10♣)"
                    ],
                    "dealer": "Jay",
                    "number": 12,
                    "nets": {
                        "Jay": 0,
                        "krish": -87,
                        "Kevin": -2,
                        "Sam1/1😍": 0,
                        "Rahul": 0,
                        "SS": 0,
                        "Aanisj": -272,
                        "tin": -9,
                        "Haris": 0
                    }
                }
            ],
            "Player": {
                "Jay": {
                    "netscore": 0,
                    "hands_played": 12,
                    "amount_won": 0,
                    "amount_lost": 31,
                    "flops": 3,
                    "turns": 1,
                    "rivers": 1,
                    "hands_won": 1,
                    "vpip": 1
                },
                "Rishabh": {
                    "netscore": 0,
                    "hands_played": 9,
                    "amount_won": 0,
                    "amount_lost": 3,
                    "flops": 0,
                    "turns": 0,
                    "rivers": 0,
                    "hands_won": 0,
                    "vpip": 0
                },
                "Kevin": {
                    "netscore": 0,
                    "hands_played": 12,
                    "amount_won": 3,
                    "amount_lost": 35,
                    "flops": 5,
                    "turns": 0,
                    "rivers": 0,
                    "hands_won": 1,
                    "vpip": 5
                },
                "Sam1/1😍": {
                    "netscore": 0,
                    "hands_played": 12,
                    "amount_won": 0,
                    "amount_lost": 60,
                    "flops": 2,
                    "turns": 2,
                    "rivers": 1,
                    "hands_won": 1,
                    "vpip": 3
                },
                "Rahul": {
                    "netscore": 0,
                    "hands_played": 12,
                    "amount_won": 56,
                    "amount_lost": 444,
                    "flops": 5,
                    "turns": 3,
                    "rivers": 2,
                    "hands_won": 2,
                    "vpip": 5
                },
                "SS": {
                    "netscore": 0,
                    "hands_played": 12,
                    "amount_won": 212,
                    "amount_lost": 117,
                    "flops": 7,
                    "turns": 4,
                    "rivers": 3,
                    "hands_won": 3,
                    "vpip": 7
                },
                "Aanisj": {
                    "netscore": 0,
                    "hands_played": 12,
                    "amount_won": 0,
                    "amount_lost": 475,
                    "flops": 5,
                    "turns": 1,
                    "rivers": 0,
                    "hands_won": 1,
                    "vpip": 7
                },
                "tin": {
                    "netscore": 0,
                    "hands_played": 12,
                    "amount_won": 0,
                    "amount_lost": 78,
                    "flops": 2,
                    "turns": 1,
                    "rivers": 1,
                    "hands_won": 0,
                    "vpip": 3
                },
                "Haris": {
                    "netscore": 0,
                    "hands_played": 12,
                    "amount_won": 109,
                    "amount_lost": 105,
                    "flops": 3,
                    "turns": 2,
                    "rivers": 1,
                    "hands_won": 2,
                    "vpip": 4
                },
                "krish": {
                    "netscore": 0,
                    "hands_played": 7,
                    "amount_won": 0,
                    "amount_lost": 117,
                    "flops": 4,
                    "turns": 1,
                    "rivers": 1,
                    "hands_won": 1,
                    "vpip": 3
                }
            }
        };

    const gameId = userDocRef.collection('games').doc().id;

    // Store data in Firestore
    const gameRef = userDocRef.collection('games').doc(gameId);
    await gameRef.set({
        glance: resultData.Glance,
        players: resultData.Player
    });

    // Store hands information
    resultData.Hands.forEach(async (hand, index) => {
        await gameRef.collection('hands').doc(`hand_${index + 1}`).set(hand);
    });

    return { success: true, gameId: gameId }; // Modified to return correctly in a callable function
});