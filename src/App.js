import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Billing from './pages/Billing';
import AddProduct from './pages/AddProduct';
import Stock from './pages/Stock';
import Analysis from './pages/Analysis';
import AddCustomer from './pages/AddCustomer';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/add-product" element={<AddProduct />} />
          <Route path="/stock" element={<Stock />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/add-customer" element={<AddCustomer />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;