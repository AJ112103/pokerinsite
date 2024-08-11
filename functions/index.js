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


