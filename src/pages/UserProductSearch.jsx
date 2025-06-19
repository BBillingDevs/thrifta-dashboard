import React, { useState } from 'react';
import {
    collection,
    query,
    where,
    getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Search for a user by displayName (forgiving leading/trailing spaces)
 * and list every product whose sellerId === that user’s UID.
 */
export default function UserProductSearch() {
    const [term, setTerm]       = useState('');
    const [loading, setLoading] = useState(false);
    const [userDoc, setUserDoc] = useState(null);   // matched user
    const [products, setProducts] = useState([]);   // their products
    const [error, setError]     = useState(null);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!term.trim()) return;

        setLoading(true);
        setError(null);
        setUserDoc(null);
        setProducts([]);

        try {
            // ────────────── 1) look up the user ──────────────
            const cleaned  = term.trim();                 // “Jane Doe”
            const guesses  = [
                cleaned,            // exact
                ` ${cleaned}`,      // leading space
                `${cleaned} `,      // trailing space
                ` ${cleaned} `,     // both
            ];

            const usersQ   = query(
                collection(db, 'users'),
                where('displayName', 'in', guesses)
            );
            const userSnap = await getDocs(usersQ);

            if (userSnap.empty) {
                setError(`No user found with display name “${cleaned}”.`);
                return;
            }

            const user = { id: userSnap.docs[0].id, ...userSnap.docs[0].data() };
            setUserDoc(user);

            // ────────────── 2) fetch their products ──────────────
            const productsQ = query(
                collection(db, 'products'),
                where('sellerId', '==', user.id)          // ← use your field name
            );
            const prodSnap  = await getDocs(productsQ);
            setProducts(
                prodSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
            );
        } catch (err) {
            console.error(err);
            setError('Search failed – check the console for details.');
        } finally {
            setLoading(false);
        }
    };

    // ─────────────────────── UI ───────────────────────
    return (
        <div className="bg-white p-6 rounded shadow mb-12">
            <h2 className="text-xl font-semibold mb-4">
                Search user &amp; view their products
            </h2>

            <form onSubmit={handleSearch} className="flex gap-3 mb-6">
                <input
                    className="flex-1 border rounded px-3 py-2"
                    placeholder="Enter display name…"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                />
                <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    disabled={loading}
                >
                    {loading ? 'Searching…' : 'Search'}
                </button>
            </form>

            {error && <p className="text-red-500">{error}</p>}

            {userDoc && (
                <>
                    <p className="font-medium mb-1">
                        {userDoc.displayName}
                        <span className="text-sm text-gray-500"> ({userDoc.email})</span>
                    </p>
                    <p className="text-xs text-gray-400 mb-4">UID: {userDoc.id}</p>

                    <h3 className="font-semibold mb-2">
                        Products&nbsp;({products.length})
                    </h3>
                    {products.length === 0 ? (
                        <p className="text-gray-500">No products found.</p>
                    ) : (
                        <ul className="list-disc pl-5 space-y-1">
                            {products.map((p) => (
                                <li key={p.id}>
                                    {p.title || p.name || 'Unnamed product'}
                                    {p.sold && (
                                        <span className="ml-2 text-green-600 text-sm">
                      (Sold)
                    </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </div>
    );
}
