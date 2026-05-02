const {setGlobalOptions} = require("firebase-functions");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const {Expo} = require("expo-server-sdk");

admin.initializeApp();
const db = admin.firestore();
const expo = new Expo();

setGlobalOptions({maxInstances: 10});

exports.sendPushNotification = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
        "unauthenticated",
        "Користувач повинен бути авторизований."
    );
  }

  const {recipients, title, body, channelId = "default"} = request.data;

  if (!recipients || recipients.length === 0) {
    return {success: false, error: "Немає отримувачів"};
  }

  const soundFile =
    channelId === "done_v1" ? "done.wav" :
    channelId === "reminders_v2" ? "reminder.wav" :
    "alert.wav";

  const messages = [];

  for (const token of recipients) {
    if (!Expo.isExpoPushToken(token)) {
      console.warn(`Невалідний Expo push токен: ${token}`);
      continue;
    }

    messages.push({
      to: token,
      sound: soundFile,
      title,
      body,
      priority: "high",
      mutableContent: true,
      data: {withSound: true},
      android: {
        channelId: channelId,
        sound: soundFile,
      },
    });
  }

  if (messages.length === 0) {
    return {success: false, error: "Жодного валідного Expo push токена"};
  }

  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];

  try {
    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }

    const statsRef = db.collection("settings").doc("stats");
    await statsRef.set(
        {
          pushCount: admin.firestore.FieldValue.increment(messages.length),
          lastPushAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        {merge: true}
    );

    return {success: true, sentCount: messages.length};
  } catch (error) {
    console.error("Push error:", error);
    throw new HttpsError("internal", "Помилка відправки пушів");
  }
});
