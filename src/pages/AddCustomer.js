import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API } from '../services/api';

function AddCustomer() {
    const [customers, setCustomers] = useState([]);
    const [newCustomer, setNewCustomer] = useState({ name: '', mobile: '', address: '' });
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [toast, setToast] = useState({ show: false, message: '', type: '' });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState({ show: false, id: null });

    useEffect(() => {
        loadCustomers();
    }, []);

    useEffect(() => {
        filterCustomers();
    }, [searchQuery, customers]);

    const showToast = (message, type = 'error') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast({ show: false, message: '', type: '' });
        }, 3000);
    };

    const loadCustomers = async () => {
        try {
            const fetchedCustomers = await API.getAllCustomers();
            console.log('Fetched customers:', fetchedCustomers);
            setCustomers(fetchedCustomers || []);
            setFilteredCustomers(fetchedCustomers || []);
        } catch (error) {
            console.error('Error loading customers:', error);
            setCustomers([]);
            setFilteredCustomers([]);
            showToast('Error loading customers');
        }
    };

    const handleMobileChange = (e) => {
        const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
        if (value.length <= 10) { // Only update if length is 10 or less
            setNewCustomer({ ...newCustomer, mobile: value });
        }
    };

    const validateForm = () => {
        if (newCustomer.mobile.length !== 10) {
            showToast('Mobile number must be 10 digits');
            return false;
        }
        if (!newCustomer.name.trim()) {
            showToast('Name is required');
            return false;
        }
        if (!newCustomer.address.trim()) {
            showToast('Address is required');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            if (editingCustomer) {
                await API.updateCustomer(editingCustomer.id, {
                    name: newCustomer.name.trim(),
                    mobile: newCustomer.mobile,
                    address: newCustomer.address.trim()
                });
                setEditingCustomer(null);
                showToast('Customer updated successfully', 'success');
            } else {
                await API.addCustomer({
                    name: newCustomer.name.trim(),
                    mobile: newCustomer.mobile,
                    address: newCustomer.address.trim()
                });
                showToast('Customer added successfully', 'success');
            }
            setNewCustomer({ name: '', mobile: '', address: '' });
            loadCustomers();
        } catch (error) {
            console.error('Error saving customer:', error);
            showToast(error.message || 'Error saving customer');
        }
    };

    const handleDeleteClick = (id) => {
        setShowDeleteConfirm({ show: true, id });
        setTimeout(() => {
            setShowDeleteConfirm({ show: false, id: null });
        }, 3000);
    };

    const handleDelete = async (id) => {
        try {
            await API.deleteCustomer(id);
            loadCustomers();
            showToast('Customer deleted successfully', 'success');
            setShowDeleteConfirm({ show: false, id: null });
        } catch (error) {
            console.error('Error deleting customer:', error);
            showToast('Error deleting customer');
        }
    };

    const handleEdit = (customer) => {
        setEditingCustomer(customer);
        setNewCustomer({
            name: customer.name || '',
            mobile: customer.mobile || '',
            address: customer.address || ''
        });
    };

    const filterCustomers = () => {
        if (!Array.isArray(customers)) return;

        const filtered = customers.filter(customer => {
            if (!customer) return false;
            const searchLower = searchQuery.toLowerCase();
            return (
                customer.name?.toLowerCase().includes(searchLower) ||
                customer.mobile?.includes(searchQuery)
            );
        });
        setFilteredCustomers(filtered);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Toast Notification */}
            {toast.show && (
                <div
                    className={`fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                        } text-white transition-all duration-500 ease-in-out`}
                >
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Add Customer</h1>
                <Link
                    to="/"
                    className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors duration-200"
                >
                    Back to Home
                </Link>
            </div>

            {/* Add/Edit Customer Form */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
                <div className="p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">
                        {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                type="text"
                                placeholder="Customer Name"
                                value={newCustomer.name}
                                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                            <input
                                type="text"
                                placeholder="Mobile Number (10 digits)"
                                value={newCustomer.mobile}
                                onChange={handleMobileChange}
                                pattern="\d{10}"
                                maxLength="10"
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <textarea
                            placeholder="Address"
                            value={newCustomer.address}
                            onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows="3"
                            required
                        />
                        <button
                            type="submit"
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors duration-200"
                        >
                            {editingCustomer ? 'Update' : 'Add'} Customer
                        </button>
                    </form>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
                <div className="p-6">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search customers by name or mobile..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <svg
                            className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Customer List */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-6">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Customer Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Mobile
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Address
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {Array.isArray(filteredCustomers) && filteredCustomers
                                    .filter(customer => customer && customer.id)
                                    .map((customer) => (
                                        <tr key={`customer-${customer.id}`}>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                                                {customer.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                                                {customer.mobile}
                                            </td>
                                            <td className="px-6 py-4 text-gray-700">
                                                {customer.address}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => handleEdit(customer)}
                                                    className="text-blue-500 hover:text-blue-700 mr-4 transition-colors duration-200"
                                                >
                                                    Edit
                                                </button>
                                                {showDeleteConfirm.show && showDeleteConfirm.id === customer.id ? (
                                                    <button
                                                        onClick={() => handleDelete(customer.id)}
                                                        className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition-colors duration-200"
                                                    >
                                                        Confirm Delete
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleDeleteClick(customer.id)}
                                                        className="text-red-500 hover:text-red-700 transition-colors duration-200"
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                {(!Array.isArray(filteredCustomers) || filteredCustomers.length === 0) && (
                                    <tr key="no-customers-found">
                                        <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                                            No customers found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AddCustomer;