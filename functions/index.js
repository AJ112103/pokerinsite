const admin = require('firebase-admin');
admin.initializeApp();
const functions = require('firebase-functions');
const stripe = require('stripe')(functions.config().stripe.secret);
const axios = require('axios');

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

    // Log the received data for debugging
    console.log('Received data:', data);

    // Retrieve the user ID from the authentication context
    const userId = context.auth.uid;
    const userDocRef = admin.firestore().collection('userData').doc(userId);
    const gameId = userDocRef.collection('games').doc().id;

    // Destructure the necessary data from the input
    const { link, selectedPlayers } = data;

    // Call the Lambda function with the link and selectedPlayers
    let resultData;
    try {
        const response = await axios.post('https://fssn6tejrwpxyggox6vtdo4wca0fvmyv.lambda-url.us-west-1.on.aws/', {
            link: link,
            names: selectedPlayers
        });

        resultData = response.data.body ? JSON.parse(response.data.body) : response.data;
        console.log('Lambda response:', resultData);

    } catch (error) {
        console.error('Error calling Lambda function:', error);
        throw new functions.https.HttpsError('unknown', 'Error processing data with Lambda function');
    }

    // Store data in Firestore
    const gameRef = userDocRef.collection('games').doc(gameId);
    await gameRef.set({
        glance: resultData.Glance,
        players: resultData.Player,
        yourNet: data.yourNet || 0,  // Default to 0 if not provided
        sessionName: data.sessionName || 'Unnamed Session',  // Default if sessionName is missing
        sessionDate: data.date || new Date().toISOString()  // Default to current date if not provided
    });

    // Store hands information in Firestore
    resultData.Hands.forEach(async (hand, index) => {
        await gameRef.collection('hands').doc(`hand_${index + 1}`).set(hand);
    });

    return { success: true, gameId: gameId }; // Return the gameId and success status
});

exports.getAllSessionDetails = functions.https.onCall(async (data, context) => {
    // Ensure the user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const userId = context.auth.uid;
    const userDocRef = admin.firestore().collection('userData').doc(userId);

    try {
        const gamesSnapshot = await userDocRef.collection('games').get();
        
        if (gamesSnapshot.empty) {
            return { success: true, message: "No sessions available.", details: [] };
        }

        const sessionDetails = gamesSnapshot.docs.map(doc => ({
            sessionId: doc.id,
            sessionName: doc.data().sessionName,
            yourNet: doc.data().yourNet,
            date: doc.data().sessionDate,
            glance: doc.data().glance
        }));

        return { success: true, details: sessionDetails };
    } catch (error) {
        console.error('Error fetching session details:', error);
        throw new functions.https.HttpsError('unknown', 'An error occurred while fetching session details.');
    }
});

exports.getHandsByGameId = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    if (!data.gameId) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with one argument "gameId".');
    }

    const userId = context.auth.uid;
    const gameRef = admin.firestore().collection('userData').doc(userId).collection('games').doc(data.gameId);

    try {
        const handsSnapshot = await gameRef.collection('hands').get();

        if (handsSnapshot.empty) {
            return { success: true, message: "No hands available for this game.", hands: [] };
        }

        const handsDetails = handsSnapshot.docs.map(doc => ({
            handId: doc.id,
            ...doc.data()
        }));

        return { success: true, hands: handsDetails };
    } catch (error) {
        console.error('Error fetching hands:', error);
        throw new functions.https.HttpsError('unknown', 'An error occurred while fetching hands.');
    }
});

exports.getPlayerDetails = functions.https.onCall(async (data, context) => {
    // Check for authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    // Validate the provided gameId
    if (!data.gameId) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a valid gameId.');
    }

    const userId = context.auth.uid;
    const gameDocRef = admin.firestore()
                             .collection('userData')
                             .doc(userId)
                             .collection('games')
                             .doc(data.gameId);

    try {
        const gameSnapshot = await gameDocRef.get();
        
        if (!gameSnapshot.exists) {
            return { success: false, message: "Game not found." };
        }

        const playersData = gameSnapshot.data().players;

        return { success: true, players: playersData };
    } catch (error) {
        console.error('Error fetching player details:', error);
        throw new functions.https.HttpsError('unknown', 'An error occurred while fetching player details.');
    }
});
