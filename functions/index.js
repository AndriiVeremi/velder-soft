const { setGlobalOptions } = require('firebase-functions');
const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { Expo } = require('expo-server-sdk');

admin.initializeApp();
const db = admin.firestore();
const expo = new Expo();

setGlobalOptions({ maxInstances: 10 });

exports.sendPushNotification = onRequest({ cors: true }, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    await admin.auth().verifyIdToken(authHeader.split('Bearer ')[1]);
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  const { recipients, title, body, channelId = 'default' } = req.body;

  if (!recipients || recipients.length === 0) {
    res.json({ success: false, error: 'No recipients' });
    return;
  }

  const soundFile =
    channelId === 'done' ? 'done.wav' : channelId === 'reminders' ? 'reminder.wav' : 'alert.wav';

  const messages = [];

  for (const token of recipients) {
    if (!Expo.isExpoPushToken(token)) {
      console.warn(`Invalid token: ${token}`);
      continue;
    }
    messages.push({
      to: token,
      sound: soundFile,
      title,
      body,
      priority: 'high',
      mutableContent: true,
      data: { withSound: true },
      android: {
        channelId: channelId,
        sound: soundFile,
      },
    });
  }

  if (messages.length === 0) {
    res.json({ success: false, error: 'No valid tokens' });
    return;
  }

  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];

  try {
    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }

    await db
      .collection('settings')
      .doc('stats')
      .set(
        {
          pushCount: admin.firestore.FieldValue.increment(messages.length),
          lastPushAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    res.json({ success: true, sentCount: messages.length });
  } catch (error) {
    console.error('Push error:', error);
    res.status(500).json({ error: 'Push send failed' });
  }
});
