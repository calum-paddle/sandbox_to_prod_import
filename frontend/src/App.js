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
  const [status, setStatus] = useState('');
  const [discountStatus, setDiscountStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);

  const toggleSelect = (id, setFunc, selectedArray) => {
    setFunc((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  const fetchSandboxItems = async () => {
    if (!sandboxKey) {
      alert('Please enter your Sandbox API key first.');
      return;
    }

    try {
      setLoading(true);
      const config = { headers: { 'Authorization': `Bearer ${sandboxKey}` } };

      const productsRes = await axios.get('http://localhost:8080/products', config);
      setProducts(productsRes.data.result);

      const discountsRes = await axios.get('http://localhost:8080/discounts', config);
      console.log(discountsRes)
      setDiscounts(discountsRes.data.result);

      setDataFetched(true);
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
      sandbox_key: sandboxKey,
      production_key: productionKey,
      test_mode: testMode,
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
      setStatus('❌ Error during migration');
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
                placeholder="Sandbox API Key"
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
                placeholder={testMode ? "Sandbox API Key 2" : "Production API Key"}
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

          <label className="test-mode-toggle">
            <input
              type="checkbox"
              checked={testMode}
              onChange={(e) => setTestMode(e.target.checked)}
            />
            <span>Test Mode (Sandbox ➡️ Sandbox)</span>
          </label>

          <button 
            onClick={fetchSandboxItems} 
            className="primary-button"
            disabled={loading || !sandboxKey}
          >
            {loading ? 'Fetching...' : 'Get Sandbox Items'}
          </button>
        </div>

        {dataFetched && (
          <div className="card">
            {products.length > 0 && (
              <div>
                <h2 className="section-title">Products</h2>
                <p className="section-description">Select the products you want to migrate</p>
                <div className="grid-container">
                  {products.map(({ id, name }) => (
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
                <div className="grid-container">
                  {discounts.map(({ id, name }) => (
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
