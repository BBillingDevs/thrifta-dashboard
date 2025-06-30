import React, { useEffect, useState } from "react";
import {
    collection,
    onSnapshot,
    updateDoc,
    deleteDoc,
    doc,
    addDoc,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { sendNotificationToUser } from "../utils/notifications.js";

export default function RatingReports() {
    const [reports, setReports] = useState([]);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "rating_reports"), (snap) =>
            setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        );
        return unsub;
    }, []);

    const banUser = async (userId) => {
        await updateDoc(doc(db, "users", userId), { banned: true });
    };

    const sendWarning = async (userId, reason) => {
        const ok = await sendNotificationToUser({
            userId,
            title: "⚠️ Warning from Thrifta Admin",
            body: reason,
            type: "warning",
        });
        if (!ok) alert("Failed to send warning");
    };

    const deleteRating = async (ratingId) => {
        await deleteDoc(doc(db, "ratings", ratingId));
    };

    return (
        <div className="p-6 bg-white rounded shadow mt-8">
            <h2 className="text-xl mb-4">Rating Reports</h2>
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr>
                        <th className="border p-2">Rating ID</th>
                        <th className="border p-2">Reporter</th>
                        <th className="border p-2">Reason</th>
                        <th className="border p-2">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {reports.map((r) => (
                        <tr key={r.id}>
                            <td className="border p-2">{r.ratingId}</td>
                            <td className="border p-2">{r.reporterUserId}</td>
                            <td className="border p-2">{r.reason}</td>
                            <td className="border p-2 space-x-2">
                                <button
                                    onClick={() => banUser(r.reporterUserId)}
                                    className="px-2 py-1 bg-red-500 text-white rounded"
                                >
                                    Ban
                                </button>
                                <button
                                    onClick={() => sendWarning(r.reporterUserId, r.reason)}
                                    className="px-2 py-1 bg-yellow-400 rounded"
                                >
                                    Warn
                                </button>
                                <button
                                    onClick={() => deleteRating(r.ratingId)}
                                    className="px-2 py-1 bg-gray-700 text-white rounded"
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
