import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { Expo, ExpoPushMessage } from "expo-server-sdk";

admin.initializeApp();
const db = admin.firestore();
const expo = new Expo();

interface PushRequest {
  recipients: string[];
  title: string;
  body: string;
  channelId?: string;
}

export const sendPushNotification = functions.https.onCall(async (request) => {
  // Перевірка авторизації
  if (!request.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Користувач повинен бути авторизований."
    );
  }

  const data = request.data as PushRequest;
  const { recipients, title, body, channelId = "default" } = data;

  if (!recipients || recipients.length === 0) {
    return { success: false, error: "Немає отримувачів" };
  }

  const messages: ExpoPushMessage[] = [];
  
  // Визначаємо файл звуку за каналом
  const soundFile = 
    channelId === 'done' ? 'done.wav' : 
    channelId === 'reminders' ? 'reminder.wav' : 
    'alert.wav';

  for (const token of recipients) {
    if (!Expo.isExpoPushToken(token)) {
      continue;
    }

    messages.push({
      to: token,
      sound: soundFile as any, 
      title,
      body,
      priority: 'high',
      mutableContent: true, // Для iOS
      data: { withSound: true },
      android: {
        channelId: channelId,
        sound: soundFile, // Явно вказуємо назву файлу для Android
      },
    });
  }

  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];

  try {
    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }

    // Оновлення статистики в базі даних
    const statsRef = db.collection("settings").doc("stats");
    await statsRef.set(
      {
        pushCount: admin.firestore.FieldValue.increment(messages.length),
        lastPushAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return { success: true, sentCount: messages.length };
  } catch (error) {
    console.error("Push error:", error);
    throw new functions.https.HttpsError("internal", "Помилка відправки пушів");
  }
});
