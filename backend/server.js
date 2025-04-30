import 'dotenv/config';
import express from 'express';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 8080;
import cors from 'cors';

app.use(cors({
  origin: 'http://localhost:3000', // your React dev server
}));

app.use(express.json());

const sandboxUrl = "https://sandbox-api.paddle.com";
let productionUrl = "https://api.paddle.com";


let sandboxApiKey = ""
let productionApiKey = ""

const productIdMapping = new Map();
const priceIdMapping = new Map();
let discountsToMigrate = {}

const fetchAllProducts = async (apiKey) => {
  try {
    const response = await axios.get(`${sandboxUrl}/products`, {
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
      },
    });

    // Create an array of products with both id and name
    const listOfProducts = response.data.data.map(product => ({
      id: product.id,
      name: product.name,
    }));

    return listOfProducts;
  } catch (error) {
    return { error: error.response?.data || error.message };
  }
};

const fetchProductInfo = async (productId) => {
  try {
    const response = await axios.get(`${sandboxUrl}/products/${productId}`, {
      headers: {
        Authorization: `Bearer ${sandboxApiKey}`,
        'Content-Type': 'application/json',
      },
    });
    const base = response.data.data;

    const productData = {
      name: base.name,
      tax_category: base.tax_category,
      type: base.type,
      ...(base.description && { description: base.description }),
      ...(base.image_url && { image_url: base.image_url }),
      ...(base.custom_data && { custom_data: base.custom_data })
    };

    await createProductInProduction(productData, productId);
    return { product_id: productId, status: "migrated" };
  } catch (error) {
    return { product_id: productId, error: error.response?.data || error.message };
  }
};

const createProductInProduction = async (productData, originalProductId) => {
  try {
    const response = await axios.post(
      `${productionUrl}/products`,
      productData,
      {
        headers: { Authorization: `Bearer ${productionApiKey}` }
      }
    );
    productIdMapping.set(originalProductId, response.data.data.id);
    await fetchPrices(originalProductId, response.data.data.id);
  } catch (error) {
    console.error('Error creating product in Production Account:', error);
  }
};

