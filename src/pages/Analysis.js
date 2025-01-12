import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API } from '../services/api';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function Analysis() {
   const [metrics, setMetrics] = useState({
       currentMonthRevenue: 0,
       lastMonthRevenue: 0,
       currentYearRevenue: 0,
       lastYearRevenue: 0,
       totalCustomers: 0,
       newCustomersThisMonth: 0,
       totalProducts: 0,
       topSellingProducts: [],
       monthlyRevenue: [],
       productSalesData: []
   });
   const [loading, setLoading] = useState(true);

   useEffect(() => {
       loadAnalytics();
   }, []);

   const loadAnalytics = async () => {
       try {
           setLoading(true);
           const data = await API.getAnalytics();
           setMetrics({
               ...metrics,
               ...data,
               monthlyRevenue: data.monthlyRevenue || [],
               productSalesData: data.productSalesData || [],
               topSellingProducts: data.topSellingProducts || []
           });
       } catch (error) {
           console.error('Error loading analytics:', error);
       } finally {
           setLoading(false);
       }
   };

   const formatCurrency = (value) => {
       return new Intl.NumberFormat('en-IN', {
           style: 'currency',
           currency: 'INR'
       }).format(value);
   };

   if (loading) {
       return (
           <div className="flex justify-center items-center h-screen">
               <div className="text-xl">Loading analytics...</div>
           </div>
       );
   }

   return (
       <div className="container mx-auto px-4 py-8">
           <div className="flex justify-between items-center mb-8">
               <h1 className="text-3xl font-bold text-gray-800">Business Analytics</h1>
               <Link to="/" className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg">
                   Back to Home
               </Link>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
               <div className="bg-white rounded-xl shadow-md p-6">
                   <h3 className="text-lg font-semibold mb-2">This Month</h3>
                   <p className="text-3xl font-bold text-blue-600">{formatCurrency(metrics.currentMonthRevenue)}</p>
                   <p className="text-sm text-gray-500">
                       vs {formatCurrency(metrics.lastMonthRevenue)} last month
                   </p>
               </div>

               <div className="bg-white rounded-xl shadow-md p-6">
                   <h3 className="text-lg font-semibold mb-2">This Year</h3>
                   <p className="text-3xl font-bold text-green-600">{formatCurrency(metrics.currentYearRevenue)}</p>
                   <p className="text-sm text-gray-500">
                       vs {formatCurrency(metrics.lastYearRevenue)} last year
                   </p>
               </div>

               <div className="bg-white rounded-xl shadow-md p-6">
                   <h3 className="text-lg font-semibold mb-2">Customers</h3>
                   <p className="text-3xl font-bold text-purple-600">{metrics.totalCustomers}</p>
                   <p className="text-sm text-gray-500">
                       {metrics.newCustomersThisMonth} new this month
                   </p>
               </div>

               <div className="bg-white rounded-xl shadow-md p-6">
                   <h3 className="text-lg font-semibold mb-2">Products</h3>
                   <p className="text-3xl font-bold text-orange-600">{metrics.totalProducts}</p>
                   <p className="text-sm text-gray-500">Total products in inventory</p>
               </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
               <div className="bg-white rounded-xl shadow-md p-6">
                   <h2 className="text-xl font-semibold mb-4">Monthly Revenue Trend</h2>
                   <div className="h-80">
                       <ResponsiveContainer width="100%" height="100%">
                           <LineChart data={metrics.monthlyRevenue || []}>
                               <CartesianGrid strokeDasharray="3 3" />
                               <XAxis dataKey="month" />
                               <YAxis />
                               <Tooltip formatter={(value) => formatCurrency(value)} />
                               <Legend />
                               <Line 
                                   type="monotone" 
                                   dataKey="revenue" 
                                   name="Revenue"
                                   stroke="#3B82F6" 
                                   strokeWidth={2}
                                   dot={{ r: 4 }}
                               />
                           </LineChart>
                       </ResponsiveContainer>
                   </div>
               </div>

               <div className="bg-white rounded-xl shadow-md p-6">
                   <h2 className="text-xl font-semibold mb-4">Product Sales</h2>
                   <div className="h-80">
                       <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={metrics.productSalesData || []}>
                               <CartesianGrid strokeDasharray="3 3" />
                               <XAxis dataKey="name" />
                               <YAxis />
                               <Tooltip />
                               <Legend />
                               <Bar dataKey="quantity" name="Units Sold" fill="#8B5CF6" />
                           </BarChart>
                       </ResponsiveContainer>
                   </div>
               </div>
           </div>

           <div className="bg-white rounded-xl shadow-md p-6">
               <h2 className="text-xl font-semibold mb-4">Top Selling Products</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {(metrics.topSellingProducts || []).map((product) => (
                       <div 
                           key={product.ProductId}
                           className="flex items-center justify-between p-4 border rounded-lg"
                       >
                           <div>
                               <h3 className="font-medium">{product.Product?.name}</h3>
                               <p className="text-sm text-gray-500">{product.totalSold} units sold</p>
                           </div>
                           <div className="text-lg font-semibold text-blue-600">
                               {formatCurrency(product.totalRevenue)}
                           </div>
                       </div>
                   ))}
               </div>
           </div>
       </div>
   );
}

export default Analysis;