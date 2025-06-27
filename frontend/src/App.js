import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [selectedDiscounts, setSelectedDiscounts] = useState([]);
  const [sandboxKey, setSandboxKey] = useState('');
  const [productionKey, setProductionKey] = useState('');
  const [sandboxKeyVisible, setSandboxKeyVisible] = useState(false);
  const [productionKeyVisible, setProductionKeyVisible] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [reverseMode, setReverseMode] = useState(false);
  const [status, setStatus] = useState('');
  const [discountStatus, setDiscountStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  
  // Pagination states
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [productPage, setProductPage] = useState(1);
  const [discountPage, setDiscountPage] = useState(1);

  const toggleSelect = (id, setFunc, selectedArray) => {
    setFunc((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (items, setFunc, currentSelected) => {
    if (currentSelected.length === items.length) {
      setFunc([]); // Deselect all
    } else {
      setFunc(items.map(item => item.id)); // Select all
    }
  };

  // Pagination helpers
  const getPageItems = (items, page, perPage) => {
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return items.slice(start, end);
  };

  const PageControls = ({ items, page, setPage, perPage, type, selectedItems, onSelectAll }) => {
    const totalPages = Math.ceil(items.length / perPage);
    
    return (
      <div className="pagination-controls">
        <div className="pagination-left">
          <select 
            value={perPage} 
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setPage(1); // Reset to first page when changing items per page
            }}
            className="items-per-page"
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>

          <label className="select-all-toggle">
            <input
              type="checkbox"
              checked={selectedItems.length === items.length}
              onChange={onSelectAll}
            />
            <span>Select All {type}</span>
          </label>
        </div>
        
        <div className="page-buttons">
          <button 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="page-button"
          >
            Previous
          </button>
          <span className="page-info">
            Page {page} of {totalPages}
          </span>
          <button 
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="page-button"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  const fetchItems = async () => {
    if (!sandboxKey) {
      alert('Please enter your API key first.');
      return;
    }
    try {
      setLoading(true);
      const config = { headers: { 'Authorization': `Bearer ${sandboxKey}` } };

      const productsRes = await axios.get('http://localhost:8080/products', {
        ...config,
        params: { 
          reverseMode,
          testMode
        }
      });
      setProducts(productsRes.data.result);

      const discountsRes = await axios.get('http://localhost:8080/discounts', {
        ...config,
        params: { 
          reverseMode,
          testMode
        }
      });
      setDiscounts(discountsRes.data.result);

      setDataFetched(true);
      // Reset pagination when fetching new data
      setProductPage(1);
      setDiscountPage(1);
    } catch (error) {
      console.error('Error fetching sandbox data:', error);
      alert('Failed to fetch data. Check your API key or backend server.');
    } finally {
      setLoading(false);
    }
  };

  const handleMigrate = async () => {
    if (selected.length === 0 && selectedDiscounts.length === 0) return;

    setLoading(true);
    const payload = {
      from_key: sandboxKey,
      to_key: productionKey,
      testMode: testMode,
      reverseMode: reverseMode
    };

    try {
      if (selected.length > 0) {
        setStatus('Migrating selected products...');
        const res = await axios.post('http://localhost:8080/migrate_products', {
          ...payload,
          product_ids: selected,
        });
        setStatus(`✅ ${res.data.message}`);
      }

      if (selectedDiscounts.length > 0) {
        setDiscountStatus('Migrating selected discounts...');
        const res = await axios.post('http://localhost:8080/migrate_discounts', {
          ...payload,
          discount_ids: selectedDiscounts,
        });
        setDiscountStatus(`✅ ${res.data.message}`);
      }
    } catch (error) {
      console.error('Migration error:', error);
      const errorMessage = error.response?.data?.error || error.message;
      if (selected.length > 0) {
        setStatus(`❌ Error during product migration: ${errorMessage}`);
      }
      if (selectedDiscounts.length > 0) {
        setDiscountStatus(`❌ Error during discount migration: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <div className="paddle-logo">paddle</div>
      
      <div className="max-w-4xl mx-auto">
        <h1 className="heading">Sandbox to Production Migration</h1>

        <div className="card">
          <div className="api-inputs">
            <div className="input-group">
              <input
                type={sandboxKeyVisible ? "text" : "password"}
                placeholder={reverseMode ? "Production API Key" : "Sandbox API Key"}
                value={sandboxKey}
                onChange={(e) => setSandboxKey(e.target.value)}
              />
              <button 
                className="visibility-toggle"
                onClick={() => setSandboxKeyVisible(!sandboxKeyVisible)}
                type="button"
              >
                {sandboxKeyVisible ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
            <div className="input-group">
              <input
                type={productionKeyVisible ? "text" : "password"}
                placeholder={reverseMode ? "Sandbox API Key" : (testMode ? "Sandbox API Key 2" : "Production API Key")}
                value={productionKey}
                onChange={(e) => setProductionKey(e.target.value)}
              />
              <button 
                className="visibility-toggle"
                onClick={() => setProductionKeyVisible(!productionKeyVisible)}
                type="button"
              >
                {productionKeyVisible ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          <label className="normal-mode-toggle">
            <input
              type="radio"
              name="mode"
              checked={!testMode && !reverseMode}
              onChange={(e) => {
                if (e.target.checked) {
                  setTestMode(false);
                  setReverseMode(false);
                }
              }}
            />
            <span>Normal Mode (Sandbox ➡️ Production)</span>
          </label>

          <label className="test-mode-toggle">
            <input
              type="radio"
              name="mode"
              checked={testMode}
              onChange={(e) => {
                setTestMode(e.target.checked);
                if (e.target.checked) {
                  setReverseMode(false);
                }
              }}
            />
            <span>Test Mode (Sandbox ➡️ Sandbox)</span>
          </label>

          <label className="reverse-mode-toggle">
            <input
              type="radio"
              name="mode"
              checked={reverseMode}
              onChange={(e) => {
                setReverseMode(e.target.checked);
                if (e.target.checked) {
                  setTestMode(false);
                }
              }}
            />
            <span>Reverse Mode (Production ➡️ Sandbox)</span>
          </label>

          <button 
            onClick={fetchItems} 
            className="primary-button"
            disabled={loading || !sandboxKey}
          >
            {loading ? 'Fetching...' : (reverseMode ? 'Get Production Items' : 'Get Sandbox Items')}
          </button>
        </div>

        {dataFetched && (
          <div className="card">
            {products.length > 0 && (
              <div>
                <h2 className="section-title">Products</h2>
                <p className="section-description">Select the products you want to migrate</p>
                <PageControls 
                  items={products}
                  page={productPage}
                  setPage={setProductPage}
                  perPage={itemsPerPage}
                  type="Products"
                  selectedItems={selected}
                  onSelectAll={() => toggleSelectAll(products, setSelected, selected)}
                />
                <div className="grid-container">
                  {getPageItems(products, productPage, itemsPerPage).map(({ id, name }) => (
                    <button
                      key={id}
                      onClick={() => toggleSelect(id, setSelected, selected)}
                      className={`item-button ${selected.includes(id) ? 'selected' : ''}`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {discounts.length > 0 && (
              <div>
                <h2 className="section-title">Discounts</h2>
                <p className="section-description">Select the discounts you want to migrate</p>
                <PageControls 
                  items={discounts}
                  page={discountPage}
                  setPage={setDiscountPage}
                  perPage={itemsPerPage}
                  type="Discounts"
                  selectedItems={selectedDiscounts}
                  onSelectAll={() => toggleSelectAll(discounts, setSelectedDiscounts, selectedDiscounts)}
                />
                <div className="grid-container">
                  {getPageItems(discounts, discountPage, itemsPerPage).map(({ id, name }) => (
                    <button
                      key={id}
                      onClick={() => toggleSelect(id, setSelectedDiscounts, selectedDiscounts)}
                      className={`item-button ${selectedDiscounts.includes(id) ? 'selected' : ''}`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleMigrate}
              disabled={loading || (selected.length === 0 && selectedDiscounts.length === 0)}
              className="primary-button"
            >
              {loading ? 'Migrating...' : `Migrate Selected Items (${selected.length + selectedDiscounts.length})`}
            </button>

            {(status || discountStatus) && (
              <div className="mt-6 space-y-2">
                {status && <p className="status">{status}</p>}
                {discountStatus && <p className="status">{discountStatus}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
