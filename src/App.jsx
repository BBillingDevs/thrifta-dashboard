// src/App.jsx
import React, { useEffect, useState } from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

import StatCard from "./components/StatCard";
import ReportCard from "./components/ReportCard";
import UserProductSearch from "./pages/UserProductSearch.jsx";

import ReportsOverview from "./pages/ReportsOverview.jsx";
import UserReports from "./pages/UserReports.jsx";
import ProductReports from "./pages/ProductReports.jsx";
import RatingReports from "./pages/RatingReports.jsx";
import CustomerSupport from "./pages/CustomerSupport.jsx";
import UserManagement from "./pages/UserManagement.jsx";

import Login from "./pages/Login.jsx";

/* ─────────────────────────  layout with nav  ───────────────────────── */
function AdminLayout({ children }) {
    return (
        <div className="min-h-screen p-8 bg-gray-50">
            <nav className="mb-8 flex flex-wrap gap-6 text-sm font-medium">
                <NavLink
                    to="/"
                    end
                    className={({ isActive }) =>
                        isActive ? "text-blue-600" : "text-gray-700 hover:text-blue-600"
                    }
                >
                    Dashboard
                </NavLink>
                <NavLink
                    to="/reports"
                    className={({ isActive }) =>
                        isActive ? "text-blue-600" : "text-gray-700 hover:text-blue-600"
                    }
                >
                    Reports
                </NavLink>
                <NavLink
                    to="/users"
                    className={({ isActive }) =>
                        isActive ? "text-blue-600" : "text-gray-700 hover:text-blue-600"
                    }
                >
                    Users
                </NavLink>
                <NavLink
                    to="/support"
                    className={({ isActive }) =>
                        isActive ? "text-blue-600" : "text-gray-700 hover:text-blue-600"
                    }
                >
                    Support
                </NavLink>
            </nav>

            {children}
        </div>
    );
}

export default function App() {
    /* ───────────────── live dashboard stats ───────────────── */
    const [stats, setStats] = useState({
        totalUsers: 0,
        proUsers: 0,
        premiumUsers: 0,
        premiumPlusUsers: 0,
        totalProducts: 0,
        soldProducts: 0,
    });

    /* ───────────────── report counters ─────────────────────── */
    const [reportCounts, setReportCounts] = useState({
        users: 0,
        products: 0,
        ratings: 0,
    });

    /* ───────────────── Firestore listeners ─────────────────── */
    useEffect(() => {
        const subs = [];

        const track = (refQuery, key, setter) => {
            const u = onSnapshot(refQuery, (snap) =>
                setter((prev) => ({ ...prev, [key]: snap.size })),
            );
            subs.push(u);
        };

        // stats
        track(collection(db, "users"), "totalUsers", setStats);
        track(
            query(
                collection(db, "users"),
                where("subscriptionEntitlementId", "==", "thrifta_pro"),
            ),
            "proUsers",
            setStats,
        );
        track(
            query(
                collection(db, "users"),
                where("subscriptionEntitlementId", "==", "thrifta_premium"),
            ),
            "premiumUsers",
            setStats,
        );
        track(
            query(
                collection(db, "users"),
                where("subscriptionEntitlementId", "==", "thrifta_premium_plus"),
            ),
            "premiumPlusUsers",
            setStats,
        );
        track(collection(db, "products"), "totalProducts", setStats);
        track(
            query(collection(db, "products"), where("sold", "==", true)),
            "soldProducts",
            setStats,
        );

        // report counters
        track(collection(db, "userReports"), "users", setReportCounts);
        track(collection(db, "product_reports"), "products", setReportCounts);
        track(collection(db, "ratingReports"), "ratings", setReportCounts);

        return () => subs.forEach((u) => u());
    }, []);

    /* ───────────────── stat cards for dashboard ────────────── */
    const statCards = [
        { title: "Total Users", value: stats.totalUsers },
        { title: "Plus Users", value: stats.proUsers },
        { title: "Pro Users", value: stats.premiumUsers },
        { title: "Premium Users", value: stats.premiumPlusUsers },
        { title: "Products Listed", value: stats.totalProducts },
        { title: "Products Sold", value: stats.soldProducts },
    ];

    /* ───────────────── routes ──────────────────────────────── */
    return (
        <Routes>
            {/* public */}
            <Route path="/login" element={<Login />} />

            {/* dashboard */}
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <AdminLayout>
                            <h1 className="text-2xl font-bold mb-8">
                                Thrifta Admin Dashboard
                            </h1>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                                {statCards.map((c) => (
                                    <StatCard key={c.title} title={c.title} value={c.value} />
                                ))}
                            </div>

                            <UserProductSearch />

                            <h2 className="text-xl font-semibold mt-12 mb-4">Reports</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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
                        </AdminLayout>
                    </ProtectedRoute>
                }
            />

            {/* reports overview + sub-pages */}
            <Route
                path="/reports"
                element={
                    <ProtectedRoute>
                        <AdminLayout>
                            <ReportsOverview reportCounts={reportCounts} />
                        </AdminLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/reports/users"
                element={
                    <ProtectedRoute>
                        <AdminLayout>
                            <UserReports />
                        </AdminLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/reports/products"
                element={
                    <ProtectedRoute>
                        <AdminLayout>
                            <ProductReports />
                        </AdminLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/reports/ratings"
                element={
                    <ProtectedRoute>
                        <AdminLayout>
                            <RatingReports />
                        </AdminLayout>
                    </ProtectedRoute>
                }
            />

            {/* user management */}
            <Route
                path="/users"
                element={
                    <ProtectedRoute>
                        <AdminLayout>
                            <UserManagement />
                        </AdminLayout>
                    </ProtectedRoute>
                }
            />

            {/* customer support */}
            <Route
                path="/support"
                element={
                    <ProtectedRoute>
                        <AdminLayout>
                            <CustomerSupport />
                        </AdminLayout>
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}
