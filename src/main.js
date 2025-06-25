/**
 * Вычисляет доход от продажи
 * @param sale запись о покупке
 * @param _product данные товара (не используются)
 * @returns {number}
 */
function computeSaleRevenue(sale, _product) {
   return sale.sale_price * sale.quantity * (1 - sale.discount / 100);
}

/**
 * Рассчитывает бонусы продавца
 * @param rank позиция в рейтинге
 * @param count общее число продавцов
 * @param sellerInfo данные продавца
 * @returns {number}
 */
function determineSellerBonus(rank, count, sellerInfo) {
    if(rank === 0) return 0.15 * sellerInfo.profit;
    if(rank <= 2) return 0.1 * sellerInfo.profit;
    if(rank !== count - 1) return 0.05 * sellerInfo.profit;
    return 0;
}

/**
 * Анализирует данные о продажах
 * @param inputData
 * @param config
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function processSalesRecords(inputData, config) {

    if (!inputData || 
        !inputData.sellers?.length || 
        !inputData.customers?.length || 
        !inputData.products?.length || 
        !inputData.purchase_records?.length
    ) {
        throw new Error('Invalid dataset provided');
    }
    
    const { calculateRevenue, calculateBonus } = config;

    if (typeof calculateRevenue !== 'function' || typeof calculateBonus !== 'function') {
        throw new Error("Required calculation methods not supplied");
    }

    const performanceData = inputData.sellers.map(seller => ({
        seller_id: seller.id,
        full_name: `${seller.first_name} ${seller.last_name}`,
        total_revenue: 0,
        net_profit: 0,
        transactions: 0,
        sold_items: {}
     }));

    const sellerMap = {};
    performanceData.forEach(entry => {
        sellerMap[entry.seller_id] = entry;
    });

    const productCatalog = {};
    inputData.products.forEach(item => {
        productCatalog[item.sku] = item;
    });

    for (const transaction of inputData.purchase_records) {
        const seller = sellerMap[transaction.seller_id];
        if (!seller) continue;
        
        seller.transactions += 1;
        seller.total_revenue += transaction.total_amount;

        for (const item of transaction.items) {
            const product = productCatalog[item.sku];
            if (!product) continue;
            
            const itemCost = product.purchase_price * item.quantity;
            const itemRevenue = calculateRevenue(item, product);
            const itemProfit = itemRevenue - itemCost;

            seller.net_profit += itemProfit;

            if (!seller.sold_items[item.sku]) {
                seller.sold_items[item.sku] = 0;
            }
            seller.sold_items[item.sku] += item.quantity;
        }
    }

    performanceData.sort((a, b) => b.net_profit - a.net_profit);

    const sellerCount = performanceData.length;
    performanceData.forEach((seller, position) => {
        seller.incentive = determineSellerBonus(position, sellerCount, seller);
        
        const products = [];
        for (const [sku, qty] of Object.entries(seller.sold_items)) {
            products.push({ sku, quantity: qty });
        }
        products.sort((x, y) => y.quantity - x.quantity);
        seller.featured_products = products.slice(0, 10);
    });

    return performanceData.map(result => ({
        seller_id: result.seller_id,
        name: result.full_name,
        revenue: Number(result.total_revenue.toFixed(2)),
        profit: Number(result.net_profit.toFixed(2)),
        sales_count: result.transactions,
        top_products: result.featured_products,
        bonus: Number(result.incentive.toFixed(2))
    })); 
}