const fetchPrices = async (productId, newProductId) => {
  try {
    const response = await axios.get(`${sandboxUrl}/prices`, {
      params: { product_id: productId },
      headers: {
        Authorization: `Bearer ${sandboxApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const base = response.data.data;
    for (const price of base) {
      const priceData = {
        description: price.description,
        product_id: newProductId,
        unit_price: price.unit_price,
        type: price.type,
        name: price.name,
        ...(price.billing_cycle && { billing_cycle: price.billing_cycle }),
        ...(price.trial_period && { trial_period: price.trial_period }),
        tax_mode: price.tax_mode,
        ...(Array.isArray(price.unit_price_overrides) && price.unit_price_overrides.length > 0 && {
          unit_price_overrides: price.unit_price_overrides.map(override => ({
            country_codes: override.country_codes,
            unit_price: override.unit_price
          }))
        }),
        ...(price.quantity && { quantity: price.quantity }),
        ...(price.custom_data && { custom_data: price.custom_data }),
      };

      const newPriceId = await createPriceInProduction(priceData);
      priceIdMapping.set(price.id, newPriceId);
    }

    // await fetchDiscounts();
  } catch (error) {
    console.error('Error fetching prices:', error.response?.data || error.message);
  }
};

const createPriceInProduction = async (priceData) => {
  try {
    const response = await axios.post(
      `${productionUrl}/prices`,
      priceData,
      {
        headers: { Authorization: `Bearer ${productionApiKey}` }
      }
    );
    return response.data.data.id;
  } catch (error) {
    console.error('Error creating price in Production Account:', error);
  }
};

const fetchAllDiscounts = async (apiKey) => {
  try {
    const response = await axios.get(`${sandboxUrl}/discounts`, {
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
      },
    });
    
    // Create an array of discounts with both id and name
    const listOfDiscounts = response.data.data.map(discount => ({
      id: discount.id,
      name: discount.description,
    }));
    // console.log(listOfDiscounts)
    return listOfDiscounts;
  } catch (error) {
    return { error: error.response?.data || error.message };
  }
};


const fetchDiscountInfo = async (discountId) => {
  try {
    const response = await axios.get(`${sandboxUrl}/discounts/${discountId}`, {
      headers: {
        Authorization: `Bearer ${sandboxApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const discount = response.data.data;

    const discountData = {
      amount: discount.amount,
      description: discount.description,
      type: discount.type,
      enabled_for_checkout: discount.enabled_for_checkout,
      ...(discount.code && { code: discount.code }),
      ...(discount.currency_code && { currency_code: discount.currency_code }),
      recur: discount.recur,
      ...(discount.maximum_recurring_intervals && { maximum_recurring_intervals: discount.maximum_recurring_intervals }),
      ...(discount.usage_limit && { usage_limit: discount.usage_limit }),
      restrict_to: discount.restrict_to?.map(originalId => {
        if (originalId.startsWith('pro')) {
          return productIdMapping.get(originalId) || originalId;
        } else if (originalId.startsWith('pri')) {
          return priceIdMapping.get(originalId) || originalId;
        }
        return originalId;
      }),
      ...(discount.expires_at && { expires_at: discount.expires_at }),
      ...(discount.custom_data && { custom_data: discount.custom_data }),
    };

      await createDiscountInProduction(discountData);
    
  } catch (error) {
    console.error('Error fetching discounts:', error.response?.data || error.message);
  }
};

const createDiscountInProduction = async (discountData) => {
  try {
    const response = await axios.post(
      `${productionUrl}/discounts`,
      discountData,
      {
        headers: { Authorization: `Bearer ${productionApiKey}` }
      }
    );
  } catch (error) {
    console.error('Error creating discount in Production Account:', error);
  }
};

//
// --- Express Routes ---
//

app.get('/products', async (req, res) => {
  const apiKey = req.headers.authorization;
  if (!apiKey) {
    return res.status(401).json({ error: 'Missing or invalid API key' });
  }

  try {
    const result = await fetchAllProducts(apiKey); 
    res.json({ result }); 
  } catch (err) {
    console.error('Failed to fetch products:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/discounts', async (req, res) => {
  const apiKey = req.headers.authorization;

  if (!apiKey) {
    return res.status(401).json({ error: 'Missing or invalid API key' });
  }

  try {
    const result = await fetchAllDiscounts(apiKey); 
    res.json({ result }); 
  } catch (err) {
    console.error('Failed to fetch discounts:', err);
    res.status(500).json({ error: 'Failed to fetch discounts' });
  }
});


app.post('/migrate_products', async (req, res) => {

  const { product_ids, sandbox_key, production_key, test_mode } = req.body;

  console.log('Test mode:', test_mode);
  console.log('Using sandbox key:', sandbox_key);
  console.log('Using production key:', production_key);

  sandboxApiKey = sandbox_key
  productionApiKey = production_key
  if (test_mode) {
    productionUrl = sandboxUrl;
  }
  if (!Array.isArray(product_ids) || product_ids.length === 0) {
    return res.status(400).json({ error: "Missing or invalid product_ids array." });
  }

  const results = [];

  for (const productId of product_ids) {
    const result = await fetchProductInfo(productId);
    results.push(result);
  }

  res.json({ message: 'Product migration completed', results });
});

app.post('/migrate_discounts', async (req, res) => {
  const { discount_ids } = req.body;

  if (!Array.isArray(discount_ids) || discount_ids.length === 0) {
    return res.status(400).json({ error: "Missing or invalid discount_ids array." });
  }

  const results = [];

  for (const discountId of discount_ids) {
    console.log(discountId)
    const result = await fetchDiscountInfo(discountId);
    results.push(result);
  }

  res.json({ message: 'Discount migration completed', results });
});

//
// --- Start Server ---
//

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
