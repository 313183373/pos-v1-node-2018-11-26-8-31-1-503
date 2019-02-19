const {loadAllItems, loadPromotions} = require('./datbase');
const BUY_TWO_GET_ONE_FREE = "BUY_TWO_GET_ONE_FREE";

function buildItemList(inputs) {
    return inputs.reduce((itemList, itemString) => {
        const SEPARATOR = '-';
        const [barcode, number = 1] = itemString.split(SEPARATOR);
        itemList[barcode] = itemList.hasOwnProperty(barcode) ? (itemList[barcode] + Number(number)) : Number(number);
        return itemList;
    }, {});
}

function correctTheMoney(promotion, item) {
    if (promotion.type === BUY_TWO_GET_ONE_FREE) {
        const discount = promotion.discount.find(discount => discount.barcode === item.barcode);
        if (discount) {
            item.total -= discount.moneySaved;
        }
        return item;
    }
}

function buildOrder(itemSheet, promotion) {
    return {
        itemSheetWithPromotion: itemSheet.map(item => {
            return correctTheMoney(promotion, item);
        }),
        promotion: promotion
    }

}

function getPromotionString(order) {
    if (order.promotion.type === BUY_TWO_GET_ONE_FREE) {
        return order.promotion.discount.map(discount => `名称：${discount.name}，数量：${discount.count}${discount.unit}`).join('\n');
    }
}

function printOrder(order) {
    const itemString = order.itemSheetWithPromotion.map(item => `名称：${item.name}，数量：${item.count}${item.unit}，单价：${item.price.toFixed(2)}(元)，小计：${item.total.toFixed(2)}(元)`).join('\n');
    const totalMoney = order.itemSheetWithPromotion.reduce((sum, item) => sum + item.total, 0);
    const totalMoneyString = `总计：${totalMoney.toFixed(2)}(元)`;
    let promotionString = '';
    let totalSavedString = '';
    if (order.promotion.totalSaved) {
        promotionString = order.promotion.totalSaved ? '挥泪赠送商品：\n' + getPromotionString(order) + '\n----------------------\n' : '';
        totalSavedString = order.promotion.totalSaved ? `\n节省：${order.promotion.totalSaved.toFixed(2)}(元)` : '';
    }
    return `***<没钱赚商店>购物清单***
${itemString}
----------------------\n` + promotionString + totalMoneyString + totalSavedString + "\n**********************";

}

function buildItemSheet(itemList, allItems) {
    return Object.keys(itemList).map(barcode => {
        const itemInfo = allItems.find(i => i.barcode === barcode);
        const count = itemList[barcode];
        return {...itemInfo, count, total: itemInfo.price * count};
    });

}

function getBestPromotion(allPromotions, itemSheet) {
    return allPromotions.map(promotion => {
        switch (promotion.type) {
            case BUY_TWO_GET_ONE_FREE: {
                return itemSheet.reduce((prev, item) => {
                    if (promotion.barcodes.includes(item.barcode)) {
                        const count = Math.floor(item.count / 3);
                        if (count > 0) {
                            prev.discount.push({
                                barcode: item.barcode,
                                name: item.name,
                                count,
                                moneySaved: count * item.price,
                                unit: item.unit,
                            });
                            prev.totalSaved += count * item.price;
                        }
                    }
                    return prev;
                }, {type: promotion.type, discount: [], totalSaved: 0});
            }
        }
    }).reduce((bestPromotion, promotion) => bestPromotion.totalSaved < promotion.totalSaved ? promotion : bestPromotion, {
        type: null,
        discount: [],
        totalSaved: 0
    });
}

module.exports = function printInventory(inputs) {
    const itemList = buildItemList(inputs);
    const itemSheet = buildItemSheet(itemList, loadAllItems());
    const promotion = getBestPromotion(loadPromotions(), itemSheet);
    const order = buildOrder(itemSheet, promotion);
    console.log(printOrder(order));
};
