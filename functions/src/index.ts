import * as dotenv from "dotenv";
import * as admin from "firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import { onValueWritten } from "firebase-functions/v2/database";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as fs from "fs";
import OpenAI from "openai";
import * as os from "os";
import * as path from "path";

dotenv.config();

admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();

// Set global options (concurrency for cost control)
setGlobalOptions({ maxInstances: 10 });

// Initialize OpenAI 
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Transcribe Audio Function
 * Receives a storage path, downloads the file, and transcribes it via Whisper.
 */
export const transcribeAudio = onCall(async (request) => {
  // 1. Auth Guard
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }

  const { storagePath } = request.data;
  if (!storagePath) {
    throw new HttpsError("invalid-argument", "storagePath is required.");
  }

  const tempFilePath = path.join(os.tmpdir(), `transcription-${Date.now()}.m4a`);

  try {
    // 2. Download from Storage
    const bucket = storage.bucket();
    await bucket.file(storagePath).download({ destination: tempFilePath });

    // 3. Transcribe via OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-1",
    });

    return { text: transcription.text };

  } catch (error) {
    console.error("Transcription Error:", error);
    throw new HttpsError("internal", (error instanceof Error ? error.message : "Failed to transcribe audio."));
  } finally {
    // 4. Cleanup
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
});

/**
 * AI Responder Trigger
 * Runs whenever a new message is created in any chat.
 * Implements "Smooth Streaming" via progressive Firestore document updates.
 */
export const onChatMessageCreated = onDocumentCreated("chats/{chatId}/messages/{messageId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const newMessage = snapshot.data();
  const { chatId } = event.params;

  // --- 1. Push Notification Logic (Industry Standard) ---
  try {
    const chatSnap = await db.collection("chats").doc(chatId).get();
    const chatData = chatSnap.data();
    
    if (chatData) {
      const recipientIds = chatData.participantIds?.filter((id: string) => id !== newMessage.senderId) || [];
      const senderSnap = await db.collection("users").doc(newMessage.senderId).get();
      const senderData = senderSnap.data();
      const senderName = newMessage.senderType === 'ai' ? 'Kochanet AI' : (senderData?.displayName || 'A teammate');

      const rtdb = admin.database();

      for (const recipientId of recipientIds) {
        const recipientRef = db.collection("users").doc(recipientId);
        const recipientSnap = await recipientRef.get();
        const recipientData = recipientSnap.data();

        // Prefer RTDB presence (same source as the app). Firestore isOnline can stay stale if
        // profile sync ever wrote over the Cloud Function mirror.
        let recipientLooksOffline = true;
        try {
          const statusSnap = await rtdb.ref(`status/${recipientId}`).once("value");
          const presence = statusSnap.val();
          recipientLooksOffline = presence?.state !== "online";
        } catch (rtdbErr) {
          console.warn(`[Push] RTDB presence read failed for ${recipientId}, using Firestore isOnline`, rtdbErr);
          recipientLooksOffline = !recipientData?.isOnline;
        }

        if (recipientData?.pushToken && recipientLooksOffline) {
          const title = chatData.isGroup ? `New in ${chatData.name}` : senderName;
          const body = chatData.isGroup ? `${senderName} @ ${chatData.name}: ${newMessage.text}` : newMessage.text;
          const newBadgeCount = (recipientData.totalUnreadCount || 0) + 1;

          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Accept-encoding': 'gzip, deflate',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: recipientData.pushToken,
              sound: 'default',
              title,
              body: body.length > 100 ? body.substring(0, 97) + '...' : body,
              badge: newBadgeCount,
              data: { chatId }, // For deep linking
            }),
          });
          console.log(`[Push] Notification sent to ${recipientId} for chat ${chatId} (Badge: ${newBadgeCount})`);
        }
      }

      // Increment unread counts in the chat document for all participants except sender
      const unreadUpdates: any = {};
      recipientIds.forEach((rid: string) => {
        unreadUpdates[`unreadCounts.${rid}`] = FieldValue.increment(1);
      });
      
      if (Object.keys(unreadUpdates).length > 0) {
        await chatSnap.ref.update(unreadUpdates);
        console.log(`[Unread] Incremented counts for recipients of chat ${chatId}`);
      }
    }
  } catch (error) {
    console.error("Push Notification Logic Error:", error);
  }

  // --- 2. AI Responder Trigger ---
  const mentionedAI = newMessage.text?.includes("@ai");

  if (newMessage.senderType !== "human" || !mentionedAI) {
    return;
  }

  try {
    const messagesRef = db.collection("chats").doc(chatId).collection("messages");
    
    // 2. Fetch context (increased to 20 messages)
    const historySnapshot = await messagesRef
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    let rawHistory = historySnapshot.docs.map(doc => doc.data()).reverse();
    let memoryBlock = "";

    // 3. Smart Context: Summarization if history is long
    if (rawHistory.length >= 20) {
      console.log(`[AI] History threshold reached (${rawHistory.length}). Summarizing oldest 10 messages...`);
      const toSummarize = rawHistory.slice(0, 10);
      rawHistory = rawHistory.slice(10); // Keep only the latest 10 as high-fidelity

      const summaryPrompt = `Summarize the following chat history into a single paragraph of "Context Memory":\n${toSummarize.map(m => `${m.senderType}: ${m.text}`).join("\n")}`;
      
      const summaryResp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: summaryPrompt }],
        max_tokens: 150
      });
      
      memoryBlock = summaryResp.choices[0]?.message?.content || "";
    }

    // --- 3b. Rate Limiting Check ---
    const senderRef = db.collection("users").doc(newMessage.senderId);
    const senderDoc = await senderRef.get();
    const now = Timestamp.now();
    const lastRequest = senderDoc.data()?.lastAiRequest;

    if (lastRequest && (now.seconds - lastRequest.seconds < 15)) {
      console.log(`[AI] Rate limit hit for user ${newMessage.senderId}. Wait 15s.`);
      await messagesRef.add({
        chatId,
        text: "Slow down! 🛑 I can only answer one question every 15 seconds to keep things fair and fast for everyone. Please try again in a moment.",
        senderId: "kochanet-ai",
        senderType: "ai",
        type: "text",
        createdAt: FieldValue.serverTimestamp(),
        replyToId: snapshot.id,
        status: "sent" 
      });
      return;
    }

    // Update lastAiRequest timestamp
    await senderRef.update({ lastAiRequest: now });

    // 4. Prepare AI Message Placeholder
    let aiMsgRef: any = null;
    try {
      aiMsgRef = await messagesRef.add({
        chatId,
        text: "...", // Initial placeholder
        senderId: "kochanet-ai",
        senderType: "ai",
        type: "text",
        createdAt: FieldValue.serverTimestamp(),
        replyToId: snapshot.id,
        status: "streaming" 
      });

      // 5. Format context for OpenAI
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: `You are Kochanet AI. Provide concise, helpful answers. 
          ${memoryBlock ? `\n\n[CONTEXT MEMORY]: ${memoryBlock}` : ""}
          Use the conversation history for recent context.`
        }
      ];

      rawHistory.forEach(msg => {
        messages.push({
          role: msg.senderType === 'ai' ? 'assistant' : 'user',
          content: msg.text
        });
      });

      // 6. Generate AI Completion with Streaming
      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
        stream: true,
      });

      let fullText = "";
      let lastUpdateCount = 0;
      const UPDATE_THRESHOLD = 5; 

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullText += content;
          const wordCount = fullText.split(/\s+/).length;
          if (wordCount - lastUpdateCount >= UPDATE_THRESHOLD) {
            await aiMsgRef.update({ text: fullText });
            lastUpdateCount = wordCount;
          }
        }
      }

      // 7. Final Update - set status to 'sent'
      await aiMsgRef.update({ 
        text: fullText, 
        status: "sent" 
      });

      // 8. Update parent chat metadata
      await db.collection("chats").doc(chatId).update({
        lastMessageText: "AI: " + fullText.substring(0, 40) + "...",
        lastUpdated: FieldValue.serverTimestamp()
      });
    } catch (err) {
      console.error("AI Generation Stream Error:", err);
      if (aiMsgRef) {
        await aiMsgRef.update({
          text: "I'm sorry, I'm having trouble thinking right now. Please try again in a moment.",
          status: "sent"
        });
      }
    }

  } catch (error) {
    console.error("AI Function Main Catch:", error);
  }
});

