import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API } from '../services/api';

function Stock() {
    const [invoices, setInvoices] = useState([]);
    const [filteredInvoices, setFilteredInvoices] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [toast, setToast] = useState({ show: false, message: '', type: '' });
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    useEffect(() => {
        loadInvoices();
    }, []);

    useEffect(() => {
        filterInvoices();
    }, [searchQuery, invoices]);

    const showToast = (message, type = 'error') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast({ show: false, message: '', type: '' });
        }, 3000);
    };

    const loadInvoices = async () => {
        try {
            console.log('Starting to load invoices...'); // Debug log
            const fetchedInvoices = await API.getAllInvoices();
            console.log('Raw response from getAllInvoices:', fetchedInvoices); // Debug log

            if (Array.isArray(fetchedInvoices)) {
                console.log('Successfully fetched invoices array of length:', fetchedInvoices.length);
                setInvoices(fetchedInvoices);
                setFilteredInvoices(fetchedInvoices);
            } else {
                console.error('Fetched invoices is not an array:', typeof fetchedInvoices, fetchedInvoices);
                setInvoices([]);
                setFilteredInvoices([]);
            }
        } catch (error) {
            console.error('Error loading invoices:', error);
            showToast('Error loading invoices');
            setInvoices([]);
            setFilteredInvoices([]);
        }
    };

    const filterInvoices = () => {
        if (!Array.isArray(invoices)) {
            console.log('Invoices is not an array during filtering');
            return;
        }

        const filtered = invoices.filter(invoice => {
            const searchLower = searchQuery.toLowerCase();
            return (
                invoice.invoiceNumber?.toLowerCase().includes(searchLower) ||
                invoice.customerDetails?.name?.toLowerCase().includes(searchLower) ||
                invoice.customerDetails?.mobile?.includes(searchQuery)
            );
        });
        console.log('Filtered invoices:', filtered.length);
        setFilteredInvoices(filtered);
    };

    const handlePrintInvoice = async (invoice) => {
        try {
            await API.printInvoice(invoice);
            showToast('Invoice printed successfully', 'success');
        } catch (error) {
            console.error('Error printing invoice:', error);
            showToast('Error printing invoice');
        }
    };

    const handleViewInvoice = (invoice) => {
        setSelectedInvoice(invoice);
        setIsViewModalOpen(true);
    };

    // View Invoice Modal Component
    const ViewInvoiceModal = ({ invoice, onClose }) => {
        if (!invoice) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold">Invoice Details</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="font-semibold">Invoice Number</p>
                                <p>{invoice.invoiceNumber}</p>
                            </div>
                            <div>
                                <p className="font-semibold">Date</p>
                                <p>{new Date(invoice.date).toLocaleDateString()}</p>
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <h3 className="font-semibold mb-2">Customer Details</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="font-medium">Name</p>
                                    <p>{invoice.customerDetails.name}</p>
                                </div>
                                <div>
                                    <p className="font-medium">Mobile</p>
                                    <p>{invoice.customerDetails.mobile}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="font-medium">Address</p>
                                    <p>{invoice.customerDetails.address}</p>
                                </div>
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <h3 className="font-semibold mb-2">Items</h3>
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead>
                                    <tr>
                                        <th className="text-left">Item</th>
                                        <th className="text-right">Quantity</th>
                                        <th className="text-right">Rate</th>
                                        <th className="text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {invoice.items.map((item, index) => (
                                        <tr key={index}>
                                            <td className="py-2">{item.name}</td>
                                            <td className="text-right">{item.quantity}</td>
                                            <td className="text-right">₹{item.rate}</td>
                                            <td className="text-right">₹{item.total}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="border-t pt-4 text-right">
                            <p className="font-semibold text-lg">Total: ₹{invoice.total}</p>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-4">
                        <button
                            onClick={() => handlePrintInvoice(invoice)}
                            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                        >
                            Print Invoice
                        </button>
                        <button
                            onClick={onClose}
                            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Toast Notification */}
            {toast.show && (
                <div className={`fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 
                    ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}
                    text-white transition-all duration-500 ease-in-out`}>
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Stock & Invoice History</h1>
                <Link to="/" className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg">
                    Back to Home
                </Link>
            </div>

            {/* Search Bar */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
                <div className="p-6">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search by invoice number, customer name, or mobile..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg"
                        />
                        <svg
                            className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Debug Info */}
            <div className="mb-4 p-4 bg-gray-100 rounded">
                <p>Total Invoices: {invoices.length}</p>
                <p>Filtered Invoices: {filteredInvoices.length}</p>
                <p>Search Query: {searchQuery || 'None'}</p>
            </div>

            {/* Invoices Table */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-6">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Invoice #
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Customer
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Mobile
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Amount
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredInvoices.map((invoice) => (
                                    <tr key={invoice.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {invoice.invoiceNumber}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {new Date(invoice.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {invoice.customerDetails.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {invoice.customerDetails.mobile}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            ₹{invoice.total}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <button
                                                onClick={() => handleViewInvoice(invoice)}
                                                className="text-blue-500 hover:text-blue-700 mr-4"
                                            >
                                                View
                                            </button>
                                            <button
                                                onClick={() => handlePrintInvoice(invoice)}
                                                className="text-green-500 hover:text-green-700"
                                            >
                                                Print
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredInvoices.length === 0 && (
                            <div className="text-center py-4 text-gray-500">
                                No invoices found
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* View Invoice Modal */}
            {isViewModalOpen && (
                <ViewInvoiceModal
                    invoice={selectedInvoice}
                    onClose={() => {
                        setIsViewModalOpen(false);
                        setSelectedInvoice(null);
                    }}
                />
            )}
        </div>
    );
}

export default Stock;