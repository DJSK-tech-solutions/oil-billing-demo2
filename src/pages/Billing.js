import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API } from '../services/api';

function Billing() {
    const [products, setProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [showCustomerForm, setShowCustomerForm] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [customerSearchQuery, setCustomerSearchQuery] = useState('');
    const [isNewCustomer, setIsNewCustomer] = useState(false);
    const [customerDetails, setCustomerDetails] = useState({
        name: '',
        mobile: '',
        address: ''
    });
    const [toast, setToast] = useState({ show: false, message: '', type: '' });

    useEffect(() => {
        loadProducts();
        loadCustomers();
    }, []);

    useEffect(() => {
        filterProducts();
    }, [searchQuery, products]);

    useEffect(() => {
        filterCustomers();
    }, [customerSearchQuery, customers]);

    const showToast = (message, type = 'error') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast({ show: false, message: '', type: '' });
        }, 3000);
    };

    const loadProducts = async () => {
        try {
            const fetchedProducts = await API.getAllProducts();
            setProducts(fetchedProducts || []);
            setFilteredProducts(fetchedProducts || []);
        } catch (error) {
            console.error('Error loading products:', error);
            showToast('Error loading products');
        }
    };

    const loadCustomers = async () => {
        try {
            const fetchedCustomers = await API.getAllCustomers();
            setCustomers(fetchedCustomers || []);
            setFilteredCustomers(fetchedCustomers || []);
        } catch (error) {
            console.error('Error loading customers:', error);
            showToast('Error loading customers');
        }
    };

    const filterProducts = () => {
        if (!Array.isArray(products)) return;
        const filtered = products.filter(product => {
            if (!product || typeof product.name !== 'string') return false;
            return product.name.toLowerCase().includes(searchQuery.toLowerCase());
        });
        setFilteredProducts(filtered);
    };

    const filterCustomers = () => {
        if (!Array.isArray(customers)) return;
        const filtered = customers.filter(customer => {
            const searchLower = customerSearchQuery.toLowerCase();
            return (
                customer.name?.toLowerCase().includes(searchLower) ||
                customer.mobile?.includes(customerSearchQuery)
            );
        });
        setFilteredCustomers(filtered);
    };

    const handleQuantityChange = (product, change) => {
        setSelectedProducts(prevProducts => {
            const existingProduct = prevProducts.find(p => p.id === product.id);

            if (existingProduct) {
                const newQuantity = Math.max(0, (existingProduct.quantity || 0) + change);
                if (newQuantity === 0) {
                    return prevProducts.filter(p => p.id !== product.id);
                }
                return prevProducts.map(p =>
                    p.id === product.id
                        ? { ...p, quantity: newQuantity, total: newQuantity * p.rate }
                        : p
                );
            } else if (change > 0) {
                return [...prevProducts, {
                    ...product,
                    quantity: 1,
                    total: product.rate
                }];
            }
            return prevProducts;
        });
    };

    const handleMobileChange = (e) => {
        const value = e.target.value.replace(/\D/g, '');
        if (value.length <= 10) {
            setCustomerDetails({ ...customerDetails, mobile: value });
        }
    };

    const handleCustomerSelect = (customer) => {
        setCustomerDetails({
            name: customer.name,
            mobile: customer.mobile,
            address: customer.address
        });
        setCustomerSearchQuery('');
    };

    const validateCustomerForm = () => {
        if (!customerDetails.name.trim()) {
            showToast('Customer name is required');
            return false;
        }
        if (customerDetails.mobile.length !== 10) {
            showToast('Valid mobile number is required');
            return false;
        }
        if (!customerDetails.address.trim()) {
            showToast('Address is required');
            return false;
        }
        return true;
    };

    const calculateTotal = () => {
        return selectedProducts.reduce((sum, product) => sum + (product.total || 0), 0);
    };

    const handleProceed = () => {
        if (selectedProducts.length === 0) {
            showToast('Please select products');
            return;
        }
        setShowCustomerForm(true);
    };

    // const handlePrint = async () => {
    //     if (!validateCustomerForm()) return;

    //     try {
    //         const invoiceData = {
    //             invoiceNumber: generateInvoiceNumber(),
    //             date: new Date(),
    //             customerDetails,
    //             items: selectedProducts,
    //             total: calculateTotal()
    //         };

    //         await API.printInvoice(invoiceData);
    //         showToast('Invoice printed successfully', 'success');

    //         // Reset the form
    //         setSelectedProducts([]);
    //         setCustomerDetails({ name: '', mobile: '', address: '' });
    //         setShowCustomerForm(false);
    //         setIsNewCustomer(false);
    //     } catch (error) {
    //         console.error('Error printing invoice:', error);
    //         showToast('Error printing invoice. Please check printer connection.');
    //     }
    // };

    const handlePrint = async () => {
        if (!validateCustomerForm()) return;
    
        try {
            let customerId;
            if (isNewCustomer) {
                const newCustomer = await API.addCustomer(customerDetails);
                customerId = newCustomer.id;
            } else {
                const existingCustomer = customers.find(c => c.mobile === customerDetails.mobile);
                if (!existingCustomer) throw new Error('Customer not found');
                customerId = existingCustomer.id;
            }
    
            const invoiceData = {
                customerId,
                total: calculateTotal(),
                items: selectedProducts.map(item => ({
                    id: item.id,
                    quantity: item.quantity,
                    rate: item.rate,
                    total: item.total
                }))
            };
    
            const response = await API.createInvoice(invoiceData);
            
            if (!response || !response.invoice) {
                throw new Error('Invalid invoice response');
            }
    
            await API.printInvoice({
                invoiceNumber: response.invoice.invoiceNumber,
                date: response.invoice.date,
                customerDetails,
                items: selectedProducts.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    rate: item.rate,
                    total: item.total
                })),
                total: calculateTotal()
            });
    
            showToast('Invoice created and printed successfully', 'success');
            setSelectedProducts([]);
            setCustomerDetails({ name: '', mobile: '', address: '' });
            setShowCustomerForm(false);
            setIsNewCustomer(false);
    
        } catch (error) {
            console.error('Error processing invoice:', error);
            showToast(error.message || 'Error processing invoice');
        }
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
                <h1 className="text-3xl font-bold text-gray-800">Billing</h1>
                <Link to="/" className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg">
                    Back to Home
                </Link>
            </div>

            {/* Search Products */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
                <div className="p-6">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search products..."
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

                    {/* Product List with Quantity Controls */}
                    <div className="mt-6 space-y-4">
                        {filteredProducts.map(product => (
                            <div key={product.id} className="flex items-center justify-between py-2 border-b">
                                <div>
                                    <div className="font-medium">{product.name}</div>
                                    <div className="text-gray-600">₹{product.rate}</div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => handleQuantityChange(product, -1)}
                                        className="bg-red-500 text-white w-8 h-8 rounded-full"
                                    >
                                        -
                                    </button>
                                    <span className="w-8 text-center">
                                        {selectedProducts.find(p => p.id === product.id)?.quantity || 0}
                                    </span>
                                    <button
                                        onClick={() => handleQuantityChange(product, 1)}
                                        className="bg-green-500 text-white w-8 h-8 rounded-full"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Selected Products Summary */}
            {selectedProducts.length > 0 && (
                <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
                    <div className="p-6">
                        <h2 className="text-xl font-semibold mb-4">Selected Products</h2>
                        <div className="space-y-4">
                            {selectedProducts.map(product => (
                                <div key={product.id} className="flex justify-between items-center">
                                    <div>
                                        <div className="font-medium">{product.name}</div>
                                        <div className="text-sm text-gray-600">
                                            {product.quantity} × ₹{product.rate}
                                        </div>
                                    </div>
                                    <div className="font-medium">₹{product.total}</div>
                                </div>
                            ))}
                            <div className="border-t pt-4 flex justify-between font-bold">
                                <div>Total</div>
                                <div>₹{calculateTotal()}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Customer Details */}
            {showCustomerForm && (
                <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
                    <div className="p-6">
                        <h2 className="text-xl font-semibold mb-4">Customer Details</h2>

                        {/* Customer Search/Select */}
                        {!isNewCustomer && (
                            <div className="mb-6">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Search existing customers..."
                                        value={customerSearchQuery}
                                        onChange={(e) => setCustomerSearchQuery(e.target.value)}
                                        className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg mb-2"
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

                                {/* Customer Search Results */}
                                {customerSearchQuery && (
                                    <div className="border rounded-lg max-h-48 overflow-y-auto mb-4">
                                        {filteredCustomers.map(customer => (
                                            <div
                                                key={customer.id}
                                                onClick={() => handleCustomerSelect(customer)}
                                                className="p-2 hover:bg-gray-100 cursor-pointer border-b"
                                            >
                                                <div className="font-medium">{customer.name}</div>
                                                <div className="text-sm text-gray-600">{customer.mobile}</div>
                                            </div>
                                        ))}
                                        {filteredCustomers.length === 0 && (
                                            <div className="p-2 text-gray-500">No customers found</div>
                                        )}
                                    </div>
                                )}

                                <button
                                    onClick={() => setIsNewCustomer(true)}
                                    className="text-blue-500 hover:text-blue-700 mb-4"
                                >
                                    + Add New Customer
                                </button>
                            </div>
                        )}

                        {/* Customer Form */}
                        {(isNewCustomer || customerDetails.name) && (
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="Customer Name"
                                    value={customerDetails.name}
                                    onChange={(e) => setCustomerDetails({ ...customerDetails, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    required
                                />
                                <input
                                    type="text"
                                    placeholder="Mobile Number (10 digits)"
                                    value={customerDetails.mobile}
                                    onChange={handleMobileChange}
                                    pattern="\d{10}"
                                    maxLength="10"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    required
                                />
                                <textarea
                                    placeholder="Address"
                                    value={customerDetails.address}
                                    onChange={(e) => setCustomerDetails({ ...customerDetails, address: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    rows="3"
                                    required
                                />

                                {isNewCustomer && (
                                    <button
                                        onClick={() => setIsNewCustomer(false)}
                                        className="text-blue-500 hover:text-blue-700"
                                    >
                                        Back to Search
                                    </button>
                                )}

                                <button
                                    onClick={handlePrint}
                                    className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg"
                                >
                                    Generate Invoice
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Proceed Button */}
            {!showCustomerForm && (
                <button
                    onClick={handleProceed}
                    disabled={selectedProducts.length === 0}
                    className={`w-full py-3 rounded-lg text-white font-semibold transition-colors duration-300 ${selectedProducts.length === 0
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-500 hover:bg-blue-600 cursor-pointer'
                        }`}
                >
                    Proceed to Customer Details
                </button>
            )}
        </div>
    );
}

export default Billing;