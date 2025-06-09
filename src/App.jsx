// src/App.jsx
import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import {
    collection,
    query,
    where,
    onSnapshot,
    updateDoc,
    doc,
    deleteDoc,
    addDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import StatCard from './components/StatCard';
import ReportCard from './components/ReportCard';
import UserReports from './pages/UserReports';
import ProductReports from './pages/ProductReports';
import RatingReports from './pages/RatingReports';

export default function App() {
    // 1) Dashboard stats
    const [stats, setStats] = useState({
        totalUsers: 0,
        proUsers: 0,
        premiumUsers: 0,
        premiumPlusUsers: 0,
        totalProducts: 0,
        soldProducts: 0,
    });

    // 2) Report counts
    const [reportCounts, setReportCounts] = useState({
        users: 0,
        products: 0,
        ratings: 0,
    });

    useEffect(() => {
        const unsubscribers = [];

        // Helper to attach a listener and track count under `stats`
        const attachCountListener = (refQuery, key) => {
            const unsub = onSnapshot(refQuery, (snap) => {
                setStats(prev => ({ ...prev, [key]: snap.size }));
            });
            unsubscribers.push(unsub);
        };

        // 2a) Stats listeners
        attachCountListener(collection(db, 'users'), 'totalUsers');
        attachCountListener(
            query(
                collection(db, 'users'),
                where('subscriptionEntitlementId', '==', 'thrifta_pro')
            ),
            'proUsers'
        );
        attachCountListener(
            query(
                collection(db, 'users'),
                where('subscriptionEntitlementId', '==', 'thrifta_premium')
            ),
            'premiumUsers'
        );
        attachCountListener(
            query(
                collection(db, 'users'),
                where('subscriptionEntitlementId', '==', 'thrifta_premium_plus')
            ),
            'premiumPlusUsers'
        );
        attachCountListener(collection(db, 'products'), 'totalProducts');
        attachCountListener(
            query(collection(db, 'products'), where('sold', '==', true)),
            'soldProducts'
        );

        // Helper to watch a top‐level reports collection
        const watch = (colPath, key) => {
            const unsub = onSnapshot(collection(db, colPath), (snap) => {
                setReportCounts(prev => ({ ...prev, [key]: snap.size }));
            });
            unsubscribers.push(unsub);
        };

        // 2b) Report count listeners
        watch('userReports', 'users');
        watch('productReports', 'products');
        watch('ratingReports', 'ratings');

        // Cleanup on unmount
        return () => unsubscribers.forEach(unsub => unsub());
    }, []);

    // Prepare stat cards
    const cards = [
        { title: 'Total Users', value: stats.totalUsers },
        { title: 'Pro Users', value: stats.proUsers },
        { title: 'Premium Users', value: stats.premiumUsers },
        { title: 'Premium Plus Users', value: stats.premiumPlusUsers },
        { title: 'Products Listed', value: stats.totalProducts },
        { title: 'Products Sold', value: stats.soldProducts },
    ];

    return (
        <div className="min-h-screen p-8 bg-gray-50">
            <h1 className="text-2xl font-bold mb-8">Thrifta Admin Dashboard</h1>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {cards.map((c) => (
                    <StatCard key={c.title} title={c.title} value={c.value} />
                ))}
            </div>

            {/* Reports Section */}
            <h2 className="text-xl font-semibold mb-4">Reports</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
                <ReportCard
                    title="User Reports"
                    to="/reports/users"
                    count={reportCounts.users}
                />
                <ReportCard
                    title="Product Reports"
                    to="/reports/products"
                    count={reportCounts.products}
                />
                <ReportCard
                    title="Rating Reports"
                    to="/reports/ratings"
                    count={reportCounts.ratings}
                />
            </div>

            {/* Routes */}
            <Routes>
                <Route path="/reports/users" element={<UserReports />} />
                <Route path="/reports/products" element={<ProductReports />} />
                <Route path="/reports/ratings" element={<RatingReports />} />
            </Routes>
        </div>
    );
}
