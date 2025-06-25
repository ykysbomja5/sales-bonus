/**
 * Функция для расчета прибыли
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
   return purchase.sale_price * purchase.quantity * (1 - purchase.discount / 100);
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;
    let bonusIndex = 0;
    if(index === 0) bonusIndex = 0.15;
    else if (index === 1 || index === 2) bonusIndex = 0.1;
    else if (index + 1 !== total) bonusIndex = 0.05;
    return bonusIndex * profit;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {

    if (!data
        || data.sellers.length === 0 || data.customers.length === 0
        || data.products.length === 0 || data.purchase_records.length === 0
    ) {
        throw new Error('Incorrect input data');
    }
    
    const { calculateRevenue, calculateBonus } = options;

    if (!calculateRevenue || !calculateBonus) {
        throw new Error("Functions weren't provided");
    }

    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
     }));

    const sellerIndex = sellerStats.reduce((result, item) => ({
        ...result,
        [item.id]: item
    }), {}); 

    const productIndex = data.products.reduce((result, item) => ({
        ...result,
        [item.sku]: item
    }), {}); 

    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        if(seller) {
            seller.sales_count += 1;
            seller.revenue += record.total_amount;
        }

        record.items.forEach(item => {
            const product = productIndex[item.sku];
            const cost = product.purchase_price * item.quantity;
            const revenue = calculateRevenue(item);
            const profit = revenue - cost;

            seller.profit += profit;

            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    sellerStats.sort((a,b) => b.profit - a.profit);

    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonusByProfit(index, sellerStats.length, seller);
        let soldProducts = Object.entries(seller.products_sold).map(([sku, quantity]) => ({ sku, quantity })).sort((a,b) => b.quantity - a.quantity);
        if(soldProducts.length > 10) soldProducts = soldProducts.slice(0,10);
        seller.top_products = soldProducts;
    });

    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
    })); 
}
