import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8080;

// Simple CORS setup for local development
app.use(cors());  // This allows all origins in development

app.use(express.json());

// API URLs
// let sandboxUrl = "https://sandbox-api.paddle.com";
// let productionUrl = "https://api.paddle.com";

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    details: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', environment: process.env.NODE_ENV });
});

let sandboxApiKey = ""
let productionApiKey = ""

const productIdMapping = new Map();
const priceIdMapping = new Map();
let discountsToMigrate = {}

const fetchAllProducts = async (apiKey, reverseMode, testMode) => {

  console.log("Fetching API Key: ", apiKey)
  console.log("Reverse Mode: ", reverseMode)
  console.log("Test Mode: ", testMode)

  let fromUrl;
  
  if (reverseMode) {
    fromUrl = "https://api.paddle.com";
  } else if (testMode) {
    fromUrl = "https://sandbox-api.paddle.com";
  } else {
    fromUrl = "https://sandbox-api.paddle.com";
  }

  try {
    // const url = reverseMode ? `${productionUrl}/products` : `${sandboxUrl}/products`;
    console.log("From URL for Products: ", fromUrl)
    const response = await axios.get(`${fromUrl}/products`, {
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

const fetchProductInfo = async (productId, from_key, to_key, fromUrl, toUrl) => {
  try {
    const response = await axios.get(`${fromUrl}/products/${productId}`, {
      headers: {
        Authorization: `Bearer ${from_key}`,
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

    await createProductInProduction(productData, productId, toUrl, to_key, fromUrl, from_key);
    return { product_id: productId, status: "migrated" };
  } catch (error) {
    return { product_id: productId, error: error.response?.data || error.message };
  }
};

const createProductInProduction = async (productData, originalProductId, toUrl, to_key, fromUrl, from_key) => {
  try {
    console.log("Creating Product Using URL: ", toUrl)
    console.log("Creating Product Using APIKey: ", to_key)
    const response = await axios.post(
      `${toUrl}/products`,
      productData,
      {
        headers: { Authorization: `Bearer ${to_key}` }
      }
    );
    productIdMapping.set(originalProductId, response.data.data.id);
    await fetchPrices(originalProductId, response.data.data.id, fromUrl, from_key, toUrl, to_key);
  } catch (error) {
    // console.error('Error creating product in Production Account:', error);
    if (error.response) {
      console.error('❌ Paddle API error status:', error.response.status);
      console.error('❌ Paddle API error data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('❌ Request error:', error);
    }
  }
};

const fetchPrices = async (productId, newProductId, fromUrl, from_key, toUrl, to_key) => {
  console.log("Get Price URL: ", `${fromUrl}/prices`)
  try {
    const response = await axios.get(`${fromUrl}/prices`, {
      params: { product_id: productId },
      headers: {
        Authorization: `Bearer ${from_key}`,
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

      const newPriceId = await createPriceInProduction(priceData, toUrl, to_key);
      priceIdMapping.set(price.id, newPriceId);
    }

    // await fetchDiscounts();
  } catch (error) {
    console.error('Error fetching prices:', error.response?.data || error.message);
  }
};

const createPriceInProduction = async (priceData, toUrl, to_key) => {
  try {
    const response = await axios.post(
      `${toUrl}/prices`,
      priceData,
      {
        headers: { Authorization: `Bearer ${to_key}` }
      }
    );
    return response.data.data.id;
  } catch (error) {
    console.error('Error creating price in Production Account:', error);
  }
};

const fetchAllDiscounts = async (apiKey, reverseMode, testMode) => {
  
  let fromUrl;
  
  if (reverseMode) {
    fromUrl = "https://api.paddle.com";
  } else if (testMode) {
    fromUrl = "https://sandbox-api.paddle.com";
  } else {
    fromUrl = "https://sandbox-api.paddle.com";
  }


  try {
    console.log("From URL for Discounts: ", fromUrl)
    // const url = reverseMode ? `${productionUrl}/discounts` : `${sandboxUrl}/discounts`;
    const response = await axios.get(`${fromUrl}/discounts`, {
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


const fetchDiscountInfo = async (discountId, fromUrl, from_key, toUrl, to_key) => {
  try {
    const response = await axios.get(`${fromUrl}/discounts/${discountId}`, {
      headers: {
        Authorization: `Bearer ${from_key}`,
        'Content-Type': 'application/json',
      },
    });

    const discount = response.data.data;
    console.log('Original discount:', {
      id: discountId,
      restrict_to: discount.restrict_to
    });

    // Map the restrict_to IDs, only keeping successfully mapped ones
    let mappedRestrictTo = [];
    
    if (discount.restrict_to) {
      mappedRestrictTo = discount.restrict_to
        .map(originalId => {
          const mappedId = originalId.startsWith('pro') 
            ? productIdMapping.get(originalId)
            : originalId.startsWith('pri')
              ? priceIdMapping.get(originalId)
              : null;
          console.log(`Mapping ${originalId} to ${mappedId}`);
          return mappedId;
        })
        .filter(id => id != null); // Remove both null and undefined values
    }

    console.log('Mapped restrict_to:', mappedRestrictTo);

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
      // If original had restrict_to but no valid mappings found, set to null
      restrict_to: discount.restrict_to ? (mappedRestrictTo.length > 0 ? mappedRestrictTo : null) : undefined,
      ...(discount.expires_at && { expires_at: discount.expires_at }),
      ...(discount.custom_data && { custom_data: discount.custom_data }),
    };

    console.log('Final discount data:', {
      id: discountId,
      restrict_to: discountData.restrict_to
    });

    await createDiscountInProduction(discountData, toUrl, to_key);
    return { discount_id: discountId, status: "migrated" };
    
  } catch (error) {
    console.error('Error creating discount in Production Account:', error);
    return { discount_id: discountId, error: error.response?.data || error.message };
  }
};

const createDiscountInProduction = async (discountData, toUrl, to_key) => {
  try {
    const response = await axios.post(
      `${toUrl}/discounts`,
      discountData,
      {
        headers: { Authorization: `Bearer ${to_key}` }
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
  
  // console.log(req.headers.authorization)
  // console.log(req.query.reverseMode)
  const reverseMode = req.query.reverseMode === 'true';
  const testMode = req.query.testMode === 'true';

  const apiKey = req.headers.authorization;

  if (!apiKey) {
    return res.status(401).json({ error: 'Missing or invalid API key' });
  }

  try {
    const result = await fetchAllProducts(apiKey, reverseMode, testMode); 
    res.json({ result }); 
  } catch (err) {
    console.error('Failed to fetch products:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/discounts', async (req, res) => {

  const reverseMode = req.query.reverseMode === 'true';
  const testMode = req.query.testMode === 'true';
  const apiKey = req.headers.authorization;


  if (!apiKey) {
    return res.status(401).json({ error: 'Missing or invalid API key' });
  }

  try {
    const result = await fetchAllDiscounts(apiKey, reverseMode, testMode); 
    res.json({ result }); 
  } catch (err) {
    console.error('Failed to fetch discounts:', err);
    res.status(500).json({ error: 'Failed to fetch discounts' });
  }
});


app.post('/migrate_products', async (req, res) => {
  const { product_ids, from_key, to_key, testMode, reverseMode } = req.body;

  console.log("Migrating Products")
  console.log('Test mode:', testMode);
  console.log('Reverse mode:', reverseMode);
  console.log('Using first key:', from_key);
  console.log('Using second key:', to_key);

  let fromUrl;
  let toUrl;
  
  if (reverseMode) {
    fromUrl = "https://api.paddle.com";
    toUrl = "https://sandbox-api.paddle.com"
  } else if (testMode) {
    fromUrl = "https://sandbox-api.paddle.com";
    toUrl = "https://sandbox-api.paddle.com"
  } else {
    fromUrl = "https://sandbox-api.paddle.com";
    toUrl = "https://api.paddle.com"
  }

  // sandboxApiKey = from_key;
  // productionApiKey = to_key;
  // if (test_mode) {
  //   productionUrl = sandboxUrl;
  // }

  // if (reverse_mode) {
  //   sandboxUrl = "https://api.paddle.com"
  //   productionUrl = "https://sandbox-api.paddle.com"

  // }
  
  if (!Array.isArray(product_ids) || product_ids.length === 0) {
    return res.status(400).json({ error: "Missing or invalid product_ids array." });
  }

  const results = [];

  for (const productId of product_ids) {
    const result = await fetchProductInfo(productId, from_key, to_key, fromUrl, toUrl);
    results.push(result);
  }

  res.json({ message: 'Product migration completed', results });
});

app.post('/migrate_discounts', async (req, res) => {
  const { discount_ids, from_key, to_key, testMode, reverseMode } = req.body;

  console.log("Migrating Discounts")
  console.log('Test mode:', testMode);
  console.log('Reverse mode:', reverseMode);
  console.log('Using first key:', from_key);
  console.log('Using second key:', to_key);

  let fromUrl;
  let toUrl;
  
  if (reverseMode) {
    fromUrl = "https://api.paddle.com";
    toUrl = "https://sandbox-api.paddle.com"
  } else if (testMode) {
    fromUrl = "https://sandbox-api.paddle.com";
    toUrl = "https://sandbox-api.paddle.com"
  } else {
    fromUrl = "https://sandbox-api.paddle.com";
    toUrl = "https://api.paddle.com"
  }

  // sandboxApiKey = sandbox_key;
  // productionApiKey = production_key;
  // if (test_mode) {
  //   productionUrl = sandboxUrl;
  // }

  if (!Array.isArray(discount_ids) || discount_ids.length === 0) {
    return res.status(400).json({ error: "Missing or invalid discount_ids array." });
  }

  const results = [];

  for (const discountId of discount_ids) {
    console.log(discountId);
    const result = await fetchDiscountInfo(discountId, fromUrl, from_key, toUrl, to_key);
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