/**
 * Presence Sync Trigger
 * Mirrors RTDB status changes to Firestore 'users' collection.
 */
export const onUserStatusChanged = onValueWritten("/status/{userId}", async (event) => {
  const { userId } = event.params;
  const data = event.data.after.val();

  if (!data) return;

  try {
    await db.collection("users").doc(userId).update({
      isOnline: data.state === "online",
      lastSeen: data.last_changed || FieldValue.serverTimestamp()
    });
    console.log(`Presence synced for user ${userId}: ${data.state}`);
  } catch (error) {
    console.error("Presence Sync Error:", error);
  }
});


/**
 * Unread Count Synchronizer
 * Triggers when a chat's unreadCounts map is updated.
 * Recalculates the total unread count for the affected users and updates their user document.
 */
export const syncTotalUnreadCount = onDocumentUpdated("chats/{chatId}", async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();

  if (!afterData || !beforeData) return;

  const beforeCounts = beforeData.unreadCounts || {};
  const afterCounts = afterData.unreadCounts || {};

  // Find users whose unread count changed
  const participantIds = afterData.participantIds || [];
  
  for (const userId of participantIds) {
    if (afterCounts[userId] !== beforeCounts[userId]) {
      // Unread count changed for this user, recalculate global total
      try {
        const chatsSnapshot = await db.collection("chats")
          .where("participantIds", "array-contains", userId)
          .get();
        
        let total = 0;
        chatsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          total += data.unreadCounts?.[userId] || 0;
        });

        await db.collection("users").doc(userId).update({
          totalUnreadCount: total
        });
        console.log(`[Badging] Synced totalUnreadCount for user ${userId}: ${total}`);
      } catch (error) {
        console.error(`[Badging] Error syncing totalUnreadCount for ${userId}:`, error);
      }
    }
  }
});

