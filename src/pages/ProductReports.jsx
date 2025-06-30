// src/pages/ProductReports.jsx
import React, { useEffect, useState } from "react";
import {
    collection,
    onSnapshot,
    getDoc,
    doc,
    updateDoc,
    deleteDoc,
    increment,
    addDoc,
    setDoc,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { sendNotificationToUser } from "../utils/notifications";

const ADMIN_UID = "HFhMEeJg7GdNCl4atA2YJTlAKsF2";
const ADMIN_ALIAS = "Thrifta Admin";
const ADMIN_EMAIL = "no-reply@thrifta.app"; // safe, non-personal
const chatIdFor = (a, b) => [a, b].sort().join("_");

export default function ProductReports() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);

    /* toast auto-dismiss */
    useEffect(() => {
        if (!toast) return;
        const id = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(id);
    }, [toast]);

    /* live product reports */
    useEffect(() => {
        const unsub = onSnapshot(
            collection(db, "product_reports"),
            async (snap) => {
                const merged = await Promise.all(
                    snap.docs.map(async (d) => {
                        const rpt = { id: d.id, ...d.data() };
                        const prodS = await getDoc(doc(db, "products", rpt.productId));
                        return { ...rpt, product: prodS.exists() ? prodS.data() : null };
                    }),
                );
                setRows(merged);
                setLoading(false);
            },
        );
        return unsub;
    }, []);

    /* ───────── chat helper ───────── */
    const sendAdminChatMessage = async (sellerId, text) => {
        const roomId = chatIdFor(ADMIN_UID, sellerId);
        const roomRef = doc(db, "chat_rooms", roomId);

        /* 1) add message (now with senderEmail + timestamp) */
        await addDoc(collection(db, "chat_rooms", roomId, "messages"), {
            senderID: ADMIN_UID,
            senderName: ADMIN_ALIAS,
            senderEmail: ADMIN_EMAIL,
            receiverID: sellerId,
            message: text,
            timestamp: serverTimestamp(), // <- required field
            read: false,
        });

        /* 2) update / create chat room with unread map */
        const snap = await getDoc(roomRef);

        if (snap.exists()) {
            await updateDoc(roomRef, {
                lastMessage: text,
                lastMessageTime: serverTimestamp(),
                [`unreadCount.${sellerId}`]: increment(1),
            });
        } else {
            await setDoc(roomRef, {
                createdAt: serverTimestamp(),
                userIds: [ADMIN_UID, sellerId],
                lastMessage: text,
                lastMessageTime: serverTimestamp(),
                unreadCount: {
                    [ADMIN_UID]: 1,
                    [sellerId]: 1, // default 1 for each uid
                },
            });
        }

        /* 3) push ping */
        await sendNotificationToUser({
            type: "message",
            userId: sellerId,
            senderId: ADMIN_UID,
            title: "New message from Thrifta Admin",
            body: text,
        });
    };

    /* ───────── admin actions ───────── */
    const banSeller = async (uid) => {
        await updateDoc(doc(db, "users", uid), { banned: true });
        await sendNotificationToUser({
            userId: uid,
            title: "🚫 Account Banned",
            body: "Your account has been permanently banned for violating Thrifta policies.",
        });
        setToast("Seller banned & notified.");
    };

    const warnSeller = async (uid, productName) => {
        const text = `Your product "${productName}" does not meet the criteria to be sold on Thrifta and has been removed.`;

        await sendNotificationToUser({
            userId: uid,
            title: "⚠️ Warning from Thrifta Admin",
            body: text,
        });

        await updateDoc(doc(db, "users", uid), { warnings: increment(1) });
        await sendAdminChatMessage(uid, text);

        setToast("Warning sent via push + chat.");
    };

    const deleteProduct = async (prodId) => {
        await deleteDoc(doc(db, "products", prodId));
        setToast("Product removed (no notification).");
    };

    /* ───────── UI ───────── */
    if (loading) return <p className="p-6">Loading…</p>;

    return (
        <div className="p-8">
            {toast && (
                <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow">
                    {toast}
                </div>
            )}

            <h1 className="text-2xl font-semibold mb-6">Product Reports</h1>

            <div className="overflow-x-auto">
                <table className="min-w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-100 text-sm">
                            <th className="border px-3 py-2">Product</th>
                            <th className="border px-3 py-2">Category</th>
                            <th className="border px-3 py-2">Description</th>
                            <th className="border px-3 py-2">Reporter&nbsp;ID</th>
                            <th className="border px-3 py-2">Reason</th>
                            <th className="border px-3 py-2">Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.id} className="align-top">
                                {/* product info */}
                                <td className="border px-3 py-2">
                                    {r.product ? (
                                        <div className="flex items-center space-x-3">
                                            <img
                                                src={r.product.image_urls?.[0]}
                                                alt={r.product.name}
                                                className="w-16 h-16 object-cover rounded"
                                            />
                                            <div>
                                                <p className="font-medium">{r.product.name}</p>
                                                <p className="text-xs text-gray-500">
                                                    ${r.product.price?.toFixed(2) ?? "0.00"}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    Seller: {r.product.sellerId}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-500 italic">
                                            (product deleted)
                                        </span>
                                    )}
                                </td>

                                {/* category */}
                                <td className="border px-3 py-2 text-xs">
                                    {r.product
                                        ? `${r.product.category}${r.product.subcategory ? ` → ${r.product.subcategory}` : ""}`
                                        : "—"}
                                </td>

                                {/* description */}
                                <td className="border px-3 py-2 text-xs max-w-xs whitespace-pre-wrap">
                                    {r.product ? (
                                        <span title={r.product.description}>
                                            {r.product.description?.slice(0, 120) ?? ""}{" "}
                                            {r.product.description?.length > 120 && "…"}
                                        </span>
                                    ) : (
                                        "—"
                                    )}
                                </td>

                                {/* reporter */}
                                <td className="border px-3 py-2 text-xs">{r.reporterUserId}</td>

                                {/* reason */}
                                <td className="border px-3 py-2 max-w-sm whitespace-pre-wrap">
                                    {r.reason}
                                </td>

                                {/* actions */}
                                <td className="border px-3 py-2 space-y-1">
                                    <button
                                        disabled={!r.product}
                                        onClick={() => banSeller(r.product?.sellerId)}
                                        className="block w-full px-2 py-1 bg-red-500 text-white rounded text-xs disabled:opacity-50"
                                    >
                                        Ban seller
                                    </button>

                                    <button
                                        disabled={!r.product}
                                        onClick={() =>
                                            warnSeller(r.product?.sellerId, r.product?.name)
                                        }
                                        className="block w-full px-2 py-1 bg-yellow-400 rounded text-xs disabled:opacity-50"
                                    >
                                        Warn seller
                                    </button>

                                    {r.product && (
                                        <button
                                            onClick={() => deleteProduct(r.productId)}
                                            className="block w-full px-2 py-1 bg-gray-700 text-white rounded text-xs"
                                        >
                                            Delete product
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
