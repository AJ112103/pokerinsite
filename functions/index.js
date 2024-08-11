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
        if (session.mode === 'subscription') {
            updateSubscriptionStatus(session.customer, 'Basic');
        }
    } else if (event.type === 'customer.subscription.deleted' || event.type === 'invoice.payment_failed') {
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
    // Authentication check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    // Retrieve the user ID from the authentication context
    const userId = context.auth.uid;

    // Data validation
    const { sessionName, date, score } = data;
    if (!sessionName || !date || typeof score !== 'number') {
        throw new functions.https.HttpsError('invalid-argument', 'Missing mandatory fields or incorrect types.');
    }

    // Transaction to handle the bankroll entry and netScore atomically
    const transactionResult = await admin.firestore().runTransaction(async (transaction) => {
        const userDocRef = admin.firestore().collection('userData').doc(userId);
        const bankrollRef = userDocRef.collection('bankroll').doc('details');
        
        const bankrollDoc = await transaction.get(bankrollRef);
        let netScore = score;

        if (bankrollDoc.exists) {
            // Update existing net score
            netScore = bankrollDoc.data().netScore + score;
        }

        // Set or update the net score
        transaction.set(bankrollRef, { netScore }, { merge: true });

        // Add new entry
        const entryRef = bankrollRef.collection('entries').doc();
        transaction.set(entryRef, {
            name: sessionName,
            date,
            score
        });

        // Return both netScore and the ID of the new entry
        return { netScore, entryId: entryRef.id };
    });

    // Returning both netScore and entryId to the client
    return { netScore: transactionResult.netScore, entryId: transactionResult.entryId };
});

exports.getBankrollData = functions.https.onCall(async (data, context) => {
    // Authentication check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    // Retrieve the user ID from the authentication context
    const userId = context.auth.uid;

    try {
        const userDocRef = admin.firestore().collection('userData').doc(userId);
        const bankrollRef = userDocRef.collection('bankroll').doc('details');

        // Fetch the bankroll details document
        const bankrollDoc = await bankrollRef.get();
        if (!bankrollDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Bankroll data not found.');
        }

        // Fetch all entries under this bankroll
        const entriesRef = bankrollRef.collection('entries');
        const entriesSnapshot = await entriesRef.get();
        const entries = entriesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Prepare and return the data
        return {
            netScore: bankrollDoc.data().netScore,
            entries: entries
        };
    } catch (error) {
        console.error('Failed to retrieve bankroll data:', error);
        throw new functions.https.HttpsError('unknown', 'Failed to retrieve data', error);
    }
});

exports.deleteBankrollEntryAndUpdateScore = functions.https.onCall(async (data, context) => {
    // Authentication check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    // Retrieve the user ID from the authentication context
    const userId = context.auth.uid;
    const entryId = data.entryId; // ID of the entry to be deleted

    if (!entryId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing mandatory field: entryId.');
    }

    // Transaction to handle the deletion of the entry and update the netScore atomically
    const result = await admin.firestore().runTransaction(async (transaction) => {
        const userDocRef = admin.firestore().collection('userData').doc(userId);
        const bankrollRef = userDocRef.collection('bankroll').doc('details');
        const entryRef = bankrollRef.collection('entries').doc(entryId);

        const entryDoc = await transaction.get(entryRef);
        if (!entryDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Bankroll entry not found.');
        }

        const entryData = entryDoc.data();
        const scoreToSubtract = entryData.score;

        const bankrollDoc = await transaction.get(bankrollRef);
        if (!bankrollDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Bankroll details not found.');
        }

        let netScore = bankrollDoc.data().netScore - scoreToSubtract;

        // Update the net score
        transaction.update(bankrollRef, { netScore });

        // Delete the entry
        transaction.delete(entryRef);

        return netScore; // Return the updated net score
    });

    return { netScore: result };
});

