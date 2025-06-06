import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import StatCard from './components/StatCard';

export default function App() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    proUsers: 0,
    premiumUsers: 0,
    premiumPlusUsers: 0,
    totalProducts: 0,
    soldProducts: 0,
  });

  useEffect(() => {
    const unsubscribers = [];

    const attachCountListener = (refQuery, key) => {
      const unsub = onSnapshot(refQuery, (snap) => {
        setStats((prev) => ({ ...prev, [key]: snap.size }));
      });
      unsubscribers.push(unsub);
    };

    // Users
    attachCountListener(collection(db, 'users'), 'totalUsers');
    attachCountListener(
      query(collection(db, 'users'), where('subscriptionEntitlementId', '==', 'thrifta_pro')),
      'proUsers'
    );
    attachCountListener(
      query(collection(db, 'users'), where('subscriptionEntitlementId', '==', 'thrifta_premium')),
      'premiumUsers'
    );
    attachCountListener(
      query(collection(db, 'users'), where('subscriptionEntitlementId', '==', 'thrifta_premium_plus')),
      'premiumPlusUsers'
    );

    // Products
    attachCountListener(collection(db, 'products'), 'totalProducts');
    attachCountListener(
      query(collection(db, 'products'), where('sold', '==', true)),
      'soldProducts'
    );

    return () => unsubscribers.forEach((unsub) => unsub());
  }, []);

  const cards = [
    { title: 'Total Users', value: stats.totalUsers },
    { title: 'Plus Users', value: stats.proUsers },
    { title: 'Pro Users', value: stats.premiumUsers },
    { title: 'Premium Users', value: stats.premiumPlusUsers },
    { title: 'Products Listed', value: stats.totalProducts },
    { title: 'Products Sold', value: stats.soldProducts },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold mb-8">Thrifta Admin Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
        {cards.map((c) => (
          <StatCard key={c.title} title={c.title} value={c.value} />
        ))}
      </div>
    </div>
  );
}