// src/pages/UserManagement.jsx
import React, { useEffect, useState } from "react";
import {
    collection,
    onSnapshot,
    query,
    where,
    getDocs,
    deleteDoc,
    doc,
    updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

/* ───────── helper: delete a query batch recursively ───────── */
async function deleteQueryBatch(q, batchSize = 200) {
    const snap = await getDocs(q);
    if (snap.empty) return;

    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    if (snap.size >= batchSize) {
        return deleteQueryBatch(q, batchSize);
    }
}

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyUid, setBusyUid] = useState(null);
    const [search, setSearch] = useState("");

    /* ───────── live users ───────── */
    useEffect(() => {
        const unsub = onSnapshot(collection(db, "users"), (snap) => {
            setUsers(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
            setLoading(false);
        });
        return unsub;
    }, []);

    /* ───────── cascade delete for a user ───────── */
    const deleteUserCompletely = async (uid) => {
        const ok = window.confirm(
            "Permanently delete user, their products, favourites, spotlight, chats and messages?\n\nContinue?",
        );
        if (!ok) return;

        setBusyUid(uid);

        /* 1) Products (sellerId === uid) */
        await deleteQueryBatch(
            query(collection(db, "products"), where("sellerId", "==", uid)),
        );

        /* 2) Favourites – ONE doc whose id === uid */
        await deleteDoc(doc(db, "favorites", uid)).catch(() => { });

        /* 3) Spotlight – ONE doc whose id === uid (if collection exists) */
        await deleteDoc(doc(db, "spotlight", uid)).catch(() => { });

        /* 4) chat_rooms where userIds array contains uid */
        const roomsSnap = await getDocs(
            query(
                collection(db, "chat_rooms"),
                where("userIds", "array-contains", uid),
            ),
        );

        for (const room of roomsSnap.docs) {
            await deleteQueryBatch(collection(db, "chat_rooms", room.id, "messages"));
            await deleteDoc(room.ref);
        }

        /* 5) user doc itself */
        await deleteDoc(doc(db, "users", uid));

        setBusyUid(null);
        alert("User & related data deleted.");
    };

    /* ───────── warn counter ───────── */
    const addWarning = (uid) =>
        updateDoc(doc(db, "users", uid), {
            warnings: (users.find((u) => u.uid === uid)?.warnings || 0) + 1,
        });

    /* ───────── search filter ───────── */
    const term = search.trim().toLowerCase();
    const filtered = term
        ? users.filter(
            (u) =>
                u.email?.toLowerCase().includes(term) ||
                u.displayName?.toLowerCase().includes(term),
        )
        : users;

    if (loading) return <p className="p-6">Loading users…</p>;

    return (
        <div className="p-8">
            <h1 className="text-2xl font-semibold mb-6">User Management</h1>

            {/* search */}
            <div className="mb-4">
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by display name or email…"
                    className="border rounded px-3 py-2 w-full max-w-sm"
                />
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left">
                    <thead>
                        <tr className="bg-gray-100 text-sm">
                            <th className="border px-3 py-2">UID</th>
                            <th className="border px-3 py-2">Display&nbsp;Name</th>
                            <th className="border px-3 py-2">Email</th>
                            <th className="border px-3 py-2">Subscription</th>
                            <th className="border px-3 py-2">Warnings</th>
                            <th className="border px-3 py-2">Data&nbsp;(JSON)</th>
                            <th className="border px-3 py-2">Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filtered.map((u) => (
                            <tr key={u.uid} className="align-top">
                                <td className="border px-3 py-2 text-xs">{u.uid}</td>
                                <td className="border px-3 py-2 text-xs">
                                    {u.displayName || "—"}
                                </td>
                                <td className="border px-3 py-2 text-xs">{u.email}</td>
                                <td className="border px-3 py-2 text-xs">
                                    {u.subscriptionEntitlementId || "—"}
                                </td>

                                <td className="border px-3 py-2 text-center">
                                    {u.warnings ?? 0}
                                    <button
                                        onClick={() => addWarning(u.uid)}
                                        className="ml-2 text-[11px] px-1 py-0.5 bg-yellow-400 rounded"
                                    >
                                        +1
                                    </button>
                                </td>

                                <td className="border px-3 py-2 text-xs max-w-sm">
                                    <pre className="whitespace-pre-wrap break-words">
                                        {JSON.stringify(u, null, 2)}
                                    </pre>
                                </td>

                                <td className="border px-3 py-2 space-y-2">
                                    <button
                                        onClick={() => deleteUserCompletely(u.uid)}
                                        disabled={busyUid === u.uid}
                                        className="block w-full px-2 py-1 bg-red-600 text-white rounded text-xs disabled:opacity-60"
                                    >
                                        {busyUid === u.uid ? "Deleting…" : "Delete user"}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
