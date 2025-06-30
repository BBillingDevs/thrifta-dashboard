const SERVER_URL = import.meta.env.VITE_RAILWAY_SERVER_URL;
const API_KEY = import.meta.env.VITE_RAILWAY_API_KEY;

/** Internal helper */
async function postJson(path, payload) {
    console.log(payload);
    const res = await fetch(`${SERVER_URL}${path}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": API_KEY,
        },
        body: JSON.stringify({ ...payload, appId: "thrifta" }),
    });

    if (!res.ok) {
        console.error(`Server responded ${res.status}`, await res.text());
        return false;
    }

    const data = await res.json();
    if (!data.success) {
        console.error("Notification server error:", data.error);
    }
    console.log(data);
    return data.success === true;
}

/**
 * Send an admin notification.
 *
 * @param {Object} opts
 * @param {String} opts.userId
 * @param {String} opts.title
 * @param {String} opts.body
 * @param {String} [opts.type='generic']   – any string you like (warning, product_delete, …)
 * @param {String} [opts.productId]
 * @param {String} [opts.senderId]         – only for chat messages
 * @return {Boolean} success
 */
export async function sendNotificationToUser({
    userId,
    title,
    body,
    type = "generic",
    productId = null,
    senderId = null,
    offerId = null,
    offerValue = null,
}) {
    const payload = {
        userId,
        title,
        message: body,
        type,
    };
    if (productId) payload.productId = productId;
    if (senderId) payload.senderId = senderId;
    if (offerId) payload.offerId = offerId;
    if (offerValue) payload.offerValue = offerValue;

    const endpoint =
        type === "message" ? "/send-message-notification" : "/send-notification";

    return postJson(endpoint, payload);
}

/* EXPORTED helpers if you want to call them directly */
export const sendGenericNotification = (o) =>
    postJson("/send-notification", { ...o, type: o.type ?? "generic" });

export const sendMessageNotification = (o) =>
    postJson("/send-message-notification", { ...o, type: "message" });
