import React from "react";
import ReportCard from "../components/ReportCard";

export default function ReportsOverview({ reportCounts }) {
    return (
        <div className="p-8">
            <h1 className="text-2xl font-semibold mb-8">Admin Reports</h1>
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
        </div>
    );
}
