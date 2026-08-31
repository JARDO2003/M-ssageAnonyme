

const {onDocumentCreated, onDocumentUpdated} = require("firebase-functions/v2/firestore");
const {defineSecret} = require("firebase-functions/params");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const logger = require("firebase-functions/logger");

initializeApp();
const db = getFirestore();

// Identifiant de l'app OneSignal utilisé côté client dans list.html.
const ONESIGNAL_APP_ID = "048cd9d8-412d-43ce-b33b-bba1c1c600b8";
const ONESIGNAL_REST_API_KEY = defineSecret("ONESIGNAL_REST_API_KEY");

/**
 * Envoie une notification push à une liste d'utilisateurs, ciblés par leur
 * "external_id" OneSignal (= uid Firebase, défini via OneSignal.login(uid)
 * côté client). Aucun besoin de connaître le player id / oneSignalId.
 */
async function sendPush({apiKey, externalIds, title, message, data, excludeUid}) {
  const targetIds = [...new Set(externalIds.filter(Boolean))]
    .filter((id) => id !== excludeUid);
  if (targetIds.length === 0) return null;

  const body = {
    app_id: ONESIGNAL_APP_ID,
    include_aliases: {external_id: targetIds},
    target_channel: "push",
    headings: {en: title},
    contents: {en: message},
    data: data || {},
  };

  const res = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Authorization": `Basic ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    logger.error("OneSignal error", {status: res.status, json});
  }
  return json;
}

/* ==========================================================================
   1) NOUVEAU MESSAGE
   ========================================================================== */
exports.onNewMessage = onDocumentCreated(
    {document: "chats/{chatId}/messages/{messageId}", secrets: [ONESIGNAL_REST_API_KEY]},
    async (event) => {
      const msg = event.data.data();
      const chatId = event.params.chatId; // format "uidA__uidB" (triés)
      const [uidA, uidB] = chatId.split("__");
      const senderId = msg.senderId;
      const recipientId = senderId === uidA ? uidB : uidA;
      if (!recipientId || recipientId === senderId) return;

      let senderName = "Quelqu'un";
      try {
        const senderSnap = await db.collection("directory").doc(senderId).get();
        if (senderSnap.exists) senderName = senderSnap.data().codeName || senderName;
      } catch (e) { /* ignore */ }

      const preview = msg.type === "text" ? (msg.text || "").slice(0, 120) :
        msg.type === "image" ? "📷 Photo" :
        msg.type === "video" ? "🎥 Vidéo" : "Nouveau message";

      await sendPush({
        apiKey: ONESIGNAL_REST_API_KEY.value(),
        externalIds: [recipientId],
        title: `💬 ${senderName}`,
        message: preview,
        data: {type: "message", chatId, senderId},
      });
    },
);

/* ==========================================================================
   2) APPEL ENTRANT (audio / vidéo)
   ========================================================================== */
exports.onNewCall = onDocumentCreated(
    {document: "calls/{callId}", secrets: [ONESIGNAL_REST_API_KEY]},
    async (event) => {
      const call = event.data.data();
      if (call.status !== "ringing" || !call.calleeUid) return;

      await sendPush({
        apiKey: ONESIGNAL_REST_API_KEY.value(),
        externalIds: [call.calleeUid],
        title: `📞 Appel ${call.type === "video" ? "vidéo" : "audio"} entrant`,
        message: `${call.callerCodeName || "Un i-chatter"} t'appelle`,
        data: {type: "call", callId: event.params.callId},
      });
    },
);

/* ==========================================================================
   3) COMMANDES — création directe, diffusion élargie, acceptation, arrivée
   ========================================================================== */
exports.onOrderCreated = onDocumentCreated(
    {document: "orders/{orderId}", secrets: [ONESIGNAL_REST_API_KEY]},
    async (event) => {
      const order = event.data.data();
      if (!order.targetIcharterUid) return; // commande ciblée directement (depuis un post)

      await sendPush({
        apiKey: ONESIGNAL_REST_API_KEY.value(),
        externalIds: [order.targetIcharterUid],
        title: "📍 Nouvelle commande",
        message: `${order.clientCodeName || "Un client"} te commande directement.`,
        data: {type: "order", orderId: event.params.orderId},
      });
    },
);

exports.onOrderUpdated = onDocumentUpdated(
    {document: "orders/{orderId}", secrets: [ONESIGNAL_REST_API_KEY]},
    async (event) => {
      const before = event.data.before.data();
      const after = event.data.after.data();
      const orderId = event.params.orderId;
      const apiKey = ONESIGNAL_REST_API_KEY.value();

      // La recherche s'élargit à tous les i-chatters disponibles (après 15s sans réponse).
      if (!before.broadcastAll && after.broadcastAll) {
        const availSnap = await db.collection("users").where("icharterAvailable", "==", true).get();
        const ids = availSnap.docs.map((d) => d.id);
        await sendPush({
          apiKey,
          externalIds: ids,
          excludeUid: after.clientUid,
          title: "📍 Commande à proximité",
          message: `${after.clientCodeName || "Un client"} cherche un i-chatter disponible.`,
          data: {type: "order", orderId},
        });
      }

      // Un i-chatter vient d'accepter -> notifier le client.
      if (before.status !== "accepted" && after.status === "accepted" && after.icharterUid) {
        await sendPush({
          apiKey,
          externalIds: [after.clientUid],
          title: "✅ Commande acceptée",
          message: `${after.icharterCodeName || "Un i-chatter"} a accepté ta commande.`,
          data: {type: "order", orderId},
        });
      }

      // L'i-chatter est arrivé.
      if (before.status !== "arrived" && after.status === "arrived") {
        await sendPush({
          apiKey,
          externalIds: [after.clientUid],
          title: "📍 Arrivée",
          message: `${after.icharterCodeName || "Ton i-chatter"} est arrivé.`,
          data: {type: "order", orderId},
        });
      }
    },
);

/* ==========================================================================
   4) NOUVELLE PUBLICATION
   ========================================================================== */
exports.onNewPost = onDocumentCreated(
    {document: "posts/{postId}", secrets: [ONESIGNAL_REST_API_KEY]},
    async (event) => {
      const post = event.data.data();
      if (!post || !post.uid) return;

      const dirSnap = await db.collection("directory").get();
      const ids = dirSnap.docs.map((d) => d.id);
      if (ids.length === 0) return;

      await sendPush({
        apiKey: ONESIGNAL_REST_API_KEY.value(),
        externalIds: ids,
        excludeUid: post.uid,
        title: `📸 Nouveau i-chat de ${post.codeName || "un i-chatter"}`,
        message: post.caption ? post.caption.slice(0, 120) : "Découvre la nouvelle publication.",
        data: {type: "post", postId: event.params.postId},
      });
    },
);
